const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const loaderSource = () => fs.readFileSync(require.resolve('../game/asset_loader.js'), 'utf8');

function createHarness() {
  const requests = [];
  const idleJobs = [];
  class FakeImage {
    set src(value) { this._src = value; requests.push(this); }
    get src() { return this._src; }
  }
  const window = {};
  const context = {
    window,
    Image: FakeImage,
    setTimeout: fn => { idleJobs.push(fn); return idleJobs.length; },
    requestIdleCallback: fn => { idleJobs.push(fn); return idleJobs.length; }
  };
  vm.createContext(context);
  vm.runInContext(loaderSource(), context);
  return {window, requests, idleJobs};
}

test('asset loader requests only startup art before the deferred idle phase', () => {
  const {window, requests, idleJobs} = createHarness();
  const loader = window.GameAssetLoader.create({
    files:{hero:'hero.png',walk:'walk.png',boss:'boss.png',ending:'ending.png'},
    startupKeys:['hero','walk'],
    concurrency:2,
    deferredConcurrency:1,
    deferredDelay:2500
  });

  assert.deepEqual(requests.map(image => image.src), ['hero.png','walk.png']);
  assert.equal(loader.getStatus().startupTotal, 2);
  assert.equal(loader.getStatus().ready, false);

  requests[0].onload();
  requests[1].onload();
  assert.equal(loader.getStatus().ready, true, 'the game may start when startup art is decoded');
  assert.equal(requests.length, 2, 'later chapters must not compete with the first screen');

  idleJobs.shift()();
  assert.deepEqual(requests.map(image => image.src), ['hero.png','walk.png','boss.png']);
});

test('asset loader keeps startup image decoding within the concurrency budget', () => {
  const {window, requests} = createHarness();
  window.GameAssetLoader.create({
    files:{a:'a.png',b:'b.png',c:'c.png',d:'d.png',e:'e.png'},
    startupKeys:['a','b','c','d','e'],
    concurrency:3
  });

  assert.equal(requests.length, 3);
  requests[0].onload();
  assert.equal(requests.length, 4, 'one completion should release only one request slot');
});

test('the game and production registries both use staged startup loading', () => {
  const html = fs.readFileSync(require.resolve('../game/index.html'), 'utf8');
  const game = fs.readFileSync(require.resolve('../game/game.js'), 'utf8');
  const production = fs.readFileSync(require.resolve('../game/production_assets.js'), 'utf8');
  assert.match(html, /asset_loader\.js[^<]*<\/script>[\s\S]*production_assets\.js/);
  assert.match(game, /STARTUP_ASSET_KEYS/);
  assert.match(game, /GameAssetLoader\.create/);
  assert.match(production, /startupKeys/);
  assert.match(production, /getStartupStatus/);
});

test('startup gate stays small and still includes the complete walking silhouette', () => {
  const source = fs.readFileSync(require.resolve('../game/game.js'), 'utf8');
  const start = source.indexOf('const artFiles =');
  const end = source.indexOf('const artLoader=', start);
  const context = {};
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '\nresult={keys:STARTUP_ASSET_KEYS,files:artFiles};', context);
  assert.ok(context.result.keys.length < 100, `startup requested ${context.result.keys.length} game images`);
  for(let frame=1;frame<=6;frame++)assert.ok(context.result.keys.includes(`ayanWalk${frame}`));
  assert.ok(context.result.keys.includes('ayanIdle'));
});

test('production startup gate contains the opening shop instead of later rain chapters', () => {
  let options;
  const context = {window:{GameAssetLoader:{create(value){options=value;return{images:{},ready:()=>false,getStatus:()=>({})};}}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../game/production_assets.js'),'utf8'),context);
  assert.ok(options.startupKeys.length < 20, `startup requested ${options.startupKeys.length} production images`);
  assert.ok(options.startupKeys.includes('shopWall'));
  assert.ok(options.startupKeys.includes('shopGroundA'));
  assert.ok(options.startupKeys.every(key=>!key.startsWith('rain')));
});

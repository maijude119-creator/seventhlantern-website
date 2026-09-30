const test = require('node:test');
const assert = require('node:assert/strict');

const CombatFX = require('../game/combat_fx.js');

function system(overrides = {}) {
  return CombatFX.createSystem({
    random: () => 0.5,
    maxWorld: 72,
    maxScreen: 16,
    maxHazards: 12,
    ...overrides,
  });
}

test('heavier combat events create a stronger bounded visual response', () => {
  const light = system();
  light.emit('player-hit-light', { x: 100, y: 200, direction: 1, color: '#fff' });

  const heavy = system();
  heavy.emit('player-hit-heavy', { x: 100, y: 200, direction: 1, color: '#fff' });

  const defeated = system();
  defeated.emit('enemy-defeated', { x: 100, y: 200, direction: 1, color: '#fff' });

  const a = light.getDiagnostics();
  const b = heavy.getDiagnostics();
  const c = defeated.getDiagnostics();
  assert.ok(b.worldEffects > a.worldEffects, 'heavy hit should create more world effects than a light hit');
  assert.ok(c.worldEffects > b.worldEffects, 'enemy defeat should create the largest burst');
  assert.ok(b.screenEffects >= a.screenEffects, 'heavy hit should not have weaker screen feedback');
});

test('decorative world effects never exceed the configured hard limit', () => {
  const fx = system({ maxWorld: 5 });
  for (let i = 0; i < 12; i += 1) {
    fx.emit('player-hit-heavy', { x: i * 10, y: 200, direction: 1, color: '#fff' });
  }
  assert.equal(fx.getDiagnostics().worldEffects, 5);
});

test('hazards survive decorative particle pressure', () => {
  const fx = system({ maxWorld: 3, maxHazards: 2 });
  fx.emit('boss-telegraph', {
    x: 400,
    y: 560,
    direction: -1,
    kind: 'ground',
    duration: 0.7,
    phase: 2,
  });
  for (let i = 0; i < 10; i += 1) {
    fx.emit('enemy-defeated', { x: i * 20, y: 300, direction: 1, color: '#fff' });
  }

  const diagnostics = fx.getDiagnostics();
  assert.equal(diagnostics.hazards, 1);
  assert.equal(diagnostics.worldEffects, 3);
});

test('reset clears every transient combat effect', () => {
  const fx = system();
  fx.emit('player-hit-heavy', { x: 100, y: 200, direction: 1, color: '#fff' });
  fx.emit('boss-telegraph', { x: 400, y: 560, direction: 1, kind: 'dash', duration: 0.5, phase: 3 });
  fx.reset();

  assert.deepEqual(fx.getDiagnostics(), {
    worldEffects: 0,
    screenEffects: 0,
    hazards: 0,
    cinematic: null,
    phase: null,
    reducedMotion: false,
  });
});

test('expired effects are removed by update', () => {
  const fx = system();
  fx.emit('player-hit-light', { x: 100, y: 200, direction: 1, color: '#fff' });
  fx.update(5);
  assert.equal(fx.getDiagnostics().worldEffects, 0);
  assert.equal(fx.getDiagnostics().screenEffects, 0);
});

test('reduced motion and disabled flash lower screen intensity without disabling hazards', () => {
  const normal = system();
  normal.emit('player-hit-heavy', { x: 100, y: 200, direction: 1, color: '#fff' });

  const reduced = system({ reducedMotion: true, flash: false });
  reduced.emit('player-hit-heavy', { x: 100, y: 200, direction: 1, color: '#fff' });
  reduced.emit('boss-telegraph', { x: 400, y: 560, direction: 1, kind: 'dash', duration: 0.5, phase: 3 });

  assert.ok(reduced.getDiagnostics().worldEffects < normal.getDiagnostics().worldEffects);
  assert.equal(reduced.getDiagnostics().screenEffects, 0);
  assert.equal(reduced.getDiagnostics().hazards, 1);
  assert.equal(reduced.getDiagnostics().reducedMotion, true);
});

test('boss telegraph preserves attack kind, direction, phase, and duration', () => {
  const fx = system();
  fx.emit('boss-telegraph', {
    x: 6400,
    y: 590,
    direction: -1,
    kind: 'ground',
    duration: 0.7,
    phase: 3,
  });
  const start = fx.getDiagnostics();
  assert.equal(start.hazards, 1);
  assert.equal(start.hazardKind, 'ground');
  assert.equal(start.hazardDirection, -1);
  assert.equal(start.phase, 3);
  fx.update(0.71);
  assert.equal(fx.getDiagnostics().hazards, 0);
});

test('boss phase transition clears decorative effects and ends after its duration', () => {
  const fx = system();
  fx.emit('enemy-defeated', { x: 100, y: 200, direction: 1 });
  assert.ok(fx.getDiagnostics().worldEffects > 0);

  fx.emit('boss-phase-transition', { x: 6500, y: 430, phase: 2, duration: 0.7 });
  assert.equal(fx.getDiagnostics().worldEffects, 0);
  assert.equal(fx.getDiagnostics().cinematic, 'phase-transition');
  assert.equal(fx.getDiagnostics().phase, 2);
  fx.update(0.71);
  assert.equal(fx.getDiagnostics().cinematic, null);
});

test('boss defeat cinematic advances from burst to collapse to settle', () => {
  const fx = system();
  fx.emit('boss-defeated', { x: 6500, y: 430, phase: 3, duration: 0.92 });
  assert.equal(fx.getDiagnostics().cinematic, 'burst');
  fx.update(0.3);
  assert.equal(fx.getDiagnostics().cinematic, 'collapse');
  fx.update(0.34);
  assert.equal(fx.getDiagnostics().cinematic, 'settle');
  fx.update(0.4);
  assert.equal(fx.getDiagnostics().cinematic, null);
});

test('reduced motion keeps boss hazards but skips strong cinematic flashes', () => {
  const fx = system({ reducedMotion: true });
  fx.emit('boss-telegraph', { x: 6400, y: 590, direction: 1, kind: 'dash', duration: 0.5, phase: 3 });
  fx.emit('boss-phase-transition', { x: 6500, y: 430, phase: 3, duration: 0.7 });
  const diagnostics = fx.getDiagnostics();
  assert.equal(diagnostics.hazards, 0);
  assert.equal(diagnostics.screenEffects, 0);
  assert.equal(diagnostics.cinematic, 'phase-transition');
});
test('reduced motion removes hit and death screen flashes, including a live preference change',()=>{
 const fx=system();fx.emit('enemy-defeated');fx.setPreferences({reducedMotion:true});
 assert.equal(fx.getDiagnostics().screenEffects,0);
 fx.emit('player-hit-heavy');fx.emit('enemy-defeated');
 assert.equal(fx.getDiagnostics().screenEffects,0);
});
test('phase change cancels obsolete warnings',()=>{
 const fx=system();fx.emit('boss-telegraph',{kind:'ground'});fx.emit('boss-phase-transition',{phase:2});
 assert.equal(fx.getDiagnostics().hazards,0);
});
test('live telegraph updates replace previous geometry and preserve both directions',()=>{
 const fx=system();
 const strokes=[];let from;
 const ctx=new Proxy({moveTo:(x,y)=>{from=[x,y]},lineTo:(x,y)=>strokes.push([from,[x,y]])},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(let i=0;i<3;i++)fx.emit('boss-telegraph',{attackId:'doubleWave',segments:[{x:400,y:590,x2:0,y2:590,r:17},{x:400,y:590,x2:800,y2:590,r:17}]});
 assert.equal(fx.getDiagnostics().hazards,1);
 fx.drawWorld(ctx,0);
 assert.ok(strokes.some(s=>s[1][0]<400));assert.ok(strokes.some(s=>s[1][0]>400));
});

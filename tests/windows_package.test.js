const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const script = path.join(repo, 'scripts', 'package-windows.sh');

test('Windows packager rejects a build without image and audio assets', () => {
  assert.equal(fs.existsSync(script), true, 'packaging script should exist');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seventh-lantern-package-test-'));
  const source = path.join(temp, 'game');
  const output = path.join(temp, 'dist');
  fs.mkdirSync(source, { recursive: true });
  for (const file of ['index.html', '00_START_GAME.bat', 'combat_fx.js', 'game.js', 'audio_manager.js', 'production_assets.js', 'style.css']) {
    fs.writeFileSync(path.join(source, file), 'fixture');
  }
  const result = spawnSync('bash', [script], {
    cwd: repo,
    env: { ...process.env, PACKAGE_GAME_DIR: source, PACKAGE_OUTPUT_DIR: output },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /missing image assets/i);
  assert.match(`${result.stdout}\n${result.stderr}`, /missing audio assets/i);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('Windows packager declares release identity and excludes development debris', () => {
  assert.equal(fs.existsSync(script), true, 'packaging script should exist');
  const source = fs.readFileSync(script, 'utf8');
  assert.match(source, /SeventhLantern_v1\.1\.0_Windows\.zip/);
  assert.match(source, /combat_fx\.js/);
  assert.match(source, /\.DS_Store/);
  assert.match(source, /tests/);
  assert.match(source, /\*\.log/);
});
test('Windows packager rejects missing motion and character scale runtimes',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seventh-package-required-'));
 try{
  const source=path.join(temp,'game');fs.mkdirSync(path.join(source,'assets'),{recursive:true});
  for(const file of ['index.html','00_START_GAME.bat','combat_fx.js','game.js','audio_manager.js','production_assets.js','style.css'])fs.writeFileSync(path.join(source,file),'fixture');
  fs.writeFileSync(path.join(source,'assets/image.png'),'fixture');fs.writeFileSync(path.join(source,'assets/audio.wav'),'fixture');
  const result=spawnSync('bash',[script],{env:{...process.env,PACKAGE_GAME_DIR:source,PACKAGE_OUTPUT_DIR:path.join(temp,'dist')},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/missing required file: motion.js/);assert.match(result.stderr,/missing required file: character_scale.js/);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});

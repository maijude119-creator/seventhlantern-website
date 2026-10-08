const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');

test('combat effects render after decorative particles and before the HUD', () => {
  const source = read('game/game.js');
  const renderStart = source.indexOf('function render(){');
  const renderEnd = source.indexOf('\nfunction loop(', renderStart);
  const render = source.slice(renderStart, renderEnd);
  const particles = render.indexOf('drawParticlesV2()');
  const combatWorld = render.indexOf('drawCombatFxWorld()');
  const hud = render.indexOf('drawUIV2()');
  assert.ok(particles >= 0 && combatWorld >= 0 && hud >= 0, 'render stages must all exist');
  assert.ok(particles < combatWorld, 'combat readability layer should follow decorative particles');
  assert.ok(combatWorld < hud, 'combat readability layer should remain below the HUD');
});

test('motion, shake, and flash preferences independently reach CombatFX', () => {
  const source = read('game/game.js');
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(source, /function syncCombatFxPreferences\(\)/);
  assert.match(source, /combatFx\?\.setPreferences\(\{\s*reducedMotion:!!reducedMotionQuery\?\.matches,\s*screenShake:gameSettings\.screenShake,\s*flash:gameSettings\.flash\s*\}\)/s);
  assert.match(source, /reducedMotionQuery\?\.addEventListener\?\.\("change",syncCombatFxPreferences\)/);
  assert.match(source, /function persistSettings\(\)[\s\S]*?syncCombatFxPreferences\(\)/);
});

test('preference synchronization is isolated from gameplay errors', () => {
  const source = read('game/game.js');
  assert.match(source, /function syncCombatFxPreferences\(\)\{\s*try\{/);
  assert.match(source, /catch\(error\)\{window\.__GAME_ERRORS__\.push\(`CombatFX:setPreferences:/);
});

test('effect budgets remain explicit and reduced-motion CSS removes menu animation', () => {
  const source = read('game/game.js');
  const css = read('game/style.css');
  assert.match(source, /maxWorld:72,\s*maxScreen:16,\s*maxHazards:12/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms!important/);
});

test('web build version and game script cache keys are v5.4.0', () => {
  const html = read('game/index.html');
  const gameSource = read('game/game.js');
  assert.match(html, /WEB BUILD v5\.4\.0/);
  const scripts = [...html.matchAll(/<script src="([^"]+\.js\?v=5\.4\.0)"><\/script>/g)];
  assert.equal(scripts.length, 6, 'every local game runtime script should use the v5.4.0 cache key');
  assert.match(gameSource, /animationRevision:'v5\.4\.0'/);
  assert.match(html, /id="continueEchoBtn"[^>]*>继续回响旅程<\/button>/);
});

test('site surfaces announce Web v5.4.0 and the actually published Windows version', () => {
  const config = read('site-config.js');
  const home = read('index.html');
  const play = read('play.html');
  const playScript = read('assets/site-play-v2.5.js');
  const download = read('download.html');
  const changelog = read('changelog.html');
  const readme = read('README.md');
  const offlineReadme = read('READ_ME.txt');

  assert.match(config, /windowsVersion:\s*"v1\.1\.0"/);
  assert.match(config, /webGameVersion:\s*"v5\.4\.0"/);
  assert.match(home, /data-web-version>v5\.4\.0/);
  assert.match(play, /Web v5\.4\.0/);
  assert.match(play, /site-play-v2\.5\.js\?v=2\.5\.1/);
  assert.match(playScript, /SEVENTH_LANTERN_CONFIG\?\.webGameVersion\|\|'v5\.4\.0'/);
  assert.doesNotMatch(playScript, /v5\.2\.0/);
  assert.match(play, /data-win-version>v1\.1\.0/);
  assert.match(download, /data-web-version>v5\.4\.0/);
  assert.match(download, /data-win-version>v1\.1\.0/);
  assert.match(changelog, /2026\.10\.08/);
  assert.match(changelog, /GAME v5\.4\.0/);
  assert.match(changelog, /GAME v5\.3\.2/);
  assert.match(changelog, /GAME v5\.3\.1/);
  assert.match(changelog, /GAME v5\.3\.0 · Windows v1\.1\.0/);
  assert.match(changelog, /Windows v1\.1\.0/);
  assert.match(readme, /Web 游戏版本：v5\.4\.0/);
  assert.match(readme, /Windows 已发布版本：v1\.1\.0/);
  assert.match(offlineReadme, /Windows v1\.1\.0/);
});

test('Windows download links point to the published v1.1.0 archive', () => {
  const config = read('site-config.js');
  const download = read('download.html');
  assert.match(config, /releases\/download\/v1\.1\.0\/SeventhLantern_v1\.1\.0_Windows\.zip/);
  assert.match(download, /releases\/download\/v1\.1\.0\/SeventhLantern_v1\.1\.0_Windows\.zip/);
});

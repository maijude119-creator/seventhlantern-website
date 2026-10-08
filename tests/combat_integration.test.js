const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');

test('game page loads the combat effects runtime before the game bootstrap', () => {
  const html = read('game/index.html');
  const effects = html.indexOf('<script src="combat_fx.js?v=5.4.0"></script>');
  const game = html.indexOf('<script src="game.js?v=5.4.0"></script>');
  assert.ok(effects >= 0, 'combat_fx.js script tag should exist');
  assert.ok(game >= 0, 'game.js script tag should exist');
  assert.ok(effects < game, 'combat effects must load before game.js creates the system');
});

test('player hits and enemy defeat feed the isolated effects boundary', () => {
  const source = read('game/game.js');
  assert.match(source, /function emitCombatFx\(type,payload=\{\}\)/);
  assert.match(source, /emitCombatFx\(a\.charged\?"player-hit-heavy":"player-hit-light"/);
  assert.match(source, /emitCombatFx\("enemy-defeated"/);
  assert.match(source, /function updateCombatFx\(dt\)/);
  assert.match(source, /function drawCombatFxWorld\(\)/);
  assert.match(source, /function drawCombatFxScreen\(\)/);
});

test('diagnostics expose counts through a frozen snapshot instead of mutable arrays', () => {
  const CombatFX = require('../game/combat_fx.js');
  const fx = CombatFX.createSystem({ random: () => 0.5 });
  fx.emit('player-hit-heavy', { x: 30, y: 40, direction: 1 });
  const snapshot = fx.getDiagnostics();
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Array.isArray(snapshot.worldEffects), false);

  const source = read('game/game.js');
  assert.match(source, /combatFx:combatFx\?\.getDiagnostics\?\.\(\)\|\|null/);
});

test('effects errors are isolated from combat logic and recorded for diagnostics', () => {
  const source = read('game/game.js');
  assert.match(source, /window\.__GAME_ERRORS__\|\|=\[\]/);
  assert.match(source, /catch\(error\)\{window\.__GAME_ERRORS__\.push\(`CombatFX:/);
});

test('boss lifecycle emits telegraph, phase, and defeat events without changing attack pools', () => {
  const source = read('game/game.js');
  assert.match(source, /emitCombatFx\("boss-telegraph"/);
  assert.match(source, /emitCombatFx\("boss-phase-transition"/);
  assert.match(source, /emitCombatFx\("boss-defeated"/);
  assert.match(source, /phaseTransitionTotal:\.70/);
  assert.match(source, /world\.projectiles\.length=0;world\.fields\.length=0;/);
  assert.match(source, /1:\["triple","wideTriple"\]/);
  assert.match(source, /4:\["echoRing","echoChase","echoCross"\]/);
});

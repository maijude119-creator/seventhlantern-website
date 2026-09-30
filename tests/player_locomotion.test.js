const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const runtime = require('./helpers/game-runtime');

const motionSource = fs.readFileSync(require.resolve('../game/motion.js'), 'utf8');

function gaitBlendAt(phase) {
  const g = runtime();
  g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];player.grounded=true;player.vx=0');
  g.run(motionSource);
  return g.run(`window.Motion.getPlayerGaitFrameBlend(${phase},6)`);
}

test('locomotion frame blending stays continuous at a pose boundary', () => {
  const before = gaitBlendAt(1.999);
  const after = gaitBlendAt(2);
  const beforePosition = before.index + before.blend;
  const afterPosition = after.index + after.blend;
  assert.ok(Math.abs(beforePosition - afterPosition) < 0.002, 'the rendered pose should not jump when a new frame begins');
});

test('locomotion frame blend wraps smoothly from the last pose to the first', () => {
  const before = gaitBlendAt(5.999);
  const after = gaitBlendAt(6);
  const beforePosition = before.index + before.blend;
  const afterPosition = after.index + after.blend;
  const directDistance = Math.abs((beforePosition % 6) - afterPosition);
  assert.ok(Math.min(directDistance, 6 - directDistance) < 0.002, 'the stride loop should wrap without a visible snap');
});

test('player renderer uses fractional progress to blend adjacent gait poses', () => {
  const gameSource = fs.readFileSync(require.resolve('../game/game.js'), 'utf8');
  const start = gameSource.indexOf('function drawPlayerV2(){');
  const end = gameSource.indexOf('\nfunction drawRitualBladeAttackV2', start);
  const renderer = gameSource.slice(start, end);
  assert.match(renderer, /getPlayerGaitFrameBlend\?\.\(locomotionPhase,locomotionCount\)/);
  assert.match(renderer, /locomotionFrames\[frameBlend\.nextIndex\]/);
});

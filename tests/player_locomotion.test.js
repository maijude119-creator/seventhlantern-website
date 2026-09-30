const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const runtime = require('./helpers/game-runtime');

const motionSource = fs.readFileSync(require.resolve('../game/motion.js'), 'utf8');

function strideCyclesAt(speed) {
  const g = runtime();
  g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];player.grounded=true;player.vx=0');
  g.run(motionSource);
  g.run('window.Motion.PlayerController.afterCollision(1/60,true,0)');
  for (let i = 0; i < 60; i++) {
    g.run(`player.vx=${speed};player.x+=${speed}/60;window.Motion.PlayerController.afterCollision(1/60,true,0)`);
  }
  return g.run('window.Motion.getPlayerMotionState().phase/3');
}

test('walk stride cadence matches the slow-walk footstep rhythm', () => {
  const cycles = strideCyclesAt(175);
  assert.ok(cycles >= 1.55 && cycles <= 1.65, `expected about 1.6 walk cycles/s, got ${cycles}`);
});

test('run stride cadence matches the run footstep rhythm', () => {
  const cycles = strideCyclesAt(220);
  assert.ok(cycles >= 2.2 && cycles <= 2.35, `expected about 2.27 run cycles/s, got ${cycles}`);
});

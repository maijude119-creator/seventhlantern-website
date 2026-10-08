const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const runtime = require('./helpers/game-runtime');

test('player renderer shows one clean gait pose without translucent full-body ghosting', () => {
  const gameSource = fs.readFileSync(require.resolve('../game/game.js'), 'utf8');
  const start = gameSource.indexOf('function drawPlayerV2(){');
  const end = gameSource.indexOf('\nfunction drawRitualBladeAttackV2', start);
  const renderer = gameSource.slice(start, end);
  assert.doesNotMatch(renderer, /frameBlend\.nextIndex/);
  assert.doesNotMatch(renderer, /1-frameBlend\.blend/);
  assert.match(renderer, /drawPlayerLocomotionSprite\(pose,0,0,174,player\.facing<0,1,1\)/);
});

test('ordinary full-speed movement keeps the grounded walk silhouette',()=>{
  const g=runtime({motion:true});
  g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];keys.d=true;for(let i=0;i<60;i++)update(1/60)');
  assert.equal(g.run('window.Motion.getPlayerMotionState().gait'),'walk');
});

test('full-speed travel keeps a readable human stride instead of cycling the feet too fast',()=>{
  const g=runtime({motion:true});
  g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];keys.d=true');
  const start=g.run('window.Motion.getPlayerMotionState().phase');
  g.run('for(let i=0;i<60;i++)update(1/60)');
  const end=g.run('window.Motion.getPlayerMotionState().phase');
  const cycles=(end-start)*2/6;
  assert.ok(cycles>=1.35&&cycles<=2.05,`expected 1.35–2.05 strides per second, got ${cycles}`);
});

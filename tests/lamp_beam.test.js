const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./helpers/game-runtime');

function gameWithFocusedLamp(setup=''){
 const g=runtime();
 g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];player.x=4200;player.y=538;player.grounded=true;world.lampAcquired=true;player.lampHeld=true;world.lamp.held=true;world.lamp.focused=true;world.lamp.facing=1;world.lamp.angle=0;'+setup);
 return g;
}

test('focused light cannot reveal a target through a blocking wall',()=>{
 const g=gameWithFocusedLamp('world.wallHp=90');
 assert.equal(g.run('lampHitsPoint(4340,511)'),true,'a target before the wall remains illuminated');
 assert.equal(g.run('lampHitsPoint(4500,511)'),false,'a target behind the wall is occluded');
 assert.equal(g.run('lampHitsPoint(4500,550)'),false,'angled light rays are occluded by the same wall');
});

test('focused light can reveal a target beyond the decorative core beam when unobstructed',()=>{
 const g=gameWithFocusedLamp('world.wallHp=0;world.gateOpen=true;world.doorOpen=true');
 const geometry=g.run('lampBeamGeometry()');
 assert.equal(geometry.range,330);
 assert.equal(geometry.halfAngle,.56);
 assert.equal(g.run('lampHitsPoint(4550,511)'),true);
});

test('focused light hit angle matches the outer visible targeting boundary',()=>{
 const g=gameWithFocusedLamp('world.wallHp=0;world.gateOpen=true;world.doorOpen=true');
 assert.equal(g.run('lampHitsPoint(4260+250*Math.cos(.5),511+250*Math.sin(.5))'),true);
 assert.equal(g.run('lampHitsPoint(4260+250*Math.cos(.7),511+250*Math.sin(.7))'),false);
});

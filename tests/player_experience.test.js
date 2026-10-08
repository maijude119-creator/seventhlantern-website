const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./helpers/game-runtime');
const playing=()=>{const g=runtime({motion:true});g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[]');return g;};

test('Escape pauses during dialogue and resumes with the same dialogue',()=>{
 const g=playing();g.run('queueDialogue("阿砚",["不要跳过这句"]);pressed.add("escape");update(1/60)');
 assert.equal(g.run('state'),'paused');
 g.nodes.get('resumeBtn').onclick();
 assert.equal(g.run('state'),'playing');assert.equal(g.run('currentDialogue.text'),'不要跳过这句');
});
test('holding interaction never skips multiple dialogue lines',()=>{
 const g=playing();g.run('queueDialogue("阿砚",["第一句","第二句","第三句"])');
 g.event('keydown',{key:'e',code:'KeyE',repeat:false});
 for(let i=0;i<5;i++)g.event('keydown',{key:'e',code:'KeyE',repeat:true});
 assert.equal(g.run('currentDialogue.text'),'第二句');
});
test('physical control keys work with an IME and ignore typing in settings',()=>{
 const g=playing();g.event('keydown',{key:'Process',code:'KeyD'});g.run('update(1/60)');
 assert.ok(g.run('player.vx')>0);
 g.event('keyup',{key:'Process',code:'KeyD'});assert.equal(g.run('keys.d'),false);
 g.event('keydown',{key:'a',code:'KeyA',target:{tagName:'INPUT'}});assert.ok(!g.run('keys.a'));
});
test('opening dialogue stops movement and damage in the same tick',()=>{
 const g=playing();g.run('player.interactTarget={kind:"lore",obj:{title:"纸条",text:["线索"]}};keys.d=true;pressed.add("e");world.projectiles=[{x:player.x+20,y:player.y+20,vx:0,vy:0,r:25,damage:20,owner:"enemy",life:2}];update(1/60)');
 assert.equal(g.run('player.health'),100);assert.equal(g.run('player.x'),220);
});
test('switching away pauses even if only visibilitychange arrives',()=>{
 const g=playing();g.window.document.hidden=true;g.documentEvent('visibilitychange');
 assert.equal(g.run('state'),'paused');
});
test('repeated dodge input cannot extend invulnerability indefinitely',()=>{
 const g=playing();g.run('pressed.add("l");update(1/60);for(let i=0;i<10;i++){pressed.add("l");update(1/60)}');
 assert.ok(g.run('player.dodging')<.10,'a new press must not restart an active dodge');
 g.run('for(let i=0;i<18;i++)update(1/60);player.invuln=0;damagePlayer(10)');
 assert.equal(g.run('player.health'),90);
});
test('pausing clears buffered jumps so resume does not move the player',()=>{
 const g=playing();g.run('player.grounded=false;player.y=450;pressed.add("k");window.Motion.beforeUpdate(1/60);clearTransientInputState();player.grounded=true;player.vy=0;window.Motion.PlayerController.update(1/60)');
 assert.ok(g.run('player.vy')>=0);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./helpers/game-runtime');

test('failed effects initialization still boots a playable game',()=>{
 const g=runtime({CombatFX:{createSystem(){throw Error('FX unavailable')}}});
 g.run('startGame("normal",false,true);currentDialogue=null;update(1/60)');
 assert.equal(g.window.__GAME__.getState().state,'playing');
 assert.ok(g.window.__GAME_ERRORS__.some(e=>e.includes('FX unavailable')));
});
test('a new game and respawn clear old boss warnings and cinematics',()=>{
 const g=runtime();
 for(const reset of ['startGame("normal",false,true)','respawn()']){
  g.run('emitCombatFx("boss-telegraph",{kind:"ground"});emitCombatFx("boss-phase-transition",{phase:3})');
  g.run(reset);
  const fx=g.window.__GAME__.getState().combatFx;
  assert.equal(fx.hazards,0);assert.equal(fx.cinematic,null);
 }
});
test('reduced motion disables camera kicks and skips impact freeze',()=>{
 const g=runtime({reducedMotion:true});
 g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];kickCamera(10,10);hitStop=.1;update(1/60)');
 assert.equal(g.run('cameraKickX'),0);
 assert.equal(g.run('hitStop'),0);
 assert.ok(g.run('runStats.playMs')>0);
});
test('boss phase transition clears live attacks and finishes before combat resumes',()=>{
 const g=runtime();
 g.run('startGame("normal",false,true);beginBoss();currentDialogue=null;dialogueQueue=[];world.projectiles.push({});world.fields.push({});world.boss.hp=world.boss.maxHp*.6;updateBoss(1/60)');
 assert.equal(g.run('world.projectiles.length+world.fields.length'),0);
 assert.equal(g.run('world.boss.phase'),1);
 assert.ok(g.run('world.boss.phaseTransition')>0);
 g.run('for(let i=0;i<45;i++)updateBoss(1/60)');
 assert.equal(g.run('world.boss.phase'),2);
 assert.equal(g.run('world.boss.pendingPhase'),null);
});
test('boss previews describe both ground waves, full ring, and fixed left fan',()=>{
 const g=runtime();g.run('beginBoss();player.x=7200');
 assert.equal(g.run('bossAttackPlan(world.boss,"doubleWave").projectiles.filter(p=>p.groundWave&&p.vx<0).length'),1);
 assert.equal(g.run('bossAttackPlan(world.boss,"doubleWave").projectiles.filter(p=>p.groundWave&&p.vx>0).length'),1);
 assert.equal(g.run('bossAttackPlan(world.boss,"echoRing").projectiles.length'),12);
 assert.equal(g.run('bossAttackPlan(world.boss,"fan").projectiles.every(p=>p.vx<0)'),true);
});
test('preview and released attacks share geometry without changing difficulty values',()=>{
 const g=runtime();g.run('beginBoss();currentDialogue=null;dialogueQueue=[]');
 for(const id of ['triple','wideTriple','fan','fanWave','doubleWave','dashVolley','rageFan','dashWave','echoRing','echoChase','echoCross']){
  const result=g.run(`(()=>{const b=world.boss;b.queuedAttackId=${JSON.stringify(id)};b.telegraphDir=-1;const plan=bossAttackPlan(b,b.queuedAttackId);world.projectiles=[];bossAttack(b);return JSON.stringify(plan.projectiles)===JSON.stringify(world.projectiles)})()`);
  assert.equal(result,true,id);
 }
});
test('missing effects runtime still allows combat, defeat progression, and saving',()=>{
 const g=runtime({CombatFX:null});
 g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];beginBoss();currentDialogue=null;dialogueQueue=[];defeatBoss();for(let i=0;i<60;i++)updateBoss(1/60)');
 assert.equal(g.run('world.bossDefeated'),true);
 assert.equal(g.run('world.bossActive'),false);
 assert.equal(g.run('world.lanternsRecovered'),1);
 g.run('saveGame();startGame("normal",true,true)');
 assert.equal(g.run('world.bossDefeated'),true);
 assert.equal(g.run('world.currentRegion'),'opera');
});
test('throwing effects methods do not stop the game loop or enemy defeat',()=>{
 const fail=()=>{throw Error('simulated effect failure')};
 const g=runtime({CombatFX:{createSystem:()=>({emit:fail,update:fail,drawWorld:fail,drawScreen:fail,reset:fail,setPreferences:fail})}});
 g.run('startGame("normal",false,true);currentDialogue=null;dialogueQueue=[];killEnemy(world.enemies[0]);for(let i=0;i<60;i++)update(1/60);render()');
 assert.equal(g.run('world.enemies[0].alive'),false);
 assert.equal(g.run('state'),'playing');
 assert.ok(g.run('runStats.playMs')>0);
});
test('boss death respawn reopens the encounter and allows another attempt',()=>{
 const g=runtime();g.run('startGame("normal",false,true);beginBoss();currentDialogue=null;dialogueQueue=[];respawn()');
 assert.equal(g.run('world.bossActive'),false);
 g.run('beginBoss()');assert.equal(g.run('world.bossActive'),true);
 assert.equal(g.run('world.boss.hp===world.boss.maxHp'),true);
});

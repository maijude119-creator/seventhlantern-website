const test=require('node:test');
const assert=require('node:assert/strict');
const runtime=require('./helpers/game-runtime');
const valid={savedAt:1,checkpointX:1240,checkpointY:538,currentRegion:'alleyA',noteFound:true,lampAcquired:true,visitedRegions:['paperShop','alleyA']};

test('continue rejects malformed latest progress and restores the complete backup',()=>{
 const g=runtime();
 g.storage.set('seventhLanternSaveBackup',JSON.stringify(valid));
 g.storage.set('seventhLanternSave',JSON.stringify({...valid,savedAt:2,noteFound:false,visitedRegions:{}}));
 g.run('startGame("normal",true,true)');
 assert.equal(g.run('state'),'playing');
 assert.equal(g.run('world.doorOpen'),true);
 assert.equal(g.run('player.x'),1240);
 assert.equal(g.run('currentDialogue'),null);
 assert.equal(JSON.parse(g.storage.get('seventhLanternSave')).savedAt,1);
});

test('invalid primary and backup cancel continue without leaving a partial run',()=>{
 const g=runtime();
 for(const key of ['seventhLanternSave','seventhLanternSaveBackup'])g.storage.set(key,JSON.stringify({...valid,difficulty:'unknown'}));
 g.run('startGame("normal",true,true)');
 assert.equal(g.run('state'),'menu');
 assert.equal(g.run('currentDialogue'),null);
 assert.equal(g.run('world.bossActive'),false);
});

test('nested invalid puzzle data falls back before it can corrupt chapter rules',()=>{
 const g=runtime();
 g.storage.set('seventhLanternSaveBackup',JSON.stringify(valid));
 for(const chapterProgress of [{city:{assignments:[99,null,null]}},{opera:{clues:{}}},{final:{candidate:99}},{bamboo:{solved:'false'}}]){
  g.storage.set('seventhLanternSave',JSON.stringify({...valid,savedAt:2,checkpointX:8000,currentRegion:'opera',chapterProgress}));
  g.run('startGame("normal",true,true)');
  assert.equal(g.run('player.x'),1240);
  assert.equal(g.run('world.currentRegion'),'alleyA');
 }
});

test('legacy saves with omitted optional fields still resume',()=>{
 const g=runtime();g.storage.set('seventhLanternSave',JSON.stringify({savedAt:1,x:270,y:538,noteFound:true}));
 g.run('startGame("normal",true,true)');
 assert.equal(g.run('state'),'playing');assert.equal(g.run('world.doorOpen'),true);
});

test('normal and echo journeys save and resume independently',()=>{
 const g=runtime();
 g.run('startGame("normal",false,true);world.noteFound=true;player.checkpointX=600;saveGame();startGame("echo",false,true);player.checkpointX=800;saveGame();startGame("normal",true,true)');
 assert.equal(g.run('difficulty'),'normal');assert.equal(g.run('player.x'),600);
 g.run('startGame("echo",true,true)');
 assert.equal(g.run('difficulty'),'echo');assert.equal(g.run('player.x'),800);
});

test('legacy echo saves remain available when a normal game is saved',()=>{
 const g=runtime();g.storage.set('seventhLanternSave',JSON.stringify({...valid,difficulty:'echo'}));
 g.run('startGame("normal",false,true);saveGame();startGame("echo",true,true)');
 assert.equal(g.run('difficulty'),'echo');assert.equal(g.run('player.x'),1240);
});

test('storage failures are reported to the player rather than claiming a successful save',()=>{
 const g=runtime();g.run('startGame("normal",false,true);localStorage.setItem=()=>{throw new Error("quota")};');
 assert.equal(g.run('saveGame()'),false);
 assert.match(g.run('toastEl.textContent'),/未能保存/);
});

test('finishing a journey clears only that mode save',()=>{
 const g=runtime();
 g.storage.set('seventhLanternSave',JSON.stringify(valid));
 g.storage.set('seventhLanternEchoSave',JSON.stringify({...valid,difficulty:'echo'}));
 g.run('startGame("echo",true,true);currentDialogue=null;dialogueQueue=[];world.finalChoice="keep";world.epilogueActive=true;world.endingTimer=.001;update(1/60)');
 assert.equal(g.storage.has('seventhLanternEchoSave'),false);
 assert.equal(g.storage.has('seventhLanternSave'),true);
});

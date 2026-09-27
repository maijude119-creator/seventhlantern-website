"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 1280;
const H = 720;
const RENDER_SCALE = 1.5;
function resizeGameViewport(){
  const ratio=Math.max(4/3,Math.min(21/9,(window.innerWidth||1280)/Math.max(1,window.innerHeight||720)));
  W=Math.round(H*ratio);
  canvas.width=Math.round(W*RENDER_SCALE);
  canvas.height=Math.round(H*RENDER_SCALE);
  ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
  ctx.imageSmoothingEnabled=false;
  cameraX=Math.max(0,Math.min(cameraX,Math.max(0,(world?.width||19800)-W)));
}
const menu = document.getElementById("menu");
const difficultyPanel = document.getElementById("difficulty");
const helpPanel = document.getElementById("help");
const pausePanel = document.getElementById("pause");
const dialogueEl = document.getElementById("dialogue");
const dialogueText = document.getElementById("dialogueText");
const speakerEl = document.getElementById("speaker");
const toastEl = document.getElementById("toast");
const continueBtn = document.getElementById("continueBtn");
const portraitCanvas = document.getElementById("portraitCanvas");
const portraitCtx = portraitCanvas?.getContext?.("2d") || null;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const keys = Object.create(null);
const pressed = new Set();
const released = new Set();
let state = "menu";
let lastTime = performance.now();
let gameTime = 0;
let cameraX = 0;
const cameraRuntime={anchorX:0,reverseDistance:0,lastMoveDir:0,lastPlayerX:0};
let shake = 0;
let toastTimer = 0;
let dialogueQueue = [];
let currentDialogue = null;
let jHoldStart = 0;
let lHoldStart = 0;
let lReleasedDuration = 0;
let guidance = {title:"", text:"", key:"", timer:0};
let hitStop = 0;
let impactFlash = 0;
let cameraKickX = 0, cameraKickY = 0;
let impactSpot = {x:0,y:0,life:0,max:.16,color:"#ffe2ad",power:0};
let routeHintIdle = 0;
let lanternWarningTimer = 0;
let lanternWarningLatched = false;
let fixedAccumulator = 0;
let renderAlpha = 1;
let renderPrevPlayerX = null, renderPrevPlayerY = null, renderPrevCameraX = null;
const FIXED_DT = 1 / 60;
const MAX_FIXED_STEPS = 5;
const MAX_PARTICLES = 160;
const MAX_PROJECTILES = 42;
const MAX_SPRITE_FX = 36;

function snapshotRenderState(){
  if(player){renderPrevPlayerX=player.x;renderPrevPlayerY=player.y;}
  renderPrevCameraX=cameraX;
}
function interpolatedRenderAxis(prev,current,alpha,maxJump){
  if(prev==null||!Number.isFinite(prev)||!Number.isFinite(current)||Math.abs(current-prev)>maxJump)return current;
  return lerp(prev,current,clamp(alpha,0,1));
}
function getInterpolatedRenderState(alpha=renderAlpha){
  return {
    playerX:interpolatedRenderAxis(renderPrevPlayerX,player.x,alpha,96),
    playerY:interpolatedRenderAxis(renderPrevPlayerY,player.y,alpha,96),
    cameraX:interpolatedRenderAxis(renderPrevCameraX,cameraX,alpha,Math.max(180,W*.35))
  };
}
function applyRenderInterpolation(){
  const original={playerX:player.x,playerY:player.y,cameraX};
  const smooth=getInterpolatedRenderState();
  player.x=smooth.playerX;player.y=smooth.playerY;cameraX=smooth.cameraX;
  return original;
}
function restoreSimulationState(original){
  if(!original)return;
  player.x=original.playerX;player.y=original.playerY;cameraX=original.cameraX;
}

// Production pixel-art assets. The old procedural renderer remains available as a
// graceful fallback while local images are loading or if a browser blocks a file.
const art = Object.create(null);
const artFiles = {
  hero:"assets/hero_atlas.png", enemies:"assets/enemy_atlas.png",
  boss:"assets/boss_atlas.png", weapons:"assets/weapon_atlas.png",
  shop:"assets/paper_shop.png", alleyA:"assets/rain_alley_a.png",
  alleyB:"assets/rain_alley_b.png", alleyC:"assets/rain_alley_c.png",
  arena:"assets/boss_arena.png",
  ayanIdle:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Idle.png",
  ayanWalk1:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_01.png",
  ayanWalk2:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_02.png",
  ayanWalk3:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_03.png",
  ayanWalk4:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_04.png",
  ayanWalk5:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_05.png",
  ayanWalk6:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Walk_06.png",
  ayanRun1:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_01.png",
  ayanRun2:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_02.png",
  ayanRun3:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_03.png",
  ayanRun4:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_04.png",
  ayanRun5:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_05.png",
  ayanRun6:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Run_06.png",
  ayanJump:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Jump.png",
  ayanLand:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Land.png",
  ayanRaise:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_RaiseLantern.png",
  ayanInspect:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Inspect.png",
  ayanAttackLight:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_AttackLight.png",
  ayanAttackHeavy:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_AttackHeavy.png",
  ayanDodge:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Dodge.png",
  ayanCrouch:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Crouch.png",
  ayanHurt:"assets/SeventhLantern/Characters/Ayan/CHR_Ayan_Hurt.png",
  portraitAyan:"assets/SeventhLantern/UI/UI_Ayan_Portrait.png",
  portraitShenPo:"assets/SeventhLantern/Characters/NPC/ShenPo/CHR_ShenPo_Portrait.png",
  portraitNameless:"assets/SeventhLantern/Characters/NPC/Nameless/CHR_Nameless_Portrait.png",
  portraitUmbrella:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Portrait.png",
  portraitOperaSinger:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Portrait.png",
  portraitLanternGirl:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Portrait.png",
  paperIdle:"assets/SeventhLantern/Enemies/Paper/ENM_PaperChild_Idle.png",
  paperAttack:"assets/SeventhLantern/Enemies/Paper/ENM_PaperChild_Attack.png",
  shadowIdle:"assets/SeventhLantern/Enemies/Shadow/ENM_ShadowLurker_Idle.png",
  shadowAttack:"assets/SeventhLantern/Enemies/Shadow/ENM_ShadowLurker_Attack.png",
  lanternEnemyIdle:"assets/SeventhLantern/Enemies/Lantern/ENM_LanternBearer_Idle.png",
  lanternEnemyAttack:"assets/SeventhLantern/Enemies/Lantern/ENM_LanternBearer_Attack.png",
  bossPhase1:"assets/SeventhLantern/Bosses/HundredMouthLantern/BOSS_HundredMouth_Phase01_Sealed.png",
  bossPhase2:"assets/SeventhLantern/Bosses/HundredMouthLantern/BOSS_HundredMouth_Phase02_Unfolded.png",
  bossPhase3:"assets/SeventhLantern/Bosses/HundredMouthLantern/BOSS_HundredMouth_Phase03_Hunting.png",
  guideLantern:"assets/SeventhLantern/Lanterns/LANTERN_Guide_First.png",
  seventhLantern:"assets/SeventhLantern/Lanterns/LANTERN_Seventh.png",
  ritualBlade:"assets/SeventhLantern/Weapons/WPN_RitualBlade.png",
  talismanBundle:"assets/SeventhLantern/Items/ITEM_TalismanBundle.png",
  lanternStake:"assets/SeventhLantern/Props/PROP_LanternStake.png",
  ropeHook:"assets/SeventhLantern/Props/PROP_RopeHook.png",
  itemKey:"assets/SeventhLantern/Items/ITEM_Key.png",
  itemTalisman:"assets/SeventhLantern/Items/ITEM_Talisman.png",
  itemMatches:"assets/SeventhLantern/Items/ITEM_Matches.png",
  itemOil:"assets/SeventhLantern/Items/ITEM_LampOil.png",
  itemBell:"assets/SeventhLantern/Items/ITEM_Bell.png",
  itemPaperDoll:"assets/SeventhLantern/Items/ITEM_PaperDoll.png",
  itemPhoto:"assets/SeventhLantern/Items/ITEM_OldPhoto.png",
  itemNote:"assets/SeventhLantern/Items/ITEM_Note.png",
  shopDoorClosed:"assets/SeventhLantern/Environment/PaperShop/ENV_PaperShop_DoorClosed.png",
  shopDoorOpen:"assets/SeventhLantern/Environment/PaperShop/ENV_PaperShop_DoorOpen.png",
  shopCounter:"assets/SeventhLantern/Environment/PaperShop/ENV_PaperShop_Counter.png",
  shopPaperProps:"assets/SeventhLantern/Environment/PaperShop/ENV_PaperShop_PaperProps.png",
  alleyDoor:"assets/SeventhLantern/Environment/RainAlley/ENV_RainAlley_Door.png",
  alleyWindow:"assets/SeventhLantern/Environment/RainAlley/ENV_RainAlley_WindowLit.png",
  alleyArch:"assets/SeventhLantern/Environment/RainAlley/ENV_RainAlley_Arch.png",
  vfxAttack:"assets/SeventhLantern/VFX/VFX_AttackArc.png",
  vfxImpact:"assets/SeventhLantern/VFX/VFX_ImpactSpark.png",
  vfxShadow:"assets/SeventhLantern/VFX/VFX_ShadowRipple.png",
  vfxPaper:"assets/SeventhLantern/VFX/VFX_PaperBurst.png",
  vfxSplash:"assets/SeventhLantern/VFX/VFX_RainSplash.png",
  vfxEmber:"assets/SeventhLantern/VFX/VFX_EmberParticles.png",
  uiLantern:"assets/SeventhLantern/UI/UI_Lantern_Steady.png"
};
// Register approved production animation frames generated for the full build.
function registerFrameSeries(prefix, dir, stem, count){
  for(let i=0;i<count;i++) artFiles[`${prefix}${i}`]=`${dir}/${stem}${String(i).padStart(2,"0")}.png`;
}
registerFrameSeries("prodAyanIdle_","assets/Production/Characters/Ayan","CHR_Ayan_IdleSeq_",4);
registerFrameSeries("prodAyanAttack1_","assets/Production/Characters/Ayan","CHR_Ayan_Attack1_",5);
registerFrameSeries("prodAyanAttack2_","assets/Production/Characters/Ayan","CHR_Ayan_Attack2_",6);
registerFrameSeries("prodAyanAttack3_","assets/Production/Characters/Ayan","CHR_Ayan_Attack3_",6);
registerFrameSeries("prodAyanHeavy_","assets/Production/Characters/Ayan","CHR_Ayan_Heavy_",4);
registerFrameSeries("prodAyanAir_","assets/Production/Characters/Ayan","CHR_Ayan_Air_",4);
registerFrameSeries("prodAyanJump_","assets/Production/Characters/Ayan","CHR_Ayan_JumpSeq_",6);
registerFrameSeries("prodAyanHurt_","assets/Production/Characters/Ayan","CHR_Ayan_HurtSeq_",3);
registerFrameSeries("prodAyanDeath_","assets/Production/Characters/Ayan","CHR_Ayan_Death_",7);
registerFrameSeries("prodAyanDodge_","assets/Production/Characters/Ayan","CHR_Ayan_DodgeSeq_",4);
registerFrameSeries("prodPaperIdle_","assets/Production/Enemies/Paper","ENM_Paper_Idle_",4);
registerFrameSeries("prodPaperWalk_","assets/Production/Enemies/Paper","ENM_Paper_Walk_",6);
registerFrameSeries("prodPaperRun_","assets/Production/Enemies/Paper","ENM_Paper_Run_",6);
registerFrameSeries("prodPaperAttack_","assets/Production/Enemies/Paper","ENM_Paper_Attack_",6);
registerFrameSeries("prodPaperHurt_","assets/Production/Enemies/Paper","ENM_Paper_Hurt_",2);
registerFrameSeries("prodPaperDeath_","assets/Production/Enemies/Paper","ENM_Paper_Death_",7);
registerFrameSeries("prodShadowIdle_","assets/Production/Enemies/Shadow","ENM_Shadow_Idle_",6);
registerFrameSeries("prodShadowMove_","assets/Production/Enemies/Shadow","ENM_Shadow_Move_",6);
registerFrameSeries("prodShadowAttack_","assets/Production/Enemies/Shadow","ENM_Shadow_Attack_",7);
registerFrameSeries("prodShadowHurt_","assets/Production/Enemies/Shadow","ENM_Shadow_Hurt_",3);
registerFrameSeries("prodShadowDeath_","assets/Production/Enemies/Shadow","ENM_Shadow_Death_",3);
registerFrameSeries("prodShadowDeathFull_","assets/Production/Enemies/Shadow","ENM_Shadow_DeathFull_",8);
registerFrameSeries("prodLanternIdle_","assets/Production/Enemies/Lantern","ENM_Lantern_Idle_",6);
registerFrameSeries("prodLanternMove_","assets/Production/Enemies/Lantern","ENM_Lantern_Move_",6);
registerFrameSeries("prodLanternAttack_","assets/Production/Enemies/Lantern","ENM_Lantern_Attack_",6);
registerFrameSeries("prodLanternHurt_","assets/Production/Enemies/Lantern","ENM_Lantern_Hurt_",4);
registerFrameSeries("prodLanternDeath_","assets/Production/Enemies/Lantern","ENM_Lantern_Death_",7);
registerFrameSeries("prodBossP2_","assets/Production/Boss/HundredMouth","BOSS_Phase2_Attack_",4);
registerFrameSeries("prodBossP3_","assets/Production/Boss/HundredMouth","BOSS_Phase3_Attack_",4);
registerFrameSeries("prodBossErupt_","assets/Production/Boss/HundredMouth","BOSS_Erupt_",4);
registerFrameSeries("prodBossDeath_","assets/Production/Boss/HundredMouth","BOSS_Death_",6);

// NPC motion sheets: slow idle variation plus a six-frame walk cycle.
for(const [key,folder,stem] of [
  ["Nameless","Nameless","Nameless"],["ShenPo","ShenPo","ShenPo"],
  ["Umbrella","UmbrellaGuest","Umbrella"],["Opera","OperaSinger","Opera"],["Girl","LanternGirl","Girl"]
]){
  registerFrameSeries(`prodNpc${key}Idle_`,`assets/Production/NPC/${folder}`,`NPC_${stem}_Idle_`,4);
  registerFrameSeries(`prodNpc${key}Walk_`,`assets/Production/NPC/${folder}`,`NPC_${stem}_Walk_`,6);
}

let artLoaded = 0;
if(typeof Image!=="undefined"){
  for(const [key,src] of Object.entries(artFiles)){
    const img=new Image(); art[key]=img;
    img.onload=()=>{artLoaded++;};
    img.onerror=()=>{(window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[])).push(`asset:${src}`);};
    img.src=src;
  }
}
const artReady = key => !!art[key]?.complete && art[key].naturalWidth>0;
const DEBUG_QUERY = typeof URLSearchParams!=="undefined" ? new URLSearchParams(window.location?.search||"") : {get:()=>null};
// QA modes are opt-in only. Normal builds render neither collision geometry nor asset diagnostics.
const DEBUG_COLLIDERS = DEBUG_QUERY.get("colliders")==="1";
const ASSET_QA_MODE = DEBUG_QUERY.get("assetqa")==="1";
const DEBUG_PLACEHOLDERS = DEBUG_QUERY.get("missing") === "1";
const REQUIRED_ASSET_KEYS = Object.keys(artFiles);
function productionAssetsReady(){
  const st=window.ProductionAssets?.getStatus?.();
  return !st || (st.failed===0 && st.loaded>=st.total);
}
function requiredAssetsReady(){ return REQUIRED_ASSET_KEYS.every(artReady) && productionAssetsReady(); }
function missingRequiredAssets(){
  const missing=REQUIRED_ASSET_KEYS.filter(k=>!artReady(k));
  const st=window.ProductionAssets?.getStatus?.();
  if(st?.missing?.length)missing.push(...st.missing.map(k=>`production:${k}`));
  return missing;
}
window.GameAssetStatus=()=>{const prod=window.ProductionAssets?.getStatus?.()||{loaded:0,total:0,failed:0,missing:[]};const artTotal=REQUIRED_ASSET_KEYS.length;const artReadyCount=REQUIRED_ASSET_KEYS.filter(artReady).length;const artFailed=REQUIRED_ASSET_KEYS.filter(k=>art[k]?.complete&&!(art[k]?.naturalWidth>0)).length;const total=artTotal+(prod.total||0);const loaded=artReadyCount+(prod.loaded||0);const failed=artFailed+(prod.failed||0);return{loaded,total,failed,ready:total>0&&loaded>=total&&failed===0,missing:missingRequiredAssets(),errors:[...(window.__GAME_ERRORS__||[])]};};

function ensureAssetsThenStart(diff="normal",fromSave=false){
  if(requiredAssetsReady()) return startGame(diff,fromSave,true);
  const started=performance.now();
  const poll=()=>{
    if(requiredAssetsReady()) return startGame(diff,fromSave,true);
    if(performance.now()-started>8000){
      const missing=missingRequiredAssets();
      (window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[])).push(`required-assets:${missing.join(',')}`);
      toastEl.textContent=`核心美术资源加载失败：${missing.length} 项`;
      toastEl.classList.add("visible");
      return;
    }
    setTimeout(poll,50);
  };
  poll();
}

// The generated sheets are kept as transparent, fixed-grid pixel-art atlases.
// These helpers crop each frame to its non-transparent bounds so the art can
// sit on top of the existing collision boxes without showing empty cell space.
const atlasBBoxes = {
  hero: [
    [[57,97,212,415],[24,112,316,400],[21,80,267,371],[54,97,283,415]],
    [[45,0,314,447],[23,0,361,447],[0,66,351,381],[52,0,284,447]]
  ],
  enemies: [
    [[87,61,275,301],[0,66,362,296],[0,78,320,284]],
    [[18,0,335,362],[10,0,352,362],[0,0,339,362]],
    [[47,0,294,362],[25,0,337,362],[0,0,337,362]],
    [[48,0,314,301],[0,0,362,301],[0,0,327,301]]
  ],
  boss: [
    [[78,18,323,324],[53,17,459,325],[0,17,486,325]],
    [[21,0,444,342],[10,0,502,342],[0,0,494,342]],
    [[24,0,421,296],[18,0,494,296],[0,0,488,296]]
  ],
  weapons: [
    [[73,83,249,398],[81,80,218,386],[73,127,311,331],[0,15,324,484]],
    [[65,55,254,406],[11,20,343,419],[40,127,344,319],[0,2,343,489]]
  ]
};

function drawAtlasFrame(sheet,row,col,cols,rows,cx,bottom,maxHeight,flip=false,alpha=1){
  if(!artReady(sheet)) return false;
  const img=art[sheet], cellW=img.naturalWidth/cols, cellH=img.naturalHeight/rows;
  const box=atlasBBoxes[sheet]?.[row]?.[col];
  const sx=box?Math.floor(col*cellW+box[0]):Math.floor(col*cellW);
  const sy=box?Math.floor(row*cellH+box[1]):Math.floor(row*cellH);
  const sw=box?box[2]:Math.floor(cellW), sh=box?box[3]:Math.floor(cellH);
  const scale=maxHeight/sh, dw=sw*scale, dh=sh*scale;
  ctx.save();ctx.globalAlpha*=alpha;
  if(flip){ctx.translate(cx+dw/2,0);ctx.scale(-1,1);ctx.drawImage(img,sx,sy,sw,sh,-dw/2,bottom-dh,dw,dh);}
  else ctx.drawImage(img,sx,sy,sw,sh,cx-dw/2,bottom-dh,dw,dh);
  ctx.restore();
  return true;
}

// Draws an extracted official asset with a bottom-centre pivot. Source pixels
// are never resampled on disk; this only changes their display size in-game.
function drawSpriteAsset(key,cx,bottom,maxHeight,flip=false,alpha=1){
  if(!artReady(key))return false;const img=art[key],scale=maxHeight/img.naturalHeight,dw=img.naturalWidth*scale,dh=maxHeight;
  ctx.save();ctx.globalAlpha*=alpha;
  if(flip){ctx.translate(cx,0);ctx.scale(-1,1);ctx.drawImage(img,-dw/2,bottom-dh,dw,dh);}
  else ctx.drawImage(img,cx-dw/2,bottom-dh,dw,dh);
  ctx.restore();return true;
}

// Per-frame source-pixel corrections measured from the stable upper-body mass.
// The authored PNG canvases are not identical widths, so raw image-centre pivots
// make Ayan jump sideways when frames change. Corrections mirror with facing.
const PLAYER_LOCOMOTION_X_CORRECTION={
  // Walk frames are normalized onto one shared canvas/pivot in the 6-frame pass.
  ayanWalk1:0,ayanWalk2:0,ayanWalk3:0,ayanWalk4:0,ayanWalk5:0,ayanWalk6:0,
  ayanRun1:0,ayanRun2:0,ayanRun3:0,ayanRun4:0,ayanRun5:0,ayanRun6:0
};
function drawPlayerLocomotionSprite(key,cx,bottom,maxHeight,flip=false,alpha=1){
  if(!artReady(key))return false;
  const img=art[key],sourceCorrection=PLAYER_LOCOMOTION_X_CORRECTION[key]||0;
  const displayCorrection=sourceCorrection*(maxHeight/img.naturalHeight)*(flip?-1:1);
  return drawSpriteAsset(key,cx+displayCorrection,bottom,maxHeight,flip,alpha);
}
function smoothLocomotionBlend(frac){
  // Keep the render-position interpolation, but avoid long full-body crossfades:
  // the authored walk frames differ too much in silhouette and otherwise read as a ghost double.
  const t=clamp((frac-.80)/.18,0,1);
  const eased=t*t*(3-2*t);
  return eased*.14;
}

function drawProductionSeries(prefix,count,index,cx,bottom,maxHeight,flip=false,alpha=1){
  if(count<=0)return false;
  const i=((Math.floor(index)%count)+count)%count;
  const key=`${prefix}${i}`;
  return drawSpriteAsset(key,cx,bottom,maxHeight,flip,alpha);
}

function productionRegionId(id){return ["opera","bamboo","ferry","city","final"].includes(id);}

function drawPortraitAsset(key){
  if(!portraitCtx||!artReady(key))return false;const img=art[key],w=portraitCanvas.width,h=portraitCanvas.height,s=Math.min((w-10)/img.naturalWidth,(h-10)/img.naturalHeight),dw=img.naturalWidth*s,dh=img.naturalHeight*s;
  portraitCtx.clearRect(0,0,w,h);const g=portraitCtx.createRadialGradient(w*.5,h*.45,8,w*.5,h*.5,h*.72);g.addColorStop(0,"#27383b");g.addColorStop(1,"#071013");portraitCtx.fillStyle=g;portraitCtx.fillRect(0,0,w,h);portraitCtx.drawImage(img,(w-dw)/2,h-dh-3,dw,dh);return true;
}

const SCENE_REGIONS = [
  {id:"paperShop",start:0,end:1120,key:"shop",tone:"#211c18",visualY:80,title:"纸扎铺"},
  {id:"alleyA",start:1120,end:2800,key:"alleyA",tone:"#0b151b",visualY:46,title:"雨巷·前街"},
  {id:"alleyB",start:2800,end:4450,key:"alleyB",tone:"#0b151b",visualY:46,title:"雨巷·深巷"},
  {id:"alleyC",start:4450,end:6000,key:"alleyC",tone:"#0b151b",visualY:46,title:"雨巷·封桥"},
  {id:"bossArena",start:6000,end:7300,key:"arena",tone:"#0b0a10",visualY:82,title:"百口灯场"},
  {id:"opera",start:7300,end:9800,key:"production",tone:"#171015",visualY:0,title:"无面戏楼"},
  {id:"bamboo",start:9800,end:12300,key:"production",tone:"#0c1713",visualY:0,title:"倒悬竹寺"},
  {id:"ferry",start:12300,end:14700,key:"production",tone:"#09171c",visualY:0,title:"逆流古渡"},
  {id:"city",start:14700,end:17400,key:"production",tone:"#0b1115",visualY:0,title:"幽都纸城"},
  {id:"final",start:17400,end:19800,key:"production",tone:"#120b0f",visualY:0,title:"第七灯域"}
]
function sceneRegionAt(worldX){ return SCENE_REGIONS.find(r=>worldX>=r.start&&worldX<r.end)||SCENE_REGIONS[SCENE_REGIONS.length-1]; }
function sceneAssetForZone(zone){ return sceneRegionAt(zone).key; }

const CHAPTER_GATE_X={opera:9748,bamboo:12248,ferry:14648,city:17348};
const SHORTCUT_VISUAL_ASSETS={
  opera_backstage:"operaStairA",
  bamboo_upper:"bambooPlatformA",
  ferry_cabin:"ferryDockB",
  city_return:"cityBridge"
};
const CHAPTER_SHORTCUTS={
  opera_backstage:{chapter:"opera",opens:p=>(p?.clues?.length||0)>=2,platforms:[
    {x:9140,y:548,w:110,h:18,kind:"shortcut-opera"},{x:9235,y:498,w:115,h:18,kind:"shortcut-opera"},{x:9335,y:452,w:170,h:18,kind:"shortcut-opera"}
  ]},
  bamboo_upper:{chapter:"bamboo",opens:p=>(p?.tuned?.length||0)>=2,platforms:[
    {x:11625,y:558,w:120,h:18,kind:"shortcut-bamboo"},{x:11520,y:520,w:130,h:18,kind:"shortcut-bamboo"},
    {x:11360,y:480,w:190,h:18,kind:"shortcut-bamboo"},{x:11195,y:480,w:180,h:18,kind:"shortcut-bamboo"},
    {x:11030,y:480,w:180,h:18,kind:"shortcut-bamboo"},{x:10865,y:480,w:180,h:18,kind:"shortcut-bamboo"},
    {x:10700,y:480,w:180,h:18,kind:"shortcut-bamboo"},{x:10635,y:535,w:110,h:18,kind:"shortcut-bamboo"}
  ]},
  ferry_cabin:{chapter:"ferry",opens:p=>!!p?.debrisCleared,platforms:[
    {x:13630,y:570,w:95,h:18,kind:"shortcut-ferry"},{x:13695,y:532,w:175,h:18,kind:"shortcut-ferry"},
    {x:13855,y:532,w:175,h:18,kind:"shortcut-ferry"},{x:14015,y:532,w:150,h:18,kind:"shortcut-ferry"},
    {x:14125,y:570,w:95,h:18,kind:"shortcut-ferry"}
  ]},
  city_return:{chapter:"city",opens:p=>Array.isArray(p?.assignments)&&p.assignments.length===3&&p.assignments.every(v=>v!==null),platforms:[
    {x:16390,y:555,w:110,h:18,kind:"shortcut-city"},{x:16460,y:518,w:205,h:18,kind:"shortcut-city"},
    {x:16650,y:518,w:205,h:18,kind:"shortcut-city"},{x:16840,y:518,w:205,h:18,kind:"shortcut-city"},
    {x:17030,y:518,w:190,h:18,kind:"shortcut-city"},{x:17180,y:555,w:100,h:18,kind:"shortcut-city"}
  ]}
};
function shortcutActive(id){
  const def=CHAPTER_SHORTCUTS[id];if(!def)return false;
  const p=world?.chapterProgress?.[def.chapter];
  try{return !!def.opens(p||{});}catch(_){return false;}
}
function ensureChapterShortcuts(){
  world.shortcutRuntime||(world.shortcutRuntime=Object.create(null));
  for(const [id,def] of Object.entries(CHAPTER_SHORTCUTS)){
    if(world.shortcutRuntime[id]||!shortcutActive(id))continue;
    world.shortcutRuntime[id]=true;
    for(let i=0;i<def.platforms.length;i++){
      const q=def.platforms[i],p=platform(q.x,q.y,q.w,q.h,q.kind);
      p.id=`shortcut:${id}:${i}`;p.shortcutId=id;p.shortcutIndex=i;
    }
    showToast(id==="opera_backstage"?"后台折梯落下，二层楼座有了近路":id==="bamboo_upper"?"竹架受钟声牵动，搭出一条回水面的上层路":id==="ferry_cabin"?"船骸内侧的夹板松开，露出一条短舱道":"墓灯之间的纸桥展开，回空坟不用再绕墓道",2.2);
  }
}

const CHAPTER_LANTERN_TOTAL={opera:2,bamboo:3,ferry:4,city:5,final:6};
const CHAPTER_INTERACTABLES=[
  {id:"umbrella_rain",chapter:"story",kind:"npc",x:2360,y:610,sprite:"npcUmbrellaIdle",npcType:"umbrella",name:"撑伞女子"},
  {id:"shenpo_opera",chapter:"opera",kind:"npc",x:7580,y:610,sprite:"npcShenPo",npcType:"shenpo",name:"沈婆"},
  {id:"opera_mask_a",chapter:"opera",kind:"clue",x:7900,y:545,name:"残缺戏单"},
  {id:"opera_false_bill",chapter:"opera",kind:"flavor",x:8180,y:548,name:"旧排练单"},
  {id:"opera_burned_ticket",chapter:"opera",kind:"flavor",x:8385,y:548,name:"焦边戏票"},
  {id:"opera_mask_b",chapter:"opera",kind:"clue",x:9580,y:420,name:"楼座无面具架"},
  {id:"opera_gong_0",chapter:"opera",kind:"gong",index:0,x:8500,y:610,name:"低锣"},
  {id:"opera_gong_1",chapter:"opera",kind:"gong",index:1,x:8790,y:610,name:"中锣"},
  {id:"opera_gong_2",chapter:"opera",kind:"gong",index:2,x:9080,y:610,name:"高锣"},
  {id:"opera_lift",chapter:"opera",kind:"lift",x:9300,y:548,name:"戏台升降机"},
  {id:"nameless_bamboo",chapter:"bamboo",kind:"npc",x:10070,y:610,sprite:"npcNameless",npcType:"nameless",name:"无名客"},
  {id:"bamboo_prayer",chapter:"bamboo",kind:"clue",x:10410,y:548,name:"倒写祈愿签"},
  {id:"bamboo_pool",chapter:"bamboo",kind:"clue",x:10730,y:560,name:"积水倒影"},
  {id:"bamboo_incense_book",chapter:"bamboo",kind:"flavor",x:10920,y:548,name:"残破香火簿"},
  {id:"bamboo_bell_0",chapter:"bamboo",kind:"bell",index:0,x:11100,y:520,name:"近钟"},
  {id:"bamboo_bell_1",chapter:"bamboo",kind:"bell",index:1,x:11410,y:500,name:"中钟"},
  {id:"bamboo_bell_2",chapter:"bamboo",kind:"bell",index:2,x:11720,y:475,name:"远钟"},
  {id:"nameless_ferry",chapter:"ferry",kind:"npc",x:12520,y:610,sprite:"npcNameless",npcType:"nameless",name:"摆渡人"},
  {id:"umbrella_ferry",chapter:"story",kind:"npc",x:13240,y:610,sprite:"npcUmbrellaIdle",npcType:"umbrella",name:"撑伞女子"},
  {id:"ferry_name_0",chapter:"ferry",kind:"nameSlip",index:0,x:12880,y:560,name:"陈旧名签",propMount:"woodGap",anchorDx:0,anchorDy:-2},
  {id:"ferry_reflection",chapter:"ferry",kind:"nameReflection",index:1,x:13430,y:575,name:"水面墨影"},
  {id:"ferry_name_1",chapter:"ferry",kind:"nameSlip",index:1,x:13430,y:548,name:"浸水名签",propMount:"wetPlank",anchorDx:0,anchorDy:0},
  {id:"ferry_debris",chapter:"ferry",kind:"debris",x:13950,y:575,name:"缠绳船骸"},
  {id:"ferry_name_2",chapter:"ferry",kind:"nameSlip",index:2,x:14010,y:558,name:"无字名签",propMount:"wreckEdge",anchorDx:0,anchorDy:-1},
  {id:"ferry_manifest",chapter:"ferry",kind:"flavor",x:14200,y:550,name:"渡船旧册"},
  {id:"ferry_child_ticket",chapter:"ferry",kind:"flavor",x:14435,y:550,name:"儿童船票"},
  {id:"ferry_winch",chapter:"ferry",kind:"winch",x:14360,y:610,name:"渡口绞盘"},
  {id:"shenpo_city",chapter:"city",kind:"npc",x:14980,y:610,sprite:"npcShenPo",npcType:"shenpo",name:"沈婆"},
  {id:"lantern_girl_city",chapter:"story",kind:"npc",x:16330,y:610,sprite:"npcLanternGirlIdle",npcType:"girl",name:"？？？"},
  {id:"city_grave_0",chapter:"city",kind:"epitaph",index:0,x:15360,y:560,name:"幼者墓碑"},
  {id:"city_grave_1",chapter:"city",kind:"epitaph",index:1,x:15770,y:560,name:"老者墓碑"},
  {id:"city_grave_2",chapter:"city",kind:"epitaph",index:2,x:16180,y:560,name:"归乡者墓碑"},
  {id:"city_false_grave",chapter:"city",kind:"emptyGrave",x:16340,y:560,name:"第七空坟"},
  {id:"city_paper_crane",chapter:"city",kind:"flavor",x:16255,y:548,name:"压扁的纸鹤"},
  {id:"city_memory_0",chapter:"city",kind:"memoryToken",index:0,x:16425,y:575,name:"幼者纸拓",propMount:"graveStone",anchorDx:0,anchorDy:-4},
  {id:"city_memory_1",chapter:"city",kind:"memoryToken",index:1,x:16505,y:575,name:"老者纸拓",propMount:"groundPaper",anchorDx:0,anchorDy:0},
  {id:"city_memory_2",chapter:"city",kind:"memoryToken",index:2,x:16585,y:575,name:"归乡纸拓",propMount:"stoneStep",anchorDx:0,anchorDy:-3},
  {id:"city_lantern_0",chapter:"city",kind:"graveLantern",index:0,x:16720,y:610,name:"西墓灯"},
  {id:"city_lantern_1",chapter:"city",kind:"graveLantern",index:1,x:16950,y:610,name:"中墓灯"},
  {id:"city_lantern_2",chapter:"city",kind:"graveLantern",index:2,x:17200,y:610,name:"东墓灯"},
  {id:"nameless_final",chapter:"final",kind:"npc",x:17610,y:610,sprite:"npcNameless",npcType:"nameless",name:"无名客"},
  {id:"final_mirror",chapter:"final",kind:"mirror",x:17920,y:610,name:"照魂镜"},
  {id:"final_echo_0",chapter:"final",kind:"echo",index:0,x:18100,y:610,name:"低回声"},
  {id:"final_echo_1",chapter:"final",kind:"echo",index:1,x:18220,y:610,name:"中回声"},
  {id:"final_echo_2",chapter:"final",kind:"echo",index:2,x:18340,y:610,name:"高回声"},
  {id:"final_inscription",chapter:"final",kind:"clue",x:18450,y:552,name:"第七刻痕"},
  {id:"final_blank_tag",chapter:"final",kind:"flavor",x:18635,y:548,name:"烧白的空名签"},
  {id:"final_dial",chapter:"final",kind:"dial",x:18570,y:610,name:"七相转盘"},
  {id:"final_name_tablet",chapter:"final",kind:"nameTablet",x:18700,y:610,name:"归名牌"},
  {id:"final_crystal",chapter:"final",kind:"crystal",x:18910,y:610,name:"忆火晶石"},
  {id:"final_seal",chapter:"final",kind:"seal",x:19180,y:610,name:"终灯封柱"}
];

const roleHeight=role=>window.CharacterScale?.get(role).height||174;
const NPC_VISUALS={
  shenpo:{role:"shenpo",idle:"npcShenPo",walk:"npcShenPoWalk",talk:"npcShenPoInteract",react:"npcShenPoInteract",grounded:true},
  nameless:{role:"nameless",idle:"npcNamelessRaise",walk:"npcNamelessWalk",talk:"npcNamelessRaise",react:"npcNamelessRaise",grounded:true},
  umbrella:{role:"umbrella",idle:"npcUmbrellaIdle",walk:"npcUmbrellaWalk",talk:"npcUmbrellaTalk",react:"npcUmbrellaPoint",grounded:true},
  girl:{role:"lanternGirl",idle:"npcLanternGirlIdle",walk:"npcLanternGirlWalk",talk:"npcLanternGirlTalk",react:"npcLanternGirlLookBack",grounded:true}
};
const NPC_ANIM_SERIES={
  shenpo:{idle:"prodNpcShenPoIdle_",walk:"prodNpcShenPoWalk_"},
  nameless:{idle:"prodNpcNamelessIdle_",walk:"prodNpcNamelessWalk_"},
  umbrella:{idle:"prodNpcUmbrellaIdle_",walk:"prodNpcUmbrellaWalk_"},
  girl:{idle:"prodNpcGirlIdle_",walk:"prodNpcGirlWalk_"},
  operaSinger:{idle:"prodNpcOperaIdle_",walk:"prodNpcOperaWalk_"}
};
const STORY_APPARITIONS={
  girlRain:{x:2725,y:610,sprite:"npcLanternGirlLookBack",role:"lanternGirl",glow:"#e7b85d"},
  girlBoss:{x:5790,y:610,sprite:"npcLanternGirlTurn",role:"lanternGirl",glow:"#e7b85d"},
  singerIntro:{x:8380,y:610,sprite:"npcOperaSingerIdle",role:"operaSinger",glow:"#9d3b35"},
  singerClue:{x:9180,y:610,sprite:"npcOperaSingerPoint",role:"operaSinger",glow:"#9d3b35"},
  singerFarewell:{x:9445,y:610,sprite:"npcOperaSingerBack",role:"operaSinger",glow:"#9d3b35"},
  singerFerryMemory:{x:13040,y:610,sprite:"npcOperaSingerBack",role:"operaSinger",glow:"#8a4a46"},
  girlOpera:{x:8270,y:610,sprite:"npcLanternGirlIdle",role:"lanternGirl",glow:"#e7b85d"},
  girlBamboo:{x:10740,y:610,sprite:"npcLanternGirlReach",role:"lanternGirl",glow:"#e7b85d"},
  girlBambooHint:{x:10725,y:610,sprite:"npcLanternGirlFireflies",role:"lanternGirl",glow:"#e7b85d"},
  girlFerry:{x:13430,y:610,sprite:"npcLanternGirlTurn",role:"lanternGirl",glow:"#e7b85d"},
  girlCityHint:{x:16355,y:610,sprite:"npcLanternGirlLookBack",role:"lanternGirl",glow:"#e7b85d"},
  girlFinal:{x:17965,y:610,sprite:"npcLanternGirlTurn",role:"lanternGirl",glow:"#e7b85d"}
};
function startStoryApparition(id,duration=4.5){
  if(!STORY_APPARITIONS[id])return;
  if(!world.storyRuntime)world.storyRuntime={active:Object.create(null)};
  if(!world.storyRuntime.active)world.storyRuntime.active=Object.create(null);
  world.storyRuntime.active[id]=Math.max(world.storyRuntime.active[id]||0,duration);
}
function npcVisualFor(obj){
  const type=obj.npcType||(obj.sprite==="npcShenPo"?"shenpo":obj.sprite==="npcNameless"?"nameless":"nameless");
  return NPC_VISUALS[type]||NPC_VISUALS.nameless;
}

function freshChapterProgress(){
  return {
    story:{umbrellaRainTalked:false,umbrellaRainDeparting:false,umbrellaRainGone:false,umbrellaFerryTalked:false,umbrellaFerryGone:false,operaSingerIntroSeen:false,operaSingerClueSeen:false,operaSingerFarewellSeen:false,girlRainSeen:false,girlBossSeen:false,girlOperaSeen:false,girlBambooSeen:false,girlBambooHintSeen:false,girlFerrySeen:false,girlFerryHintSeen:false,girlCityTalked:false,girlCityDeparting:false,girlCityGone:false,girlCityHintSeen:false,girlFinalSeen:false,memoryFinds:[],memoryCompleteSeen:false},
    opera:{talked:false,clues:[],sequence:[],wrongAttempts:0,solved:false,liftRaised:false,liftProgress:0},
    bamboo:{talked:false,clues:[],tuned:[],wrongAttempts:0,reflectionSealed:false,solved:false},
    ferry:{talked:false,names:[],reflectionRevealed:false,debrisCleared:false,winchTurns:0,wrongAttempts:0,solved:false,boatProgress:0},
    city:{talked:false,epitaphs:[],assignments:[null,null,null],carriedMemory:null,wrongAttempts:0,emptyGraveOpened:false,solved:false},
    final:{talked:false,inscription:false,mirrorLit:false,echoSequence:[],echoSolved:false,dial:0,nameChoice:0,nameAccepted:false,crystalLit:false,solved:false,
      convergenceStarted:false,candidate:0,heardEcho:false,readName:false,reflectionSeen:false,wrongAttempts:0,convergenceSolved:false}
  };
}

function mergeChapterProgress(saved){
  const base=freshChapterProgress();
  if(!saved||typeof saved!=="object")return base;
  for(const id of Object.keys(base)){
    if(saved[id]&&typeof saved[id]==="object")Object.assign(base[id],saved[id]);
    for(const key of ["clues","sequence","names","epitaphs","tuned","assignments","echoSequence","memoryFinds"]){
      if(key in base[id]&&!Array.isArray(base[id][key]))base[id][key]=[];
    }
    if(id==="city"){
      const a=base.city.assignments;
      base.city.assignments=[0,1,2].map(i=>Number.isInteger(a?.[i])?a[i]:null);
      if(!Number.isInteger(base.city.carriedMemory))base.city.carriedMemory=null;
    }
  }
  return base;
}

function allStoryChaptersSolved(){
  return ["opera","bamboo","ferry","city","final"].every(id=>world.chapterProgress?.[id]?.solved);
}

function npcTargetFor(obj){
  const p=world.chapterProgress?.[obj.chapter];
  if(!p)return {x:obj.x,y:obj.y};
  if(obj.id==="umbrella_rain")return {x:p.umbrellaRainDeparting?2670:2360,y:610};
  if(obj.id==="umbrella_ferry")return {x:p.umbrellaFerryTalked?13315:13240,y:610};
  if(obj.id==="lantern_girl_city")return {x:p.girlCityDeparting?16640:16330,y:610};
  if(obj.id==="shenpo_opera")return {x:p.solved?9440:(p.clues.length>0?8240:7580),y:610};
  if(obj.id==="nameless_bamboo")return {x:p.solved?12000:((p.clues.length>0||p.tuned.length>0)?10840:10070),y:610};
  if(obj.id==="nameless_ferry")return {x:p.solved?14500:((p.names.length>0||p.reflectionRevealed)?13110:12520),y:610};
  if(obj.id==="shenpo_city")return {x:p.solved?17210:(p.epitaphs.length>0?15490:14980),y:610};
  if(obj.id==="nameless_final")return {x:p.solved?19220:(p.convergenceStarted?18980:17610),y:610};
  return {x:obj.x,y:obj.y};
}
function npcRuntimeFor(obj){
  if(!world.npcRuntime)world.npcRuntime=Object.create(null);
  const target=npcTargetFor(obj);let r=world.npcRuntime[obj.id];
  if(!r)r=world.npcRuntime[obj.id]={x:obj.x,y:target.y,targetX:target.x,moving:false,dir:1,vx:0,stepPhase:0,state:"idle",stateTimer:0,groundY:target.y,reveal:"none",revealTimer:0,revealAlpha:1,spriteCurrent:null,spritePrevious:null,spriteBlend:1};
  return r;
}
const NPC_REVEAL_IDS=new Set(["umbrella_rain","shenpo_opera","nameless_bamboo","nameless_ferry","lantern_girl_city","nameless_final"]);
function startNpcReveal(obj){
  if(!obj||!NPC_REVEAL_IDS.has(obj.id))return false;
  if(!world.npcRevealSeen)world.npcRevealSeen=Object.create(null);
  if(world.npcRevealSeen[obj.id])return false;
  world.npcRevealSeen[obj.id]=true;
  const r=npcRuntimeFor(obj);
  r.reveal="preReveal";r.revealTimer=.18;r.revealAlpha=.25;
  sound.play("story_ghost",{volume:.16});
  saveGame();
  return true;
}

function stageNpcConversation(obj,minDistance=88){
  if(!obj||obj.kind!=="npc")return;
  const r=npcRuntimeFor(obj),npcX=r.x,playerCenter=player.x+player.w*.5;
  const dir=playerCenter<npcX?-1:1;
  const desiredCenter=npcX+dir*minDistance;
  const delta=desiredCenter-playerCenter;
  if(Math.abs(delta)>=6)player.x+=delta;
  const ground=getPrimaryGroundAt(player.x+player.w*.5);
  if(ground){
    player.y=ground.y-player.h;
    player.grounded=true;
    player.groundY=ground.y;
    player.currentGroundId=ground.id;
  }
  player.vx=0;player.vy=0;
  player.facing=dir>0?-1:1;
  r.dir=dir;
}
function playNpcTransient(objId,sprite,duration=.8){
  const obj=CHAPTER_INTERACTABLES.find(o=>o.id===objId&&o.kind==="npc");
  if(!obj)return false;
  const r=npcRuntimeFor(obj);
  r.transientSprite=sprite;
  r.transientTimer=Math.max(0,duration);
  return true;
}
function chapterObjectPoint(obj){
  if(obj.kind==="npc"){
    const r=npcRuntimeFor(obj);return {x:r.x,y:r.y};
  }
  return {x:obj.x,y:obj.y};
}

function restoreChapterRuntime(){
  if(world.operaLift){
    const raised=!!world.chapterProgress.opera.liftRaised;
    world.operaLift.y=raised?430:560;
    world.chapterProgress.opera.liftProgress=raised?1:0;
  }
  if(world.chapterProgress.opera.solved&&!world.ritualBladeUnlocked&&!world.drops.some(d=>d.type==="ritual")){
    world.drops.push({x:9420,y:366,type:"ritual",bob:1.7});
  }
  world.finalReady=!!world.chapterProgress.final.solved;
  ensureChapterShortcuts();
}

const SAVE_KEY="seventhLanternSave";
const SAVE_BACKUP_KEY="seventhLanternSaveBackup";
const SAVE_VERSION=4;
function parseSave(raw){try{const s=JSON.parse(raw);return s&&typeof s==="object"&&Number.isFinite(s.savedAt)?s:null}catch(_e){return null}}
function saveLooksUsable(s){
  if(!s||!Number.isFinite(s.savedAt))return false;
  const x=s.checkpointX??s.x,y=s.checkpointY??s.y;
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<-100||x>world.width+100||y<-300||y>900)return false;
  if(s.chapterProgress!=null&&typeof s.chapterProgress!=="object")return false;
  if(s.currentRegion!=null&&!SCENE_REGIONS.some(r=>r.id===s.currentRegion))return false;
  return true;
}
function loadBestSave(){
  try{
    const primary=parseSave(localStorage.getItem(SAVE_KEY));
    const backup=parseSave(localStorage.getItem(SAVE_BACKUP_KEY));
    const p=saveLooksUsable(primary)?primary:null,b=saveLooksUsable(backup)?backup:null;
    const best=p&&b?(p.savedAt>=b.savedAt?p:b):(p||b||null);
    if(best&&best===b&&!p){
      try{localStorage.setItem(SAVE_KEY,JSON.stringify(b));}catch(_e){}
    }
    return best;
  }catch(_e){return null}
}
const REGION_RESUME_POINTS={
  paperShop:{x:270,y:538},alleyA:{x:1240,y:538},alleyB:{x:2940,y:538},
  alleyC:{x:4580,y:538},bossArena:{x:5740,y:538},opera:{x:7420,y:538},
  bamboo:{x:9920,y:538},ferry:{x:12420,y:538},city:{x:14820,y:538},final:{x:17520,y:538}
};
const regionOrder=id=>Math.max(0,SCENE_REGIONS.findIndex(r=>r.id===id));
function resumePointForRegion(id){return REGION_RESUME_POINTS[id]||REGION_RESUME_POINTS.paperShop;}
function setProgressCheckpoint(regionId){
  const point=resumePointForRegion(regionId);
  const desiredFoot=(point.y??538)+player.h;
  const nearby=getGroundCandidatesAt(point.x).filter(p=>Math.abs(p.y-desiredFoot)<=170).sort((a,b)=>Math.abs(a.y-desiredFoot)-Math.abs(b.y-desiredFoot));
  const ground=nearby[0]||getPrimaryGroundAt(point.x);
  player.checkpointX=point.x;player.checkpointY=ground?ground.y-player.h:point.y;
  const lamp=world.checkpoints.find(c=>Math.abs(c.x-point.x)<12);if(lamp)lamp.lit=true;
}

function drawSceneAsset(_zone){
  // Authored scene paintings now live in world space. Previously a full 16:9
  // image was pinned to the screen, so collisions and characters moved across
  // a stationary painting. That made roofs/ground visually detach from physics.
  ctx.fillStyle=sceneRegionAt(cameraX+W*.5).tone;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-cameraX,0);
  for(const r of SCENE_REGIONS){
    if(r.end<cameraX-2||r.start>cameraX+W+2||!artReady(r.key))continue;
    const width=r.end-r.start;
    const img=art[r.key];
    ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,r.start,r.visualY??70,width,H);
  }
  // Hide hard atlas seams with a world-space architectural shadow band.
  // This is intentionally subtle: it reads as a doorway/occlusion, not a fade-to-black.
  const seamX=1120-cameraX;
  if(seamX>-80&&seamX<W+80){
    const sg=ctx.createLinearGradient(seamX-42,0,seamX+42,0);
    sg.addColorStop(0,"rgba(4,7,8,0)");sg.addColorStop(.38,"rgba(4,7,8,.26)");sg.addColorStop(.5,"rgba(4,7,8,.5)");sg.addColorStop(.62,"rgba(4,7,8,.26)");sg.addColorStop(1,"rgba(4,7,8,0)");
    ctx.fillStyle=sg;ctx.fillRect(seamX-42,70,84,H-70);
  }
  ctx.restore();
  if(cameraX+W>=1100&&!world.epilogueActive){
    ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=cameraX>5850?"#d7b3c866":"#c9e1e766";ctx.lineCap="round";
    const off=(gameTime*500)%74;
    for(let i=0;i<72;i++){const x=(i*89+gameTime*18)%W,y=(i*47+off)%780-30;ctx.lineWidth=i%5===0?1.4:.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-13,y+36);ctx.stroke();}
    ctx.restore();
  }
  return true;
}

function showGuidance(title,text,key="",time=5){ const cap=title==="纸身初醒"?5.5:4.4;guidance={title,text,key,timer:Math.min(time,cap)}; }

const difficultyValues = {
  story: { enemyDamage: .65, enemyHealth: .78, parry: .28, dodgeInvuln:.31, bossVolley:.78, bossProjectileSpeed:.90, label: "引灯" },
  normal: { enemyDamage: 1, enemyHealth: 1, parry: .18, dodgeInvuln:.25, bossVolley:1, bossProjectileSpeed:1, label: "夜行" },
  hard: { enemyDamage: 1.35, enemyHealth: 1.2, parry: .11, dodgeInvuln:.21, bossVolley:1.15, bossProjectileSpeed:1.08, label: "无明" }
};
let difficulty = "normal";

const PUZZLE_HINTS={
  opera:{wrongOrder:{
    1:{text:"三张纸脸的登台关系还互相冲突。回头比对戏单和面具架。"},
    2:{guidance:true,title:"别直接猜三面锣",text:"先用戏单排出地、天、人，再让面具架对应三面锣。"}
  }},
  bamboo:{wrongAngle:{
    1:{text:"钟声的问题不在顺序，而在光落到钟身的角度。"},
    2:{text:"近钟要压低灯光，中钟要接近平直，远钟要抬高。"}
  }},
  ferry:{missingReflection:{
    1:{text:"岸上没有的东西，可能只存在水里的倒影。"},
    2:{text:"把灯压向水面，先找出倒影中的那张名签。"}
  }},
  city:{wrongMemory:{
    1:{text:"纸拓与碑文描述的位置关系不一致。"},
    2:{text:"重新读三块碑：幼者、老者、归乡者的左右关系就是墓灯顺序。"}
  }},
  final:{wrongEvidence:{
    1:{text:"这道人影的影、声、名、位至少有一项不属于同一个人。"},
    2:{text:"逐项核对倒影方向、回应铜片、旧名与第七空位，再点亮晶石。"}
  }}
};
function puzzleHintLevel(){return difficulty==="story"?2:difficulty==="normal"?1:0;}
function showPuzzleFailureHint(chapter,code,context={}){
  const level=puzzleHintLevel();if(level<=0)return false;
  if(!world.puzzleHintCooldowns)world.puzzleHintCooldowns=Object.create(null);
  const key=`${chapter}:${code}`,now=gameTime||0,last=world.puzzleHintCooldowns[key]??-999;
  if(now-last<3)return false;
  const hint=PUZZLE_HINTS[chapter]?.[code]?.[level];if(!hint)return false;
  world.puzzleHintCooldowns[key]=now;
  if(hint.guidance)showGuidance(hint.title,hint.text,hint.key||"",hint.time||4.2);
  else showToast(hint.text,hint.time||2.8);
  return true;
}

class Sound {
  constructor(){this.started=false;this.ambienceRegion="";this.stepTimer=0;this.accentTimer=7;}
  start(){
    this.started=true;this.ambienceRegion=world?.currentRegion||"paperShop";
    this.accentTimer=6+Math.random()*6;window.AudioManager?.setEnvironment(this.ambienceRegion);
  }
  play(name,opts){return window.AudioManager?.play(name,opts)||false;}
  duck(amount=.58,hold=.16,release=.5){window.AudioManager?.duckAmbience?.(amount,hold,release);}
  update(region,dt){
    if(!this.started)return;
    if(region!==this.ambienceRegion){
      this.ambienceRegion=region;this.accentTimer=5+Math.random()*7;window.AudioManager?.setEnvironment(region);
    }
    this.accentTimer-=dt;
    if(this.accentTimer<=0&&state==="playing"&&!currentDialogue&&!world.bossActive&&!world.endingChoiceActive){
      this.ambientAccent(region);this.accentTimer=10+Math.random()*11;
    }
  }
  ambientAccent(region){
    if(region==="opera")return this.play("gong_low",{volume:.045,rate:.72,cooldown:2});
    if(region==="bamboo")return this.play("temple_bell_far",{volume:.05,rate:.80,cooldown:2});
    if(region==="ferry")return this.play("temple_bell_far",{volume:.025,rate:.64,cooldown:2});
    if(region==="city")return this.play("story_ghost",{volume:.032,rate:.72,cooldown:2});
    if(region==="final")return this.play("boss_voice_whisper",{volume:.04,rate:.68,cooldown:2});
    return false;
  }
  tone(){return false;}
  footstep(surface="stone",speed=180){
    const key=(surface==="wood"||surface==="opera")?"footstep_wood":surface==="mud"?"footstep_mud":"footstep_stone";
    const q=Math.max(0,Math.min(1,(speed-55)/260));
    return this.play(key,{volume:.27+q*.12+Math.random()*.025,rate:.95+q*.08+Math.random()*.025,cooldown:.045});
  }
  attack(combo=0){
    const a=player?.attack;
    if(player?.weapon?.type==="ritual"){
      if(a?.charged||a?.kind==="ritual-dash"){
        this.duck(.76,.10,.34);
        const ok=this.play("ritual_finish",{volume:.66,rate:.90});
        this.play("ritual_slash_2",{volume:.18,rate:1.12,cooldown:0});
        return ok;
      }
      const key=a?.kind==="ritual-thrust"?"ritual_thrust":a?.kind==="ritual-finish"?"ritual_finish":combo===2?"ritual_slash_2":"ritual_slash_1";
      return this.play(key,{volume:a?.kind==="ritual-finish"?.64:.56,rate:.98+Math.random()*.035});
    }
    if(a?.charged){
      this.duck(.80,.08,.28);
      return this.play("ruler_swing_3",{volume:.68,rate:a.tier===2?.86:.92});
    }
    const step=Math.max(1,Math.min(3,combo||1));
    return this.play(`ruler_swing_${step}`,{volume:.50+step*.025,rate:.98+Math.random()*.035});
  }
  hit(heavy=false){
    const ritual=player?.weapon?.type==="ritual";
    if(heavy)this.duck(.78,.08,.30);
    return this.play(ritual?"ritual_cut_paper":"ruler_hit",{volume:heavy?.66:.56,rate:heavy?.92:.98+Math.random()*.035});
  }
  jump(){return this.play("jump",{volume:.31,rate:.99+Math.random()*.025});}
  land(fallSpeed=220,surface="stone"){
    const q=Math.max(0,Math.min(1,(fallSpeed-140)/520));
    const ok=this.play("land",{volume:.25+q*.20,rate:.97-q*.04});
    if(q>.25){
      const key=(surface==="wood"||surface==="opera")?"footstep_wood":surface==="mud"?"footstep_mud":"footstep_stone";
      this.play(key,{volume:.10+q*.08,rate:.86+q*.06,cooldown:0});
    }
    if(q>.72)this.duck(.88,.05,.20);
    return ok;
  }
  hurt(){this.duck(.67,.12,.42);return this.play("hurt",{volume:.53,rate:.96+Math.random()*.035});}
  dodge(){return this.play("dodge",{volume:.38,rate:.98+Math.random()*.04});}
  lantern(kind="focus"){
    const key=kind==="raise"?"lantern_raise":kind==="lower"?"lantern_lower":kind==="unstable"?"lantern_unstable":"lantern_focus";
    return this.play(key,{volume:kind==="unstable"?.42:.45,rate:.99+Math.random()*.02});
  }
  pickup(){return this.play("paper_pickup",{volume:.40,rate:.98+Math.random()*.04});}
  boss(){this.duck(.48,.55,.90);return this.play("boss_voice_whisper",{volume:.64,rate:.92});}
  bossAttack(kind="volley"){
    this.duck(.62,.18,.48);
    const key=kind==="dash"?"boss_attack_dash":kind==="ground"?"boss_attack_ground":"boss_attack_volley";
    const rate=kind==="dash"?1.06:kind==="ground"?.82:.96;
    const volume=kind==="ground"?.40:kind==="dash"?.50:.44;
    return this.play(key,{volume,rate,cooldown:.10});
  }
  gong(index=0){this.duck(.78,.18,.55);return this.play(["gong_low","gong_mid","gong_high"][Math.max(0,Math.min(2,index))],{volume:.56});}
  bell(index=0){this.duck(.82,.12,.48);return this.play(["temple_bell_near","temple_bell_mid","temple_bell_far"][Math.max(0,Math.min(2,index))],{volume:.50});}
  winch(){return this.play("winch",{volume:.46});}
  puzzle(){return this.play("grave_lantern",{volume:.40,rate:1.02});}
  checkpoint(){return this.play("grave_lantern",{volume:.43,rate:.96});}
  seal(){this.duck(.74,.15,.50);return this.play("seal_open",{volume:.52});}
  bossPhase(){this.duck(.38,.60,1.15);return this.play("boss_phase_change",{volume:.62,rate:.94});}
  bossMouth(){this.duck(.72,.12,.40);return this.play("boss_mouth_reveal",{volume:.50});}
  bossHit(heavy=false){if(heavy)this.duck(.72,.10,.34);return this.play("boss_hit",{volume:heavy?.64:.55,rate:heavy?.90:.98});}
  bossDeath(){this.duck(.30,1.0,1.8);return this.play("boss_death",{volume:.72,rate:.94});}
}
const sound = new Sound();

const world = {
  width: 19800,
  platforms: [], enemies: [], projectiles: [], drops: [], particles: [], paperDeathFx: [], spriteFx: [], floaters: [], fields: [],
  lore: [], checkpoints: [], switches: [], embers: [],
  lamp: {x:318,y:520,held:false,focused:false,lit:true,angle:0,facing:1,stable:1},
  lampAcquired:false,
  shadowNodes: [], firstEncounterStarted:false, firstShadowDefeated:false,
  doorOpen: false, noteFound: false, gateOpen: false, wallHp: 3,
  puzzleStep: 0, emberCount: 0, bossActive: false, bossDefeated: false,
  boss: null, endingTimer: 0, combatReleaseTimer:0, combatReleaseX:0, doorHintShown:false, combatHintShown:false, wallHintShown:false, lanternHintShown:false,
  currentRegion:"paperShop", visitedRegions:Object.create(null), finalReady:false, finalChoice:false, lanternsRecovered:0,
  endingChoiceActive:false, endingChoiceIndex:0, epilogueActive:false, epilogueComplete:false, epilogueStartX:0, epilogueBeat:0,
  chapterProgress:freshChapterProgress(), operaLift:null, ritualBladeUnlocked:false, npcRuntime:Object.create(null), npcRevealSeen:Object.create(null), puzzleHintCooldowns:Object.create(null), storyRuntime:{active:Object.create(null)}, clueReaction:{active:false,timer:0,id:'',kind:''}, clueReactionSeen:Object.create(null), tutorialFlags:{lampRaisedOnce:false,shadowRevealLearned:false,interactSwitchLearned:false,ritualCutLearned:false,lanternCoreLearned:false}
};

const player = {
  x:220,y:480,w:38,h:72,vx:0,vy:0,facing:1,grounded:false,
  health:100,maxHealth:100,invuln:0,hurtTimer:0,attack:null,attackCooldown:0,combo:0,lastAttack:0,
  charging:false,chargeLevel:0,chargeCue:0,guarding:false,dodging:0,dodgeDirection:-1,attackBuffer:0,attackBufferHeld:0,checkpointX:220,checkpointY:480,
  weapon:{type:"ruler",name:"裁魂尺",damage:16,range:78,color:"#c29a55",style:"ruler"},
  lampHeld:false,dead:false,deathTimer:0,deathPhase:'idle',deathVisualTimer:0,paperHurtFlash:0,interactTarget:null,interactCandidates:[],interactIndex:0,trail:[]
};

function paperBodyState(){
  const ratio=clamp(player.health/player.maxHealth,0,1);
  const fragile=ratio<=.35,critical=ratio<=.20;
  return {
    ratio,fragile,critical,
    edgeBurn:fragile?clamp((.35-ratio)/.35,0,1):0,
    translucency:critical?clamp((.20-ratio)/.20,0,.34):0
  };
}
function spawnPaperDamageFx(x,y,count=11){
  const room=Math.max(0,MAX_PARTICLES-world.particles.length);
  count=Math.min(count,room);
  for(let i=0;i<count;i++){
    const dir=player.facing||1;
    const life=.35+Math.random()*.28;
    world.particles.push({
      type:'paper',x:x+(Math.random()-.5)*18,y:y+(Math.random()-.5)*38,
      vx:(Math.random()*120+45)*-dir+(Math.random()-.5)*90,
      vy:-40-Math.random()*150,life,max:life,
      rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*10,
      w:5+Math.random()*8,h:2+Math.random()*4,color:'#d8c7a1',size:4
    });
  }
}
function getPlayerHurtbox(){
  // Collision body and rendered sprite use different dimensions. Keep the
  // gameplay hurtbox centred on Ayan's torso instead of reusing the 38x72
  // movement collider. Airborne poses are visually higher, so lift the box
  // by 15 px to match the jump sprite rather than lagging one frame below it.
  const w=44,h=86;
  const footY=player.y+player.h;
  const airLift=player.grounded?0:15;
  return {x:player.x+player.w*.5-w*.5,y:footY-h-airLift,w,h};
}

function getBossHurtbox(b=world.boss){
  if(!b)return null;
  const phase=b.pendingPhase||b.phase||1;
  const groundY=b.groundY??(b.y+b.h);
  const centerX=b.x+b.w*.5;
  if(phase===1)return {x:centerX-112,y:groundY-338,w:224,h:338};
  if(phase===2)return {x:centerX-178,y:groundY-286,w:356,h:286};
  return {x:centerX-205,y:groundY-218,w:410,h:218};
}

function pushProjectile(p){
  if(world.projectiles.length>=MAX_PROJECTILES){
    // Prefer dropping the oldest off-screen projectile rather than allowing
    // an unbounded barrage to tank Canvas rendering.
    const idx=world.projectiles.findIndex(q=>q.x<cameraX-120||q.x>cameraX+W+120||q.y<-120||q.y>H+120);
    if(idx>=0)world.projectiles.splice(idx,1);else return false;
  }
  world.projectiles.push(p);return true;
}

function platform(x,y,w,h=40,kind="stone"){
  const p={x,y,w,h,kind,id:`${kind}:${x}:${y}`};world.platforms.push(p);return p;
}

function getGroundCandidatesAt(worldX){
  return world.platforms.filter(p=>worldX>=p.x&&worldX<=p.x+p.w).sort((a,b)=>a.y-b.y);
}
function getGroundAt(worldX, fromY=-Infinity, maxDrop=Infinity){
  const candidates=getGroundCandidatesAt(worldX).filter(p=>p.y>=fromY-10 && p.y-fromY<=maxDrop);
  return candidates.length?candidates[0]:null;
}
function getPrimaryGroundAt(worldX){
  const candidates=getGroundCandidatesAt(worldX);
  if(!candidates.length)return null;
  const primary=candidates.filter(p=>p.h>=40||["street","wood","boss"].includes(p.kind));
  return (primary.length?primary:candidates).sort((a,b)=>a.y-b.y)[0];
}
function groundInfoAt(worldX, fromY=-Infinity, maxDrop=Infinity){
  const p=getGroundAt(worldX,fromY,maxDrop)||getPrimaryGroundAt(worldX);
  return p?{groundY:p.y,surfaceType:p.kind,platformId:p.id,platform:p,normal:{x:0,y:-1}}:null;
}
function getGroundCandidatesForEntity(entity){
  return world.platforms.filter(p=>entity.x+entity.w>p.x&&entity.x<p.x+p.w).sort((a,b)=>a.y-b.y);
}
function snapEntityToGround(entity, preferPrimary=true, preferredFootY=null){
  let candidates=getGroundCandidatesForEntity(entity);
  if(preferPrimary){
    const primary=candidates.filter(p=>p.h>=40||["street","wood","boss"].includes(p.kind));
    if(primary.length)candidates=primary;
  }
  if(preferredFootY!=null&&candidates.length){
    const near=[...candidates].sort((a,b)=>Math.abs(a.y-preferredFootY)-Math.abs(b.y-preferredFootY));
    if(Math.abs(near[0].y-preferredFootY)<=190)candidates=near;
  }
  const p=candidates[0];
  if(!p)return false;
  entity.y=p.y-entity.h; entity.vy=0; entity.grounded=true; entity.groundY=p.y; entity.currentGroundId=p.id;
  entity.lastValidGroundPosition={x:entity.x,y:entity.y,groundY:p.y};
  return true;
}
function getBlockingWalls(){
  const walls=[];
  if(!world.doorOpen)walls.push({x:1018,y:244,w:38,h:366,id:"shop-door"});
  if(world.wallHp>0)walls.push({x:4385,y:455,w:45,h:155,id:"breakable-wall"});
  if(!world.gateOpen)walls.push({x:5590,y:300,w:58,h:310,id:"sealed-gate"});
  if(world.bossActive&&!world.bossDefeated){
    walls.push({x:5990,y:240,w:22,h:370,id:"boss-barrier-left"});
    walls.push({x:7272,y:240,w:22,h:370,id:"boss-barrier-right"});
  }
  // The soul mirror is visual / interactive only.
  // Do not use it as a traversal wall: the finale requires Ayan to walk right
  // past the mirror to inspect echoes, the dial, name tablet, crystal and seal.
  for(const [chapter,x] of Object.entries(CHAPTER_GATE_X)){
    const solved=!!world.chapterProgress?.[chapter]?.solved;
    const rewardReady=chapter!=="opera"||world.ritualBladeUnlocked;
    if(!(solved&&rewardReady))walls.push({x,y:250,w:34,h:360,id:`chapter-gate:${chapter}`});
  }
  return walls;
}
function wallBetween(x1,y1,x2,y2){
  const minX=Math.min(x1,x2), maxX=Math.max(x1,x2), midY=(y1+y2)*.5;
  return getBlockingWalls().some(w=>w.x<maxX&&w.x+w.w>minX&&midY>=w.y&&midY<=w.y+w.h);
}
function resolveHorizontalAgainstWalls(entity,oldX){
  const dx=entity.x-oldX;
  for(const w of getBlockingWalls()){
    const vertical=entity.y+entity.h>w.y&&entity.y<w.y+w.h;
    if(!vertical)continue;
    if(dx>0){
      const oldRight=oldX+entity.w,newRight=entity.x+entity.w;
      if(oldRight<=w.x&&newRight>=w.x){
        entity.x=w.x-entity.w;entity.vx=Math.min(0,entity.vx||0);return w;
      }
    }else if(dx<0){
      const oldLeft=oldX,newLeft=entity.x;
      if(oldLeft>=w.x+w.w&&newLeft<=w.x+w.w){
        entity.x=w.x+w.w;entity.vx=Math.max(0,entity.vx||0);return w;
      }
    }
    if(rectsOverlap(entity,w)){
      if(dx>=0){entity.x=w.x-entity.w;entity.vx=Math.min(0,entity.vx||0);}
      else {entity.x=w.x+w.w;entity.vx=Math.max(0,entity.vx||0);}
      return w;
    }
  }
  return null;
}
function resolveEntityVertical(entity,dt){
  const oldY=entity.y;
  entity.vy=(entity.vy||0)+1300*dt;
  entity.vy=Math.min(entity.vy,760);
  entity.y+=entity.vy*dt;
  entity.grounded=false;
  let landed=null;
  for(const p of world.platforms){
    if(entity.x+entity.w<=p.x||entity.x>=p.x+p.w)continue;
    if(entity.vy>=0&&oldY+entity.h<=p.y+10&&entity.y+entity.h>=p.y){
      if(!landed||p.y<landed.y)landed=p;
    }
  }
  if(landed){
    entity.y=landed.y-entity.h;entity.vy=0;entity.grounded=true;entity.groundY=landed.y;entity.currentGroundId=landed.id;
    entity.lastValidGroundPosition={x:entity.x,y:entity.y,groundY:landed.y};
  }
  const killPlane=760;
  if(entity.y>killPlane){
    const safe=entity.lastValidGroundPosition;
    if(safe){entity.x=safe.x;entity.y=safe.y;entity.vx=0;entity.vy=0;entity.grounded=true;entity.groundY=safe.groundY;}
    else snapEntityToGround(entity,true);
  }
}
function groundAhead(entity,dir,look=16,maxStep=34){
  const footY=entity.y+entity.h;
  const px=dir>0?entity.x+entity.w+look:entity.x-look;
  const p=getGroundAt(px,footY-12,maxStep+18);
  return !!p && Math.abs(p.y-footY)<=maxStep+18;
}
function wallAhead(entity,dir,look=10){
  const probe={x:dir>0?entity.x+entity.w:entity.x-look,y:entity.y+8,w:look,h:Math.max(8,entity.h-16)};
  return getBlockingWalls().find(w=>rectsOverlap(probe,w))||null;
}
function spawnEnemy(x,legacyY,type="shadow",extra={}){
  const defs={shadow:{w:48,h:45,hp:34,speed:82,damage:12},paper:{w:42,h:70,hp:46,speed:48,damage:10},elite:{w:60,h:82,hp:92,speed:58,damage:18}};
  const d=defs[type], mult=difficultyValues[difficulty].enemyHealth;
  const initialY=Number.isFinite(legacyY)?legacyY:0;
  const e={x,y:initialY,w:d.w,h:d.h,type,hp:d.hp*mult,maxHp:d.hp*mult,speed:d.speed,damage:d.damage,
    alive:true,inactive:!!extra.inactive,first:!!extra.first,exposed:false,exposeTimer:0,fixedTimer:0,bindTimer:0,brittle:false,brittleTimer:0,lampFed:false,lampFeedTimer:0,vx:0,vy:0,grounded:false,
    attackTimer:rand(.3,1.4),hurt:0,windup:0,drop:null,id:extra.id||Math.random(),aiState:"IDLE",stateTimer:0,attackDidHit:false,
    stuckTimer:0,lastPositionX:x,desiredDir:1,groundY:null,lastValidGroundPosition:null};
  const preferredFoot=Number.isFinite(legacyY)?legacyY+d.h:null;
  if(!snapEntityToGround(e,false,preferredFoot)){
    (window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[])).push(`enemy-spawn-no-ground:${type}@${x}`);
    return null;
  }
  world.enemies.push(e);return e;
}

function validateWorldIntegrity(){
  const errors=window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[]);
  const visualKinds=new Set(["stone","awning","roof","crate","moving-lift","opera-balcony","shortcut-opera","shortcut-bamboo","shortcut-ferry","shortcut-city"]);
  for(const p of world.platforms){
    if(![p.x,p.y,p.w,p.h].every(Number.isFinite)||p.w<=0||p.h<=0)errors.push(`invalid-platform:${p.id}`);
    if(p.h<40&&!["street","wood","boss"].includes(p.kind)&&!visualKinds.has(p.kind))errors.push(`platform-without-visual:${p.id}`);
  }
  // The authored route from the paper shop through the rain alley is intended
  // to be continuously walkable on its base floor. Catch invisible floor gaps
  // immediately instead of discovering them as random deaths during play.
  for(let x=20;x<world.width-20;x+=64){
    if(!getPrimaryGroundAt(x))errors.push(`missing-primary-ground@${x}`);
  }
  for(const e of world.enemies){
    if(!e.alive)continue;
    const foot=e.y+e.h;
    if(!Number.isFinite(e.groundY)||Math.abs(foot-e.groundY)>1){
      if(!snapEntityToGround(e,false,e.groundY??foot))errors.push(`enemy-ground-invalid:${e.type}@${Math.round(e.x)}`);
    }
  }
  return errors.length===0;
}

function buildWorld(){
  world.platforms=[]; world.enemies=[]; world.projectiles=[]; world.drops=[]; world.particles=[];world.paperDeathFx=[];world.spriteFx=[];world.floaters=[];world.fields=[];
  world.lore=[]; world.checkpoints=[]; world.switches=[]; world.embers=[];
  world.lamp={x:318,y:520,held:false,focused:false,lit:true,angle:0,facing:1,stable:1};world.lampAcquired=false;
  world.shadowNodes=[{x:1405,y:565,r:30,active:true,fixed:false}];
  world.firstEncounterStarted=false;world.firstShadowDefeated=false;
  world.doorOpen=false; world.noteFound=false; world.gateOpen=false; world.wallHp=3;
  world.puzzleStep=0; world.emberCount=0; world.bossActive=false; world.bossDefeated=false; world.boss=null; world.endingTimer=0;world.combatReleaseTimer=0;world.combatReleaseX=0;
  world.currentRegion="paperShop";world.visitedRegions=Object.create(null);world.visitedRegions.paperShop=true;world.finalReady=false;world.finalChoice=false;world.lanternsRecovered=0;
  world.endingChoiceActive=false;world.endingChoiceIndex=0;world.epilogueActive=false;world.epilogueComplete=false;world.epilogueStartX=0;world.epilogueBeat=0;
  world.chapterProgress=freshChapterProgress();world.operaLift=null;world.ritualBladeUnlocked=false;world.npcRuntime=Object.create(null);world.npcRevealSeen=Object.create(null);world.puzzleHintCooldowns=Object.create(null);world.storyRuntime={active:Object.create(null)};world.shortcutRuntime=Object.create(null);world.clueReaction={active:false,timer:0,id:'',kind:''};world.clueReactionSeen=Object.create(null);world.tutorialFlags={lampRaisedOnce:false,shadowRevealLearned:false,interactSwitchLearned:false,ritualCutLearned:false,lanternCoreLearned:false};
  world.introRain=false;world.doorHintShown=false;world.combatHintShown=false;world.wallHintShown=false;world.lanternHintShown=false;

  platform(-100,610,1220,120,"wood");
  // Keep the rain-alley street continuously walkable. The previous segmented
  // collision layout left invisible 50 px gaps once debug platform art was hidden.
  platform(1120,610,4560,120,"street");
  platform(2270,560,120,30,"stone");
  platform(5680,610,1620,120,"boss");
  // Full-game chapter floors. Each is visible through ProductionAssets and shares y=610.
  platform(7300,610,2500,120,"opera");
  platform(9800,610,2500,120,"bamboo");
  platform(12300,610,2400,120,"ferry");
  platform(14700,610,2700,120,"city");
  platform(17400,610,2400,120,"final");
  // This reviewed mechanism becomes a real optional lift in the opera house.
  // Its collider is part of the unified GroundSystem and moves with the art.
  world.operaLift=platform(9340,560,170,24,"moving-lift");
  // Opera balcony: the second real clue lives upstairs. The player must pass
  // the gongs, raise the lift, investigate the gallery, then return to solve.
  platform(9490,430,235,22,"opera-balcony");
  // Rebuilt full-scene chapters use a single readable ground route. The old
  // isolated raised colliders depended on floating decorative modules and are
  // removed so visual architecture and collision never contradict each other.
  platform(1380,505,160,22,"awning"); platform(1640,445,180,22,"roof"); platform(1860,510,145,22,"awning");
  platform(2640,500,190,22,"awning"); platform(2890,430,190,22,"roof");
  platform(3300,515,150,22,"crate"); platform(3490,445,145,22,"roof"); platform(3670,370,150,22,"roof"); platform(3870,305,160,22,"roof");
  platform(4590,525,150,22,"crate"); platform(4780,460,160,22,"awning"); platform(5000,400,180,22,"roof");
  platform(6250,525,165,22,"roof"); platform(6440,470,245,22,"roof"); platform(6740,525,165,22,"roof");

  world.lore.push(
    {id:"photo_age7",x:420,y:555,w:34,h:28,title:"旧照片",seen:false,text:["照片被水浸过，只剩一个模糊的孩子。", "背面写着：『阿砚，七岁。愿此后岁岁见灯。』"]},
    {id:"burned_note",x:675,y:555,w:35,h:24,title:"烧焦的纸条",seen:false,critical:true,text:["师父的字迹：『找回六盏灯……』", "纸条下半截被烧毁，只勉强看清：『不要点燃第七盏。』"]},
    {x:1510,y:565,w:30,h:28,title:"湿透的门牌",placement:"floor",seen:false,text:["门牌上有一家四口的名字。最下面那个名字，被人用指甲反复刮去。"]},
    {x:2720,y:456,w:32,h:32,title:"无声风铃",seen:false,text:["风铃在暴雨中剧烈摇晃，却没有发出声音。", "细看才发现，每片铜叶上都刻着一张嘴。"]},
    {x:4510,y:565,w:34,h:28,title:"河泥布鞋",placement:"floor",seen:false,text:["一只七年前的儿童布鞋，鞋底仍残留河泥。", "尺寸与你的脚完全相同。"]}
  );
  world.checkpoints.push(
    {x:270,y:520,lit:true},{x:3140,y:520,lit:false},{x:5740,y:520,lit:false},
    {x:7420,y:520,lit:false},{x:9920,y:520,lit:false},{x:12420,y:520,lit:false},
    {x:14820,y:520,lit:false},{x:17520,y:520,lit:false}
  );
  world.switches.push({x:4820,y:420,id:0,lit:false},{x:5040,y:360,id:1,lit:false},{x:5260,y:552,id:2,lit:false});
  world.embers.push({x:1850,y:554,id:0,collected:false,visible:false},{x:4460,y:554,id:1,collected:false,visible:true},{x:5350,y:550,id:2,collected:false,visible:false});

  spawnEnemy(1400,565,"shadow",{inactive:true,first:true,id:"first-shadow"});
  spawnEnemy(1740,565,"paper",{inactive:true}); spawnEnemy(1950,565,"shadow",{inactive:true});
  spawnEnemy(2580,565,"shadow"); spawnEnemy(2860,385,"paper");
  spawnEnemy(3460,565,"shadow"); spawnEnemy(3770,325,"paper");
  spawnEnemy(4160,528,"elite",{id:"guardian"});
  spawnEnemy(4720,565,"shadow"); spawnEnemy(5200,565,"paper");
  // Act II deliberately alternates safe investigation spaces with short combat
  // punctuation. The previous build placed nineteen enemies back-to-back here.
  spawnEnemy(8240,565,"shadow"); spawnEnemy(9140,565,"paper");
  spawnEnemy(11330,565,"paper");
  spawnEnemy(13760,565,"shadow");
  spawnEnemy(15920,565,"shadow"); spawnEnemy(16960,565,"elite");
  validateWorldIntegrity();
}

function resetCameraRuntime(){
  cameraRuntime.anchorX=cameraX;cameraRuntime.reverseDistance=0;cameraRuntime.lastMoveDir=0;cameraRuntime.lastPlayerX=player.x;
}
function cameraTargetX(){
  const center=player.x+player.w*.5,maxX=Math.max(0,world.width-W);
  const enemyNear=world.enemies.some(e=>e.alive&&!e.inactive&&Math.abs((e.x+e.w*.5)-center)<320);
  if(enemyNear){
    const lead=(player.facing||1)*Math.min(110,W*.085);
    return clamp(center-W*.5+lead,0,maxX);
  }
  const left=cameraX+W*.32,right=cameraX+W*.68;
  let target=cameraX;
  if(center<left)target=center-W*.32;
  else if(center>right)target=center-W*.68;
  return clamp(target,0,maxX);
}
function updateCamera(dt){
  const center=player.x+player.w*.5,maxX=Math.max(0,world.width-W);
  const inputDir=(keys.a?-1:0)+(keys.d?1:0);
  const moved=Math.abs(player.x-(cameraRuntime.lastPlayerX||player.x));
  if(inputDir&&cameraRuntime.lastMoveDir&&inputDir!==cameraRuntime.lastMoveDir)cameraRuntime.reverseDistance=0;
  if(inputDir){cameraRuntime.reverseDistance+=moved;cameraRuntime.lastMoveDir=inputDir;}
  cameraRuntime.lastPlayerX=player.x;
  let target=cameraTargetX();
  let targetDir=Math.sign(target-cameraX);
  // On a true reversal, never let the camera keep travelling in the old
  // direction while the player is already holding the opposite input.
  if(inputDir&&targetDir&&targetDir!==inputDir&&cameraRuntime.reverseDistance<140)target=cameraX;
  // A deliberate sustained move should eventually bring the camera with the
  // player even before the avatar reaches the hard dead-zone edge.
  if(inputDir&&cameraRuntime.reverseDistance>=140&&Math.abs(target-cameraX)<1){
    target=clamp(center-W*.5,0,maxX);targetDir=Math.sign(target-cameraX);
  }
  const alpha=1-Math.exp(-6.2*dt);
  cameraX=lerp(cameraX,target,alpha);
  if(Math.abs(target-cameraX)<.25)cameraX=target;
  cameraX=clamp(cameraX,0,maxX);cameraRuntime.anchorX=cameraX;
}
function resetPlayer(x=220,y=480){
  Object.assign(player,{x,y,vx:0,vy:0,health:100,invuln:0,hurtTimer:0,attack:null,attackCooldown:0,combo:0,
    charging:false,chargeLevel:0,chargeCue:0,guarding:false,dodging:0,dodgeDirection:-1,attackBuffer:0,attackBufferHeld:0,
    weapon:{type:"ruler",name:"裁魂尺",damage:16,range:78,color:"#c29a55",style:"ruler"},
    lampHeld:false,dead:false,deathTimer:0,deathPhase:'idle',deathVisualTimer:0,paperHurtFlash:0,interactCandidates:[],interactIndex:0});
  world.lamp.held=false;world.lamp.focused=false;world.lampAcquired=false;world.lamp.x=318;world.lamp.y=520;world.lamp.angle=0;world.lamp.facing=1;world.lamp.lit=true;
  const spawnGround=getPrimaryGroundAt(player.x+player.w*.5);if(spawnGround){player.y=spawnGround.y-player.h;player.grounded=true;player.groundY=spawnGround.y;player.currentGroundId=spawnGround.id;player.lastValidGroundPosition={x:player.x,y:player.y,groundY:spawnGround.y};}
  player.checkpointX=player.x; player.checkpointY=player.y; cameraX=clamp(player.x-W*.35,0,world.width-W);cameraKickX=0;cameraKickY=0;impactSpot.life=0;routeHintIdle=0;resetCameraRuntime();
}

function startGame(diff="normal", fromSave=false, assetsConfirmed=false){
  if(!assetsConfirmed&&!requiredAssetsReady()){ensureAssetsThenStart(diff,fromSave);return;}
  difficulty=diff; dialogueQueue=[]; currentDialogue=null; dialogueEl.classList.remove("visible"); buildWorld(); resetPlayer();
  hidePanels(); state="playing";
  if(fromSave){
    try{
      const save=loadBestSave();
      if(save){
        difficulty=save.difficulty||diff; buildWorld();
        let savedRegion=save.currentRegion||sceneRegionAt(save.checkpointX??save.x??220).id;
        // Migrate old saves that recorded chapter progress but kept the first
        // lamp's coordinates. A defeated first boss always resumes at Act II.
        if(save.bossDefeated&&regionOrder(savedRegion)<regionOrder("opera"))savedRegion="opera";
        let savedX=save.checkpointX??save.x??220;
        if(regionOrder(sceneRegionAt(savedX).id)<regionOrder(savedRegion))savedX=resumePointForRegion(savedRegion).x;
        player.checkpointX=savedX; player.checkpointY=save.checkpointY??save.y??480;
        player.x=player.checkpointX; player.y=player.checkpointY;
        snapEntityToGround(player,true,player.checkpointY+player.h);
        player.checkpointY=player.y;
        world.noteFound=!!save.noteFound; world.doorOpen=!!save.noteFound;
        world.lampAcquired=save.lampAcquired??(!!save.lampHeld||regionOrder(savedRegion)>0||!!save.noteFound);
        player.lampHeld=world.lampAcquired;world.lamp.held=world.lampAcquired;world.lamp.focused=save.lampFocused??world.lampAcquired;
        const savedEmbers=Array.isArray(save.emberIds)?save.emberIds:world.embers.slice(0,save.emberCount||0).map(e=>e.id);
        for(const ember of world.embers) ember.collected=savedEmbers.includes(ember.id);
        world.emberCount=world.embers.filter(e=>e.collected).length;
        if(world.embers[2].collected){world.embers[2].visible=true;world.puzzleStep=3;for(const sw of world.switches)sw.lit=true;}
        world.gateOpen=world.emberCount>=3;
        world.wallHp=Number.isFinite(save.wallHp)?save.wallHp:world.wallHp;
        world.puzzleStep=Number.isFinite(save.puzzleStep)?save.puzzleStep:world.puzzleStep;
        if(Array.isArray(save.switches))for(const sw of world.switches)sw.lit=save.switches.includes(sw.id);
        world.bossDefeated=!!save.bossDefeated;world.lanternsRecovered=save.lanternsRecovered||0;world.currentRegion=savedRegion;
        world.chapterProgress=mergeChapterProgress(save.chapterProgress);
        // Migrate the previous walking-only Act II saves without trapping the
        // player behind newly authored chapter gates.
        if(!save.chapterProgress){
          for(const [id,total] of Object.entries(CHAPTER_LANTERN_TOTAL))if(world.lanternsRecovered>=total)world.chapterProgress[id].solved=true;
        }
        world.ritualBladeUnlocked=!!save.ritualBladeUnlocked;
        // Phase-2 makes the opera ritual blade a real cross-chapter tool. Old
        // phase-1 saves may already resume beyond the opera without having
        // picked it up, so migrate only those past-the-opera saves forward.
        if((save.version||0)<3&&world.chapterProgress.opera.solved&&regionOrder(savedRegion)>regionOrder("opera")){
          world.ritualBladeUnlocked=true;
        }
        player.weapon=world.ritualBladeUnlocked?weaponDef("ritual"):weaponDef("ruler");
        world.visitedRegions=Object.create(null);for(const id of (save.visitedRegions||[world.currentRegion]))world.visitedRegions[id]=true;
        world.clueReactionSeen=Object.create(null);for(const id of (save.clueReactionSeen||[]))world.clueReactionSeen[id]=true;
        world.npcRevealSeen=Object.create(null);for(const id of (save.npcRevealSeen||[]))world.npcRevealSeen[id]=true;
        world.puzzleHintCooldowns=Object.create(null);
        world.clueReaction={active:false,timer:0,id:'',kind:''};
        world.tutorialFlags={lampRaisedOnce:!!save.tutorialFlags?.lampRaisedOnce,shadowRevealLearned:!!save.tutorialFlags?.shadowRevealLearned,interactSwitchLearned:!!save.tutorialFlags?.interactSwitchLearned,ritualCutLearned:!!save.tutorialFlags?.ritualCutLearned,lanternCoreLearned:!!save.tutorialFlags?.lanternCoreLearned};
        restoreChapterRuntime();
        for(const c of world.checkpoints)c.lit=c.lit||c.x<=player.checkpointX+2;
        cameraX=clamp(player.x-W*.35,0,world.width-W);resetCameraRuntime();
        sound.start();
        showToast("从上次点亮的存档灯继续");
        if(["opera","bamboo","ferry","city","final"].includes(savedRegion))showGuidance("上次停在这里",chapterObjective(savedRegion),"",4.4);
        return;
      }
    }catch(_e){}
  }
  sound.start();
  showGuidance("纸身初醒","先靠近引路灯并按 E 唤醒，再调查屋内发光的线索","A / D 移动　E 互动",5.5);
  queueDialogue("旁白",["中元夜，无阴镇的六盏引魂灯同时熄灭了。", "雨声之外，整座镇子再没有别的声音。"]);
  setTimeout(()=>queueDialogue("阿砚",["师父不在……桌上似乎留下了什么。"]),900);
}

function saveGame(options={}){
  const resumeRegion=options.resumeRegion||world.currentRegion||sceneRegionAt(player.x).id;
  if(options.advanceCheckpoint||regionOrder(sceneRegionAt(player.checkpointX).id)<regionOrder(resumeRegion))setProgressCheckpoint(resumeRegion);
  const data={version:SAVE_VERSION,savedAt:Date.now(),difficulty,checkpointX:player.checkpointX,checkpointY:player.checkpointY,
    x:player.checkpointX,y:player.checkpointY,noteFound:world.noteFound,lampHeld:player.lampHeld,lampAcquired:world.lampAcquired,lampFocused:world.lamp.focused,
    emberCount:world.emberCount,emberIds:world.embers.filter(e=>e.collected).map(e=>e.id),wallHp:world.wallHp,
    puzzleStep:world.puzzleStep,switches:world.switches.filter(s=>s.lit).map(s=>s.id),bossDefeated:world.bossDefeated,
    lanternsRecovered:world.lanternsRecovered,currentRegion:resumeRegion,
    chapterProgress:world.chapterProgress,ritualBladeUnlocked:world.ritualBladeUnlocked,
    visitedRegions:Object.keys(world.visitedRegions).filter(k=>world.visitedRegions[k]),clueReactionSeen:Object.keys(world.clueReactionSeen||{}).filter(k=>world.clueReactionSeen[k]),npcRevealSeen:Object.keys(world.npcRevealSeen||{}).filter(k=>world.npcRevealSeen[k]),tutorialFlags:{...world.tutorialFlags}};
  try{
    const payload=JSON.stringify(data);
    const previous=localStorage.getItem(SAVE_KEY);
    if(parseSave(previous))localStorage.setItem(SAVE_BACKUP_KEY,previous);
    localStorage.setItem(SAVE_KEY,payload);
    continueBtn.classList.remove("hidden");
  }catch(_e){}
}

function hidePanels(){ document.querySelectorAll(".panel").forEach(p=>p.classList.remove("visible")); }
function showPanel(el){ hidePanels(); el.classList.add("visible"); }
function showToast(text,time=2.2){ toastEl.textContent=text; toastEl.classList.add("visible"); toastTimer=time; }
function queueDialogue(speaker,lines){ dialogueQueue.push(...lines.map(text=>({speaker,text}))); if(!currentDialogue) nextDialogue(); }
function nextDialogue(){
  currentDialogue=dialogueQueue.shift()||null;
  if(currentDialogue){ speakerEl.textContent=currentDialogue.speaker; dialogueText.textContent=currentDialogue.text; drawDialoguePortrait(currentDialogue.speaker,currentDialogue.text); dialogueEl.classList.add("visible"); }
  else dialogueEl.classList.remove("visible");
}

function dialoguePortraitAsset(speaker){
  return speaker==="阿砚"?"portraitAyan":speaker==="沈婆"?"portraitShenPo":speaker==="无名客"||speaker==="摆渡人"?"portraitNameless":speaker==="撑伞女子"?"portraitUmbrella":speaker==="沈月娥"||speaker==="红衣戏伶"?"portraitOperaSinger":speaker==="？？？"||speaker==="提灯女孩"?"portraitLanternGirl":speaker==="百口灯妖"?"bossPhase1":null;
}
function dialoguePortraitKind(speaker){
  if(dialoguePortraitAsset(speaker))return "character";
  if(speaker==="旁白")return "narrator";
  if(/倒影|水面|照魂镜|镜面/.test(speaker))return "reflection";
  if(/戏单|排练单|戏票|香火簿|船票|纸鹤|祈愿签|旧册|碑|刻痕|归名牌|纸拓|照片|字迹|名签/.test(speaker))return "document";
  if(/船骸|绞盘|晶石|封柱|机关|升降|墓灯/.test(speaker))return "mechanism";
  return "seal";
}
function drawDialoguePortrait(speaker,text=""){
  if(!portraitCtx)return;
  const officialPortrait=dialoguePortraitAsset(speaker);
  if(officialPortrait&&drawPortraitAsset(officialPortrait))return;
  const kind=dialoguePortraitKind(speaker);
  const p=portraitCtx,w=portraitCanvas.width,h=portraitCanvas.height;p.clearRect(0,0,w,h);const bg=p.createRadialGradient(90,78,8,90,90,92);bg.addColorStop(0,"#294147");bg.addColorStop(1,"#071013");p.fillStyle=bg;p.fillRect(0,0,w,h);p.strokeStyle="#b4935e33";p.lineWidth=2;for(let r=28;r<100;r+=18){p.beginPath();p.arc(90,90,r,0,Math.PI*2);p.stroke();}
  if(kind==="narrator"){
    p.strokeStyle="#c5b28d";p.lineWidth=5;p.beginPath();p.arc(90,90,43,-2.7,2.55);p.stroke();p.fillStyle="#d4c6aa";p.font="700 38px serif";p.textAlign="center";p.fillText("述",90,104);return;
  }
  if(kind==="document"){
    p.fillStyle="#d8c9a8";p.strokeStyle="#6c5540";p.lineWidth=3;p.beginPath();p.moveTo(52,40);p.lineTo(120,40);p.lineTo(137,57);p.lineTo(137,140);p.lineTo(52,140);p.closePath();p.fill();p.stroke();p.fillStyle="#7d342e";for(let y=72;y<=116;y+=16)p.fillRect(67,y,54-(y%32?8:0),3);p.fillStyle="#8e7150";p.beginPath();p.moveTo(120,40);p.lineTo(120,58);p.lineTo(137,57);p.closePath();p.fill();return;
  }
  if(kind==="reflection"){
    const rg=p.createRadialGradient(90,92,3,90,92,58);rg.addColorStop(0,"#9cc4c5");rg.addColorStop(1,"#173034");p.fillStyle=rg;p.beginPath();p.ellipse(90,95,52,31,0,0,Math.PI*2);p.fill();p.strokeStyle="#b7d6d2";p.lineWidth=3;for(const [rx,ry] of [[37,10],[52,17],[65,24]]){p.beginPath();p.ellipse(90,96,rx,ry,0,0,Math.PI*2);p.stroke();}return;
  }
  if(kind==="mechanism"){
    p.strokeStyle="#c8a86c";p.lineWidth=6;p.beginPath();p.arc(90,90,39,0,Math.PI*2);p.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;p.beginPath();p.moveTo(90+Math.cos(a)*44,90+Math.sin(a)*44);p.lineTo(90+Math.cos(a)*58,90+Math.sin(a)*58);p.stroke();}p.fillStyle="#2a1d18";p.beginPath();p.arc(90,90,14,0,Math.PI*2);p.fill();return;
  }
  if(speaker==="阿砚"){
    p.fillStyle="#173036";p.beginPath();p.moveTo(32,180);p.quadraticCurveTo(38,116,90,112);p.quadraticCurveTo(145,116,151,180);p.fill();p.fillStyle="#d9c4a4";p.strokeStyle="#211b18";p.lineWidth=4;p.beginPath();p.ellipse(90,79,39,47,0,0,Math.PI*2);p.fill();p.stroke();p.fillStyle="#151819";p.beginPath();p.moveTo(50,76);p.quadraticCurveTo(50,22,92,29);p.quadraticCurveTo(139,28,130,83);p.lineTo(118,61);p.quadraticCurveTo(85,48,54,68);p.closePath();p.fill();p.beginPath();p.moveTo(123,48);p.quadraticCurveTo(151,77,124,118);p.lineTo(113,101);p.closePath();p.fill();p.strokeStyle="#29221e";p.lineWidth=4;const tense=/不|死|师父|怎么/.test(text);p.beginPath();p.moveTo(66,78+(tense?3:0));p.lineTo(80,76-(tense?3:0));p.moveTo(101,76-(tense?3:0));p.lineTo(115,78+(tense?3:0));p.stroke();p.fillStyle="#29221e";p.beginPath();p.arc(74,85,4,0,Math.PI*2);p.arc(107,85,4,0,Math.PI*2);p.fill();p.strokeStyle="#7f3b32";p.lineWidth=3;p.beginPath();if(tense){p.moveTo(80,105);p.lineTo(101,105);}else p.arc(90,98,12,.25,Math.PI-.25);p.stroke();p.strokeStyle="#b74237";p.lineWidth=9;p.beginPath();p.moveTo(47,127);p.quadraticCurveTo(90,142,134,127);p.stroke();
  }else if(speaker==="百口灯妖"){
    p.fillStyle="#bd9966";p.strokeStyle="#2b1718";p.lineWidth=5;p.beginPath();p.moveTo(48,28);p.quadraticCurveTo(90,4,132,28);p.lineTo(144,151);p.quadraticCurveTo(90,178,36,151);p.closePath();p.fill();p.stroke();for(let i=0;i<3;i++){p.fillStyle="#261519";p.beginPath();p.ellipse(60+i*30,65,12,9,0,0,Math.PI*2);p.fill();p.fillStyle="#d7b35f";p.beginPath();p.arc(60+i*30,63,2.5,0,Math.PI*2);p.fill();}p.fillStyle="#190f13";p.beginPath();p.ellipse(90,117,45,25,0,0,Math.PI*2);p.fill();p.strokeStyle="#d34b3c";p.lineWidth=5;for(let x=59;x<126;x+=11){p.beginPath();p.moveTo(x,107);p.lineTo(x+4,128);p.stroke();}
  }else if(speaker==="无名客"){
    p.fillStyle="#101a1d";p.beginPath();p.moveTo(28,180);p.quadraticCurveTo(40,105,90,103);p.quadraticCurveTo(145,105,155,180);p.fill();p.fillStyle="#d9d0ba";p.strokeStyle="#2a2220";p.lineWidth=5;p.beginPath();p.moveTo(53,37);p.quadraticCurveTo(90,12,127,37);p.lineTo(118,117);p.quadraticCurveTo(90,142,62,117);p.closePath();p.fill();p.stroke();p.fillStyle="#1c1817";p.beginPath();p.ellipse(73,72,8,4,-.2,0,Math.PI*2);p.ellipse(107,72,8,4,.2,0,Math.PI*2);p.fill();p.strokeStyle="#a43d34";p.lineWidth=4;p.beginPath();p.moveTo(74,103);p.quadraticCurveTo(90,91,106,103);p.stroke();
  }else{
    const g=p.createRadialGradient(90,82,3,90,82,65);g.addColorStop(0,"#ffd57a");g.addColorStop(.4,"#b74333");g.addColorStop(1,"#301818");p.fillStyle=g;p.beginPath();p.arc(90,82,55,0,Math.PI*2);p.fill();p.fillStyle="#e2c993";p.font="700 52px serif";p.textAlign="center";p.fillText("柒",90,101);p.strokeStyle="#b89b69";p.lineWidth=4;p.beginPath();p.moveTo(90,137);p.lineTo(90,174);p.stroke();
  }
}

function normalizeAngle(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
function playerLanternAnchor(){
  // Anchor the gameplay light to the lantern painted in Ayan's current body
  // sprite, not to the centre of the logical hurtbox.  The official character
  // art is much taller than the 72px collider, so using player.y+34 made the
  // cone visibly emerge from Ayan's chest.
  const footY=player.y+player.h+6;
  const moving=player.grounded&&Math.abs(player.vx)>25;
  if(!player.grounded)return {x:player.x+20+player.facing*69,y:footY-90};
  if(player.attack)return {x:player.x+20+player.facing*43,y:footY-66};
  if(player.lampHeld&&world.lamp.focused&&!moving)return {x:player.x+20+player.facing*40,y:footY-105};
  if(moving)return {x:player.x+20+player.facing*48,y:footY-62};
  return {x:player.x+20+player.facing*46,y:footY-59};
}
function lampPose(){
  const held=world.lampAcquired||player.lampHeld||world.lamp.held;
  const base=(held?player.facing:world.lamp.facing)>0?0:Math.PI;
  const anchor=held?playerLanternAnchor():{x:world.lamp.x,y:world.lamp.y};
  return {x:anchor.x,y:anchor.y,angle:base+world.lamp.angle};
}
function lampHitsPoint(px,py,range=330){
  if(!world.lamp.lit||!world.lamp.focused||!world.lampAcquired)return false;
  const p=lampPose(),dx=px-p.x,dy=py-p.y,d=Math.hypot(dx,dy);if(d>range)return false;
  const diff=Math.abs(normalizeAngle(Math.atan2(dy,dx)-p.angle));
  return d<56||diff<.56;
}
function setLampHeld(held){
  player.lampHeld=held;world.lamp.held=held;
  if(held){ world.lampAcquired=true;world.lamp.focused=true;world.lamp.angle=0;world.lamp.facing=player.facing;world.lamp.lit=true; }
  else {
    world.lamp.x=player.x+20+player.facing*28;
    const footY=player.y+player.h;
    const ground=getGroundAt(world.lamp.x,footY-18,140)||getPrimaryGroundAt(world.lamp.x);
    // world.lamp.y is the light/beam origin; the rendered lamp bottom is y+62.
    world.lamp.groundY=ground?.y??footY;
    world.lamp.y=world.lamp.groundY-62;
    world.lamp.focused=false;world.lamp.angle=0;world.lamp.facing=player.facing;
  }
}
function setLampFocused(focused){
  if(!world.lampAcquired||!player.lampHeld)return false;
  world.lamp.focused=!!focused;world.lamp.held=true;world.lamp.lit=true;world.lamp.facing=player.facing;
  if(world.lamp.focused)world.lamp.angle=0;
  return true;
}
function lampIsFocused(){return !!(world.lampAcquired&&player.lampHeld&&world.lamp.focused);}
function lampBeamReach(maxLen=330){
  if(!world.lamp.lit||!world.lamp.focused||!world.lampAcquired)return maxLen;
  const p=lampPose(),walls=getBlockingWalls(),step=12;
  for(let d=24;d<=maxLen;d+=step){
    const sx=p.x+Math.cos(p.angle)*d,sy=p.y+Math.sin(p.angle)*d;
    if(walls.some(w=>sx>=w.x&&sx<=w.x+w.w&&sy>=w.y&&sy<=w.y+w.h))return Math.max(48,d-step);
  }
  return maxLen;
}
function shadowExposed(e){ return e.type!=="shadow" || (e.fixedTimer>0) || (e.exposed&&lampHitsPoint(e.x+e.w/2,e.y+e.h*.48)); }
function enemyToolState(e){
  const revealed=e.type!=="shadow"||e.fixedTimer>0||!!e.exposed;
  return {revealed,bindable:e.type==="shadow"&&revealed,cuttable:(e.type==="paper"&&!!e.brittle)||(e.type==="elite"&&!e.lampFed)};
}
function enemyLampDamageScale(e){
  if(e.type==="shadow")return shadowExposed(e)?1:0;
  if(e.type==="paper")return e.brittle?1.5:.58;
  if(e.type==="elite")return e.lampFed?.22:1.22;
  return 1;
}


function resetEnemyForRespawn(e){
  e.alive=true;e.dying=false;e.deathTimer=0;e.deathTotal=0;e.hp=e.maxHp;e.vx=0;e.vy=0;e.hurt=0;e.windup=0;e.attackDidHit=false;
  e.exposed=false;e.exposeTimer=0;e.fixedTimer=0;e.bindTimer=0;e.brittle=false;e.brittleTimer=0;e.lampFed=false;e.lampFeedTimer=0;e.feedPulse=0;e.starvePulse=0;
  e.windupTotal=0;e.attackActiveTotal=0;e.recoveryTotal=0;
  e.aiState="IDLE";e.stateTimer=.2;e.attackTimer=.45;e.stuckTimer=0;
  const preferred=e.lastValidGroundPosition?.groundY??null;
  window.Motion?.resetEnemyMotion?.(e);
  if(!snapEntityToGround(e,false,preferred)){
    (window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[])).push(`enemy-respawn-no-ground:${e.type}@${Math.round(e.x)}`);
    e.alive=false;
  }
}
function resetBossEncounterAfterDeath(){
  if(!world.bossActive||world.bossDefeated)return false;
  // The arena entrance barrier is derived from bossActive. If we respawn the
  // player outside while leaving this true, the player is permanently locked
  // out of the arena. A failed attempt therefore ends the current encounter
  // completely; crossing the arena threshold will call beginBoss() again.
  world.bossActive=false;
  world.boss=null;
  world.projectiles.length=0;
  world.fields.length=0;
  world.spriteFx.length=0;
  hitStop=0;impactFlash=0;shake=Math.min(shake,3);
  return true;
}
function beginPaperDeath(){
  player.dead=true;player.deathPhase='collapse';player.deathVisualTimer=0;player.deathTimer=1.95;
  player.vx=0;player.vy=0;player.charging=false;player.chargeLevel=0;
  world.paperDeathFx=[];
  for(let i=0;i<30;i++){
    world.paperDeathFx.push({
      x:player.x+player.w*.5+(Math.random()-.5)*26,
      y:player.y+player.h*.45+(Math.random()-.5)*58,
      vx:(Math.random()-.5)*210,vy:-40-Math.random()*180,
      rot:Math.random()*Math.PI*2,vr:(Math.random()-.5)*12,
      w:6+Math.random()*10,h:3+Math.random()*5
    });
  }
}
function updatePaperDeath(dt){
  if(!player.dead)return;
  player.deathVisualTimer=(player.deathVisualTimer||0)+dt;
  const t=player.deathVisualTimer,targetX=player.checkpointX+player.w*.5,targetY=player.checkpointY+player.h*.42;
  if(t<.42)player.deathPhase='collapse';
  else if(t<.76)player.deathPhase='scatter';
  else if(t<1.28)player.deathPhase='return';
  else if(t<1.95)player.deathPhase='gather';
  for(const f of world.paperDeathFx){
    if(player.deathPhase==='collapse'){
      // Hold fragments inside the paper body until the collapse animation finishes.
      f.x=lerp(f.x,player.x+player.w*.5,clamp(dt*10,0,1));
      f.y=lerp(f.y,player.y+player.h*.48,clamp(dt*10,0,1));
    }else if(player.deathPhase==='scatter'){
      f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=220*dt;f.vx*=.992;
    }else{
      const strength=player.deathPhase==='return'?4.8:9.5;
      f.vx+=(targetX-f.x)*strength*dt;f.vy+=(targetY-f.y)*strength*dt;
      f.vx*=Math.pow(.15,dt);f.vy*=Math.pow(.15,dt);
      f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(player.deathPhase==='gather'){
        const k=clamp(dt*7.5,0,1);f.x=lerp(f.x,targetX,k);f.y=lerp(f.y,targetY,k);
      }
    }
    f.rot+=f.vr*dt;
  }
  player.deathTimer=Math.max(0,1.95-t);
  if(t>=1.95)respawn();
}
function drawPaperDeathFx(){
  if(!player.dead||player.deathPhase==='collapse'||!world.paperDeathFx?.length)return;
  ctx.save();ctx.translate(-cameraX,0);
  const gather=player.deathPhase==='gather';
  for(const f of world.paperDeathFx){
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.globalAlpha=gather?.72:.92;
    ctx.fillStyle='#d8c7a1';ctx.strokeStyle='rgba(84,57,39,.65)';ctx.lineWidth=.8;
    ctx.fillRect(-f.w/2,-f.h/2,f.w,f.h);ctx.strokeRect(-f.w/2,-f.h/2,f.w,f.h);ctx.restore();
  }
  ctx.restore();
}
function respawn(){
  const hadLamp=!!world.lampAcquired,wasFocused=!!world.lamp.focused;
  const bossAttemptReset=resetBossEncounterAfterDeath();
  player.dead=false;player.deathPhase='idle';player.deathVisualTimer=0;world.paperDeathFx=[]; player.health=player.maxHealth; player.x=player.checkpointX; player.y=player.checkpointY; player.vx=player.vy=0;
  // Checkpoints store a desired position, but the actual respawn must always be reconciled with the current collision world.
  if(!snapEntityToGround(player,true,player.checkpointY+player.h)){
    const fallback=getPrimaryGroundAt(player.x+player.w*.5);
    if(fallback){player.y=fallback.y-player.h;player.grounded=true;player.groundY=fallback.y;player.currentGroundId=fallback.id;}
  }
  player.checkpointY=player.y;
  player.weapon=world.ritualBladeUnlocked?weaponDef("ritual"):weaponDef("ruler");
  if(hadLamp){player.lampHeld=true;world.lamp.held=true;world.lampAcquired=true;world.lamp.focused=wasFocused;world.lamp.facing=player.facing;}
  else {player.lampHeld=false;world.lamp.held=false;world.lamp.focused=false;}
  player.invuln=1.4; cameraX=clamp(player.x-W*.35,0,world.width-W);resetCameraRuntime();
  world.projectiles=[];world.fields=[];
  player.attack=null;player.attackCooldown=0;player.attackBuffer=0;player.attackBufferHeld=0;player.combo=0;player.lastAttack=0;
  player.charging=false;player.chargeLevel=0;player.chargeCue=0;player.dodging=0;player.dodgeDirection=-player.facing;player.hurtTimer=0;player.paperHurtFlash=0;
  pressed.clear();released.clear();for(const k of Object.keys(keys))keys[k]=false;jHoldStart=0;lHoldStart=0;lReleasedDuration=0;
  hitStop=0;impactFlash=0;cameraKickX=0;cameraKickY=0;impactSpot.life=0;routeHintIdle=0;
  for(const e of world.enemies){ if(!e.alive && Math.abs(e.x-player.x)<1000 && e.id!=="guardian") resetEnemyForRespawn(e); }
  if(bossAttemptReset){
    dialogueQueue=[];currentDialogue=null;dialogueEl.classList.remove("visible");
    showGuidance("封印暂退","封印已退。向右越过封桥即可重新挑战。","Boss 满血重开",3.8);
  }else showToast("纸身在灯火中重新拼合");
}

function damagePlayer(amount,dir=0){
  if(player.invuln>0||player.dodging>0||player.dead) return;
  const mult=difficultyValues[difficulty].enemyDamage;
  player.vx=dir*190; player.vy=-170; player.charging=false;player.chargeLevel=0;sound.hurt(); shake=10; hitStop=.045;
  player.health=clamp(player.health-amount*mult,0,player.maxHealth); player.invuln=.8; player.hurtTimer=.22;
  kickCamera((dir||-player.facing)*9,-5);registerImpact(player.x+player.w*.5,player.y+player.h*.42,"#e6c7a2",1.2);
  createDirectionalBurst(player.x+player.w*.5,player.y+player.h*.42,"#d8c39d",7,-(dir||player.facing),.9);
  spawnPaperDamageFx(player.x+player.w*.5,player.y+player.h*.42,11);
  player.paperHurtFlash=.34;
  if(player.health<=0){ player.health=0; beginPaperDeath(); sound.play("player_death",{volume:.58}); }
}

function weaponDef(type="ruler"){
  if(type==="ritual")return {name:"戏魂祭刃",damage:19,range:72,cooldown:.20,color:"#d86148",style:"blade",type:"ritual",comboMax:4};
  return {name:"裁魂尺",damage:16,range:78,cooldown:.30,color:"#c29a55",style:"ruler",type:"ruler",comboMax:3};
}
function giveWeapon(type="ruler"){
  player.weapon=weaponDef(type);
  if(type==="ritual")world.ritualBladeUnlocked=true;
  sound.pickup();showToast(type==="ritual"?"取得戏魂祭刃：四段疾斩、突进穿刺，蓄力可断纸身":"裁魂尺已经在手中");saveGame();
}

function startAttack(chargeInput=false){
  const held=typeof chargeInput==="number"?chargeInput:(chargeInput?700:0);
  if(player.dead||currentDialogue)return;
  if(player.attack||player.attackCooldown>0||!player.grounded){
    if(player.grounded&&!player.attack){
      player.attackBuffer=Math.max(player.attackBuffer||0,.16);
      player.attackBufferHeld=held;
    }
    return;
  }
  player.attackBuffer=0;player.attackBufferHeld=0;
  const tier=held>=800?2:held>=430?1:0, charged=tier>0;
  const now=gameTime,def=player.weapon||weaponDef(),ritual=def.type==="ritual";
  const comboWindow=ritual?.58:.45,comboMax=ritual?4:3;
  if(now-player.lastAttack<comboWindow)player.combo=player.combo>=comboMax?1:player.combo+1;else player.combo=1;
  player.lastAttack=now;

  if(ritual){
    if(charged){
      player.attack={time:0,total:tier===2?.42:.33,damage:tier===2?38:28,range:tier===2?132:112,hit:new Set(),charged:true,tier,kind:"ritual-dash",color:def.color,type:def.type,style:def.style,step:player.combo,dashSpeed:tier===2?355:285,piercePaper:true,knockback:tier===2?330:270};
      player.attackCooldown=tier===2?.58:.42;shake=tier===2?10:6;createBurst(player.x+20,player.y+38,"#d86148",tier===2?12:7);
    }else{
      const profiles=[
        {total:.18,damage:13,range:64,dashSpeed:175,kind:"ritual-slash",knockback:90},
        {total:.20,damage:14,range:76,dashSpeed:125,kind:"ritual-reverse",knockback:105},
        {total:.23,damage:17,range:112,dashSpeed:255,kind:"ritual-thrust",knockback:125},
        {total:.30,damage:23,range:90,dashSpeed:95,kind:"ritual-finish",knockback:245}
      ],pr=profiles[player.combo-1]||profiles[0];
      player.attack={time:0,total:pr.total,damage:pr.damage,range:pr.range,hit:new Set(),charged:false,tier:0,kind:pr.kind,color:def.color,type:def.type,style:def.style,step:player.combo,dashSpeed:pr.dashSpeed,piercePaper:true,knockback:pr.knockback};
      player.attackCooldown=player.combo===4?.28:def.cooldown;
    }
    sound.attack(charged?2:Math.min(3,player.combo));
    return;
  }

  const range=charged?(tier===2?def.range+34:def.range+18):def.range+6;
  const rulerProfiles=[
    {total:.24,dashSpeed:18, knockback:105,hitStop:.040,shake:3.5,impact:.050},
    {total:.27,dashSpeed:62, knockback:135,hitStop:.047,shake:5.0,impact:.065},
    {total:.34,dashSpeed:190,knockback:205,hitStop:.058,shake:7.2,impact:.082}
  ];
  const rp=rulerProfiles[player.combo-1]||rulerProfiles[0];
  player.attack={time:0,total:charged?(tier===2 ? .48 : .36):rp.total,damage:charged?(tier===2?30:22):14,range,hit:new Set(),charged,tier,kind:"ground",color:def.color,type:def.type,style:def.style,step:player.combo,knockback:charged?260:rp.knockback,dashSpeed:charged?0:rp.dashSpeed,hitStop:charged?.07:rp.hitStop,shake:charged?(tier===2?10:6):rp.shake,impact:charged?(tier===2?.13:.09):rp.impact};
  player.attackCooldown=charged?(tier===2 ? .62 : .44):(player.combo===3 ? .36 : def.cooldown);sound.attack(charged?2:player.combo);
  if(charged){shake=tier===2?10:6;createBurst(player.x+20,player.y+38,tier===2?"#e4b75b":"#bf6046",tier===2?10:5);}
}

function attackBox(){
  const a=player.attack,range=a.range;
  if(a.type==="ritual"&&a.kind==="ritual-thrust")return {x:player.facing>0?player.x+player.w-8:player.x-range+8,y:player.y+20,w:range,h:Math.max(30,player.h-30)};
  if(a.type==="ritual"&&a.kind==="ritual-finish")return {x:player.facing>0?player.x+player.w-12:player.x-range+12,y:player.y+2,w:range,h:player.h+8};
  return {x:player.facing>0?player.x+player.w-4:player.x-range+4,y:player.y+8,w:range,h:player.h-5};
}

function spawnSpriteFx(key,x,y,height=80,life=.22,flip=false){
  if(world.spriteFx.length>=MAX_SPRITE_FX)world.spriteFx.shift();
  world.spriteFx.push({key,x,y,height,life,max:life,flip});
}

function processAttack(){
  const a=player.attack; if(!a) return;
  const active=a.time/a.total>=.3&&a.time/a.total<=.65; if(!active) return;
  const box=attackBox();
  for(const e of world.enemies){
    if(!e.alive||e.inactive||a.hit.has(e)||!rectsOverlap(box,e)) continue;
    if(!shadowExposed(e)){
      // A failed strike is still a real physical event: the ruler passes
      // through the ink-shadow instead of feeling like a broken hitbox.
      a.hit.add(e);
      const hx=e.x+e.w*.5,hy=e.y+e.h*.5;
      world.floaters.push({x:hx,y:e.y-8,text:"未照实 · 穿透",life:.72,max:.72,vy:-22,color:"#9fb8ba"});
      createBurst(hx,hy,"#718b91",5);spawnSpriteFx("vfxShadow",hx,hy+10,88,.18,player.facing<0);
      hitStop=Math.max(hitStop,.018);shake=Math.max(shake,1.8);
      window.AudioManager?.play('shadow_phase_through',{volume:.46});
      if(!world.combatHintShown){world.combatHintShown=true;showToast(lampIsFocused()?"裁魂尺穿过了影子——用 W / S 把光束真正照到它身上":"裁魂尺穿过了影子——先按 Q 举起引路灯");}
      continue;
    }
    const toolState=enemyToolState(e);
    let damage=a.damage,feedbackColor=a.charged?"#ffd68b":"#e6d2aa";
    if(e.type==="paper"){
      if(a.type==="ritual"&&toolState.cuttable){damage*=1.65;feedbackColor="#ef8a6f";}
      else if(a.type==="ritual"&&a.piercePaper){damage*=1.08;feedbackColor="#d97861";}
      else if(e.brittle){damage*=1.5;feedbackColor="#ffe1a0";}
      else {damage*=.58;if(!e.paperHintShown){e.paperHintShown=true;showToast("纸怪的外皮把力道卸开了——先用灯把纸缝照脆，或换戏魂祭刃切开纸身");}}
    }else if(e.type==="elite"){
      if(e.lampFed){damage*=.22;feedbackColor="#d28b5e";if(!e.feedHintShown){e.feedHintShown=true;showToast("持灯妖正在吞你的光。把灯移开，等胸口灯核暗下去再打");}}
      else if(a.type==="ritual"&&toolState.cuttable){damage*=1.35;feedbackColor="#d58d78";}
      else {damage*=1.22;feedbackColor="#bfe0d8";}
    }
    if(a.type==="ruler"&&a.charged&&toolState.bindable){
      e.bindTimer=Math.max(e.bindTimer||0,1.15);e.vx=0;feedbackColor="#b8d8d1";
      showToast("裁魂尺压住了已经照实的影子",1.35);
    }
    a.hit.add(e);e.hp-=damage;e.hurt=.18;e.vx=player.facing*(a.knockback||(a.charged?260:135));
    if(a.type==="ritual"&&toolState.cuttable){world.tutorialFlags.ritualCutLearned=true;window.AudioManager?.play('ritual_cut_paper',{volume:.58});}
    else if(a.type==="ruler")window.AudioManager?.play('ruler_hit');
    shake=Math.max(shake,a.charged?8:(a.shake||4)*.8);hitStop=Math.max(hitStop,a.charged?.07:(a.hitStop||.04));impactFlash=Math.max(impactFlash,a.charged?.10:(a.impact||.05));
    const hitX=e.x+e.w/2,hitY=e.y+e.h*.52;
    kickCamera(player.facing*(a.charged?7:3),a.charged?-2.4:-1);registerImpact(hitX,hitY,feedbackColor,a.charged?1.5:1);
    createDirectionalBurst(hitX,hitY,feedbackColor,a.charged?10:6,player.facing,a.charged?1.2:.85);
    world.floaters.push({x:e.x+e.w/2,y:e.y-6,text:`${Math.round(damage)}`,life:.72,max:.72,vy:-34,color:feedbackColor});
    createBurst(hitX,hitY,feedbackColor,a.charged?6:4);spawnSpriteFx("vfxImpact",e.x+e.w/2,e.y+e.h*.65,a.charged?92:68,.18,player.facing<0);
    if(e.hp<=0) killEnemy(e);
  }
  const bossHurtbox=getBossHurtbox(world.boss);
  if(world.bossActive&&world.boss&&!world.bossDefeated&&world.boss.phaseTransition<=0&&!a.hit.has(world.boss)&&bossHurtbox&&rectsOverlap(box,bossHurtbox)){
    if(world.boss.voiceTrial){
      a.hit.add(world.boss);sound.play("shadow_phase_through",{volume:.30});
      const hx=bossHurtbox.x+bossHurtbox.w*.5,hy=bossHurtbox.y+bossHurtbox.h*.50;
      world.floaters.push({x:hx,y:bossHurtbox.y+24,text:"无实体",life:.82,max:.82,vy:-24,color:"#b7c6c7"});
      createBurst(hx,hy,"#7d9da0",7);spawnSpriteFx("vfxShadow",hx,hy+20,96,.18,player.facing<0);
      if(!world.boss.voiceHitHint){
        world.boss.voiceHitHint=true;
        showGuidance("裁魂尺穿过去了","此时只是声音投出的虚相，刀尺无效。用灯找出真正叫『阿砚』的那张嘴。",player.lampHeld?"W / S 扫描三张嘴":"Q 举灯　W / S 扫描",4.8);
      }
      return;
    }
    a.hit.add(world.boss); world.boss.hp-=a.damage; world.boss.hurt=.16; sound.bossHit(!!a.charged);
    bossNarrativeBeat(world.boss,"first_hit","“阿砚。”");
    hitStop=Math.max(hitStop,a.charged ? .075 : .045);shake=Math.max(shake,a.charged?9:6);impactFlash=Math.max(impactFlash,a.charged ? .10 : .065);
    const hx=bossHurtbox.x+bossHurtbox.w*.5,hy=bossHurtbox.y+bossHurtbox.h*.55;
    kickCamera(player.facing*(a.charged?9:5),a.charged?-3:-1.5);registerImpact(hx,hy,a.charged?"#f0b85b":"#d06a4b",a.charged?1.8:1.2);
    createDirectionalBurst(hx,hy,a.charged?"#f0b85b":"#d06a4b",a.charged?12:7,player.facing,a.charged?1.3:1);
    world.floaters.push({x:hx,y:bossHurtbox.y+18,text:`${Math.round(a.damage)}`,life:.72,max:.72,vy:-34,color:"#ffd08a"});
    createBurst(hx,hy,a.charged?"#f0b85b":"#b84031",a.charged?7:4);spawnSpriteFx("vfxImpact",hx,hy+22,a.charged?112:86,.2,player.facing<0);
    if(world.boss.hp<=0) defeatBoss();
  }
  for(const s of world.switches){
    const sr={x:s.x-28,y:s.y-38,w:56,h:76};
    if(!s.lit&&rectsOverlap(box,sr)&&!a.hit.has(s)){ a.hit.add(s); strikeSwitch(s); }
  }
  if(world.wallHp>0){
    const wall={x:4385,y:470,w:45,h:140};
    if(rectsOverlap(box,wall)&&!a.hit.has("cracked-wall")){
      a.hit.add("cracked-wall");
      if(a.charged){
        world.wallHp--; shake=12; createBurst(4405,540,"#81786d",12);spawnSpriteFx("vfxImpact",4405,570,88,.22,player.facing<0);
        if(world.wallHp===0) showToast("旧砖墙轰然坍塌，露出被藏起的灯芯火");
        else showToast("砖缝继续崩裂");
      } else showToast("普通挥击撼不动这面旧墙——试试蓄力攻击");
    }
  }
}

function killEnemy(e){
  if(!e||e.dying||!e.alive)return;
  e.alive=false;e.dying=true;e.aiState="DEAD";e.vx=0;e.vy=0;e.attackDidHit=true;
  e.deathTotal=e.type==="shadow"?.72:e.type==="elite"?.78:.68;
  e.deathTimer=e.deathTotal;
  createBurst(e.x+e.w/2,e.y+e.h/2,"#202c31",8);
  // When the last nearby threat falls, give the room a short exhale instead of
  // snapping directly back to traversal. This is a world beat, not a new UI state.
  const nearbyThreat=world.enemies.some(other=>other!==e&&other.alive&&!other.inactive&&Math.abs((other.x+other.w*.5)-(e.x+e.w*.5))<620);
  if(!nearbyThreat&&!world.bossActive){
    world.combatReleaseTimer=.80;world.combatReleaseX=e.x+e.w*.5;world.lamp.stable=Math.max(world.lamp.stable,.76);hitStop=Math.max(hitStop,.052);
  }
  if(e.first){world.firstShadowDefeated=true;world.embers[0].visible=true;showGuidance("影子退开了","它不是被杀死的，只是暂时回到了灯照不到的地方","靠近灯芯火　E 取得",6);}
}

function strikeSwitch(s){
  const order=[1,0,2];
  if(s.id===order[world.puzzleStep]){
    s.lit=true; world.puzzleStep++; sound.lantern();
    if(world.puzzleStep===3){ world.embers[2].visible=true; showToast("三盏无声灯同时亮起"); }
    else showToast("刻痕与灯影吻合——继续按笔画从少到多");
  }else{
    world.puzzleStep=0; for(const sw of world.switches) sw.lit=false; sound.play("puzzle_wrong",{volume:.38}); showToast("顺序不对。看墙上的一、二、三道刻痕，从笔画最少的灯开始");
  }
}

function createBurst(x,y,color,count=10){
  const room=Math.max(0,MAX_PARTICLES-world.particles.length);
  count=Math.min(count,room);
  for(let i=0;i<count;i++) world.particles.push({x,y,vx:rand(-170,170),vy:rand(-210,60),life:rand(.25,.65),max:.65,color,size:rand(2,7)});
}
function createDirectionalBurst(x,y,color,count=6,dir=1,power=1){
  const room=Math.max(0,MAX_PARTICLES-world.particles.length);count=Math.min(count,room);
  for(let i=0;i<count;i++){
    const life=rand(.12,.26);
    world.particles.push({x,y,type:"spark",vx:dir*rand(90,220)*power+rand(-45,45),vy:rand(-130,80)*power,life,max:life,color,size:rand(1.4,3.4)});
  }
}
function kickCamera(x=0,y=0){
  cameraKickX=clamp(cameraKickX+x,-18,18);cameraKickY=clamp(cameraKickY+y,-14,14);
}
function registerImpact(x,y,color="#ffe2ad",power=1){
  const max=.13+Math.min(.08,power*.025);impactSpot={x,y,color,power,life:max,max};
}

function showLampRaiseTutorialIfNeeded(title="影子先于身体",text="按 Q 举灯，再用 W / S 调整光束；影子凝实后用 J 击退"){
  if(world.tutorialFlags?.lampRaisedOnce)return false;
  showGuidance(title,text,"Q 举灯　W / S 调光　J 攻击",5.2);return true;
}
function triggerClueReaction(id,kind){
  if(!id||world.clueReactionSeen?.[id])return false;
  if(!world.clueReactionSeen)world.clueReactionSeen=Object.create(null);
  world.clueReactionSeen[id]=true;
  world.clueReaction={active:true,timer:.85,id,kind};
  player.vx=0;
  world.lamp.stable=clamp(world.lamp.stable-.08,0,1);
  return true;
}
function drawClueReactionOverlay(){
  const r=world.clueReaction;if(!r?.active||r.timer<=0)return;
  const a=clamp(r.timer/.85,0,1),pulse=Math.sin((.85-r.timer)*Math.PI*4)*.5+.5;
  ctx.save();ctx.fillStyle=`rgba(17,20,20,${.08+.10*a})`;ctx.fillRect(0,0,W,H);
  const lp=lampPose();glow(lp.x-cameraX,lp.y,32+14*pulse,"#ffd37b",.08+.16*a);ctx.restore();
}
function interact(){
  routeHintIdle=0;
  if(currentDialogue){ nextDialogue(); return; }
  const t=player.interactTarget; if(!t) return;
  if(t.kind==="lore"){
    t.obj.seen=true; if(t.obj.critical){world.noteFound=true; saveGame();}
    if(t.obj.id==="photo_age7")triggerClueReaction("photo_age7","photo");
    if(t.obj.id==="burned_note")triggerClueReaction("burned_note","master-note");
    queueDialogue(t.obj.title,t.obj.text);
  } else if(t.kind==="door"){
    if(world.noteFound){world.doorOpen=true; sound.seal(); showToast("封纸自行燃尽，纸扎铺的门缓缓打开");showGuidance("踏入雨巷","门外的影子已经不再属于它们的主人","向右前进",4);}
    else {showToast("封纸没有反应——回到左侧桌案，查看红光标记的烧焦纸条",4);showGuidance("门被封住了","师父的烧焦纸条就在左侧桌案上，红色灯火正在指引你","← 向左返回　E 调查",6);}
  } else if(t.kind==="checkpoint"){
    t.obj.lit=true; player.checkpointX=t.obj.x; const checkpointGround=getPrimaryGroundAt(t.obj.x); player.checkpointY=checkpointGround?checkpointGround.y-player.h:player.y; player.health=player.maxHealth; saveGame(); sound.lantern(); showToast("存档灯已点亮，灯火恢复了纸身");
    if(["opera","bamboo","ferry","city","final"].includes(world.currentRegion))showGuidance("灯火记住了当前线索",chapterObjective(world.currentRegion),"",4.2);
  } else if(t.kind==="lamp"){
    setLampHeld(true); sound.pickup(); showGuidance("引路灯苏醒","Q 切换举灯 / 收灯；举灯后用 W / S 调整照射方向","Q 举灯 / 收灯　W / S 调整",5); showToast("引路灯回应了你");
  } else if(t.kind==="drop"){
    giveWeapon(t.obj.type||"ruler"); world.drops.splice(world.drops.indexOf(t.obj),1);
  } else if(t.kind==="chapter"){
    handleChapterInteraction(t.obj);
  } else if(t.kind==="ember"){
    t.obj.collected=true; world.emberCount++; sound.lantern(); createBurst(t.obj.x,t.obj.y,"#f1bd5c",20); showToast(`取得灯芯火 ${world.emberCount}/3`);
    if(t.obj.id===0){queueDialogue("阿砚",["灯芯里有水声……像是有人在河底敲门。","我为什么会记得这声音？"]);queueDialogue("无名客",["别把灯举向自己。你会先看见影子。"]);}
    if(world.emberCount>=3){world.gateOpen=true; showToast("三缕灯芯火汇聚，封桥符正在消散",3);}
  } else if(t.kind==="seventh"){
    if(world.endingChoiceActive)return;
    world.endingChoiceActive=true;world.endingChoiceIndex=0;player.vx=0;player.charging=false;player.attack=null;
    sound.lantern("unstable");showToast("第七盏灯没有亮。它在等你决定它接下来代表什么",3.2);
  }
}

const INTERACTION_KIND_PRIORITY={
  memoryToken:6,nameSlip:6,nameReflection:5,debris:5,winch:5,lift:5,
  gong:5,bell:5,graveLantern:5,mirror:5,echo:5,dial:5,nameTablet:5,crystal:5,seal:5,
  clue:4,epitaph:4,emptyGrave:4,npc:2,flavor:2
};
function chapterInteractionPriority(obj){return INTERACTION_KIND_PRIORITY[obj?.kind]||3;}
function chapterInteractionRadius(obj){if(obj?.kind==="npc")return 108;const q=chapterInteractionPriority(obj);return q>=6?164:q>=5?154:q>=4?142:118;}
function chapterInteractionCategory(obj){
  if(!obj)return "调查";
  if(["memoryToken","nameSlip"].includes(obj.kind))return "拾取";
  if(obj.kind==="npc")return "交谈";
  if(["gong","bell","graveLantern","winch","lift","debris","mirror","echo","dial","crystal","seal"].includes(obj.kind))return "操作";
  return "调查";
}
function chapterObjectNeedsAttention(obj,p){
  if(!obj||!p)return false;
  if(obj.id==="bamboo_pool"&&(p.tuned||[]).length===3&&!p.reflectionSealed)return true;
  if(obj.kind==="clue")return !(p.clues||[]).includes(obj.id)&&!(obj.id==="final_inscription"&&p.inscription);
  if(obj.kind==="epitaph")return !(p.epitaphs||[]).includes(obj.index);
  if(obj.kind==="memoryToken"||obj.kind==="nameSlip"||obj.kind==="nameReflection"||obj.kind==="debris")return true;
  if(obj.kind==="gong")return !p.solved;
  if(obj.kind==="bell")return !(p.tuned||[]).includes(obj.index)&&!p.solved;
  if(obj.kind==="graveLantern")return (p.assignments||[])[obj.index]===null&&!p.solved;
  if(obj.kind==="lift")return !p.liftRaised||!world.ritualBladeUnlocked;
  if(obj.kind==="winch")return !p.solved;
  if(obj.kind==="emptyGrave")return !p.emptyGraveOpened&&!p.solved;
  if(obj.kind==="mirror")return !p.convergenceStarted||!p.reflectionSeen;
  if(obj.kind==="echo")return p.convergenceStarted&&!p.heardEcho;
  if(obj.kind==="dial")return p.convergenceStarted&&!p.convergenceSolved;
  if(obj.kind==="nameTablet")return p.convergenceStarted&&!p.readName;
  if(obj.kind==="crystal")return !p.convergenceSolved;
  if(obj.kind==="seal")return !p.solved;
  if(obj.kind==="npc")return false;
  return false;
}
function chapterInteractionAnchor(obj){
  const pt=chapterObjectPoint(obj);
  let y=pt.y-35;
  if(obj.kind==="npc") y=pt.y-82;
  else if(obj.kind==="bell") y=488;
  else if(obj.kind==="gong") y=492;
  else if(obj.kind==="graveLantern") y=506;
  else if(obj.kind==="epitaph"||obj.kind==="emptyGrave"||obj.kind==="nameTablet") y=493;
  else if(obj.kind==="memoryToken"||obj.kind==="nameSlip") y=obj.y-35;
  else if(obj.kind==="nameReflection") y=548;
  else if(obj.kind==="mirror"||obj.kind==="dial"||obj.kind==="crystal"||obj.kind==="seal") y=486;
  return {x:pt.x+(obj.anchorDx||0),y:y+(obj.anchorDy||0)};
}
function interactionAnchor(target){
  if(!target)return null;
  if(target.kind==="lamp")return {x:world.lamp.x,y:world.lamp.y-28};
  if(target.kind==="door")return {x:1015,y:475};
  if(target.kind==="checkpoint")return {x:target.obj.x,y:target.obj.y+8};
  if(target.kind==="drop")return {x:target.obj.x+18,y:target.obj.y-8};
  if(target.kind==="ember")return {x:target.obj.x,y:target.obj.y-16};
  if(target.kind==="lore")return {x:target.obj.x+target.obj.w/2,y:target.obj.y-18};
  if(target.kind==="seventh")return {x:19320,y:490};
  if(target.kind==="chapter")return chapterInteractionAnchor(target.obj);
  return null;
}
function interactionClass(t){
  if(!t)return 'lore';
  if(t.kind==='drop'||t.kind==='ember')return 'pickup';
  if(t.kind==='npc'||t.obj?.kind==='npc')return 'npc';
  if(t.kind==='lore')return t.obj?.critical?'critical':'lore';
  if(t.kind==='chapter'){
    const k=t.obj?.kind;
    if(['nameSlip','memoryToken'].includes(k))return 'pickup';
    if(['operaClue','bambooClue','epitaph','manifest','inscription'].includes(k))return 'story';
    return 'critical';
  }
  if(t.kind==='checkpoint')return 'story';
  if(['lamp','door','seventh'].includes(t.kind))return 'critical';
  return 'story';
}
function interactionVisualStyle(t){
  const cls=interactionClass(t);
  if(cls==='pickup'||cls==='critical')return {tone:'cinnabar',fill:'rgba(216,190,131,.94)',stroke:'#8a3029',ink:'#7f2823',glow:'#d86a45'};
  if(cls==='npc')return {tone:'neutral',fill:'rgba(218,208,181,.93)',stroke:'#6f6558',ink:'#49443d',glow:'#d8c69f'};
  if(cls==='lore')return {tone:'lore',fill:'rgba(190,190,174,.91)',stroke:'#8b7851',ink:'#4d4c43',glow:'#c7ad74'};
  return {tone:'story',fill:'rgba(207,197,168,.92)',stroke:'#786448',ink:'#514638',glow:'#d4b77b'};
}
function interactionWeight(t){return {pickup:500,critical:400,story:300,npc:200,lore:100}[interactionClass(t)]||0;}
function interactionTargetId(t){
  if(!t)return '';
  if(t.obj?.id!=null)return String(t.obj.id);
  if(t.kind==='lamp')return 'lamp';if(t.kind==='door')return 'door';if(t.kind==='seventh')return 'seventh';
  if(t.kind==='checkpoint')return `checkpoint:${t.obj?.x}`;if(t.kind==='ember')return `ember:${t.obj?.id}`;if(t.kind==='drop')return `drop:${t.obj?.type}:${Math.round(t.obj?.x||0)}`;
  return t.kind;
}
function findInteraction(){
  if(world.epilogueActive){player.interactTarget=null;player.interactCandidates=[];player.interactIndex=0;return;}
  const px=player.x+player.w/2,py=player.y+player.h/2,previousId=interactionTargetId(player.interactTarget),candidates=[];
  function consider(x,y,target,radius=118,legacyPriority=3){
    const d=Math.hypot(px-x,py-y);if(d>radius)return;
    candidates.push({...target,_distance:d,_legacyPriority:legacyPriority,_id:interactionTargetId(target)});
  }
  if(!world.lampAcquired)consider(world.lamp.x,world.lamp.y,{kind:'lamp'},126,7);
  for(const o of world.lore)consider(o.x+o.w/2,o.y,{kind:'lore',obj:o},112,o.critical?7:2);
  if(!world.doorOpen)consider(1015,520,{kind:'door'},152,6);
  for(const c of world.checkpoints)consider(c.x,c.y+35,{kind:'checkpoint',obj:c},124,3);
  for(const d of world.drops)consider(d.x+18,d.y+17,{kind:'drop',obj:d},146,6);
  for(const e of world.embers){if(e.visible&&!e.collected&&(e.id!==1||world.wallHp<=0))consider(e.x,e.y,{kind:'ember',obj:e},142,6);}
  for(const obj of CHAPTER_INTERACTABLES){
    if(!chapterObjectVisible(obj))continue;
    const a=chapterInteractionAnchor(obj);consider(a.x,a.y,{kind:'chapter',obj},chapterInteractionRadius(obj),chapterInteractionPriority(obj));
  }
  if(world.finalReady&&!world.finalChoice)consider(19320,540,{kind:'seventh'},160,7);
  candidates.sort((a,b)=>interactionWeight(b)-interactionWeight(a)||b._legacyPriority-a._legacyPriority||a._distance-b._distance||String(a._id).localeCompare(String(b._id)));
  player.interactCandidates=candidates;
  let idx=previousId?candidates.findIndex(c=>c._id===previousId):-1;
  if(idx<0)idx=0;player.interactIndex=candidates.length?idx:0;player.interactTarget=candidates[idx]||null;
}
function cycleInteraction(delta){
  const list=player.interactCandidates||[];if(list.length<2)return false;
  player.interactIndex=(player.interactIndex+(delta>0?1:-1)+list.length)%list.length;
  player.interactTarget=list[player.interactIndex];
  world.tutorialFlags.interactSwitchLearned=true;
  return true;
}

function chapterObjectVisible(obj){
  if(world.epilogueActive)return false;
  const p=world.chapterProgress?.[obj.chapter];if(!p)return false;
  if(obj.id==="umbrella_rain")return !p.umbrellaRainGone;
  if(obj.id==="umbrella_ferry")return p.umbrellaRainTalked&&!p.umbrellaFerryGone;
  if(obj.id==="lantern_girl_city")return world.chapterProgress.city.epitaphs.length>=3&&!p.girlCityGone;
  if(obj.kind==="nameSlip"){
    if(p.names.includes(obj.index))return false;
    if(obj.index===1&&!p.reflectionRevealed)return false;
    if(obj.index===2&&!p.debrisCleared)return false;
    return true;
  }
  if(obj.kind==="nameReflection")return !p.reflectionRevealed&&!p.names.includes(1);
  if(obj.kind==="debris")return !p.debrisCleared;
  if(obj.kind==="memoryToken"){
    if(p.epitaphs.length<3||p.solved)return false;
    if(p.carriedMemory===obj.index)return false;
    return !p.assignments.includes(obj.index);
  }
  if(obj.kind==="gong"||obj.kind==="bell"||obj.kind==="graveLantern")return true;
  return true;
}

function addUnique(list,value){if(!list.includes(value))list.push(value);}

function completeChapter(id,dialogue){
  const p=world.chapterProgress[id];if(p.solved)return;
  p.solved=true;world.lanternsRecovered=Math.max(world.lanternsRecovered,CHAPTER_LANTERN_TOTAL[id]||world.lanternsRecovered);
  sound.lantern();shake=12;createBurst(CHAPTER_GATE_X[id]||19100,520,"#f0bf62",30);
  showToast(`引魂灯归位 ${world.lanternsRecovered}/6`,3);
  // Do not stop play to have Ayan explain the solution the player just discovered.
  // The room, sound and lantern change are the chapter-completion narrative beat.
  if(id==="opera"&&!world.ritualBladeUnlocked&&!world.drops.some(d=>d.type==="ritual"))world.drops.push({x:9420,y:366,type:"ritual",bob:1.7});
  if(id==="final")world.finalReady=true;
  // Post-solve quiet window: once a chapter's core mystery is resolved, any
  // leftover encounter in that same region stands down. Backtracking becomes
  // reflection/exploration instead of cleanup combat.
  for(const e of world.enemies){
    if(e.alive&&sceneRegionAt(e.x+e.w*.5).id===id){e.inactive=true;e.vx=0;e.attackTimer=0;}
  }
  saveGame({resumeRegion:id});
}

function sequenceStep(chapter,index,expected,onSolved){
  const p=world.chapterProgress[chapter];
  p.sequence.push(index);
  const pos=p.sequence.length-1;
  if(index!==expected[pos]){
    p.sequence=[];p.wrongAttempts=(p.wrongAttempts||0)+1;sound.play("puzzle_wrong",{volume:.38});
    if(chapter==="opera"){
      showToast(p.wrongAttempts===1?"幕后一阵脚步倒着退回去——三张脸的位置被重新打乱":"戏台上的纸脸同时转向你，顺序仍不对");
      if(p.wrongAttempts>=2)showPuzzleFailureHint("opera","wrongOrder");
    } else showToast("机关没有接受这个答案");
    return;
  }
  if(chapter==="opera")sound.gong(index);else sound.puzzle();shake=3;
  if(p.sequence.length===expected.length)onSolved();
  else if(chapter==="opera")showToast("有一张面具垂下了头");
}

function collectMemoryFragment(id,title,lines){
  const story=world.chapterProgress.story;
  story.memoryFinds||(story.memoryFinds=[]);
  const first=!story.memoryFinds.includes(id);
  if(first){
    story.memoryFinds.push(id);sound.pickup();
    showToast(`旧事残片 ${story.memoryFinds.length}/5`,2.5);
  }
  queueDialogue(title,lines);
  if(first&&story.memoryFinds.length>=5&&!story.memoryCompleteSeen){
    story.memoryCompleteSeen=true;
    queueDialogue("阿砚",["这些东西来自不同地方，却都在绕着同一个孩子打转。","不是六盏灯把我带到这里。是有人把关于『第七个』的记忆，拆开藏进了整座无阴镇。"]);
    showGuidance("旧事拼合","五处不起眼的旧物终于连成了一条线。它们不会替你解开终章，但会改变你看待『阿砚』这个名字的方式。","",4.4);
  }
  saveGame({resumeRegion:world.currentRegion});
}
function handleChapterInteraction(obj){
  const p=world.chapterProgress[obj.chapter];if(!p)return;
  if(obj.kind==="npc")stageNpcConversation(obj,92);
  // Narrative rule: NPC dialogue is optional. Core props and mechanisms never
  // require p.talked; the player can discover -> infer -> operate from evidence alone.
  switch(obj.id){
    case "umbrella_rain":{
      if(p.umbrellaRainTalked){queueDialogue("撑伞女子",["雨还没停。等船的人最好别回头数脚印。"]);break;}
      p.umbrellaRainTalked=true;p.umbrellaRainDeparting=true;
      queueDialogue("撑伞女子",["你也是来等船的吗？"]);
      queueDialogue("阿砚",["这里哪来的船？"]);
      queueDialogue("撑伞女子",["雨停以前，会有一条船从没有河的地方经过。","真看见它时，别数船上的人。"]);
      break;
    }
    case "umbrella_ferry":{
      if(p.umbrellaFerryTalked){queueDialogue("撑伞女子",["别找我的名字。先看水里，岸上的东西会说谎。"]);break;}
      p.umbrellaFerryTalked=true;
      queueDialogue("阿砚",["我在雨巷见过你。那时你说在等船。"]);
      queueDialogue("撑伞女子",["我没有等船。是这条船一直在等我的名字。","我死后才知道，船从来不载人，只载别人还记得的那一部分。"]);
      break;
    }
    case "lantern_girl_city":{
      if(p.girlCityTalked){queueDialogue("？？？",["别急着问我是谁。先想想为什么你每次都能看见我。"]);break;}
      p.girlCityTalked=true;p.girlCityDeparting=true;
      queueDialogue("阿砚",["你一直在跟着我？"]);
      queueDialogue("？？？",["不是。"]);
      queueDialogue("阿砚",["那为什么每次都能看见你？"]);
      queueDialogue("？？？",["一直跟着我的，是你。"]);
      break;
    }
    case "shenpo_opera":{
      p.talked=true;
      if(p.solved){queueDialogue("沈婆",["你还是把它们送回去了。", "祭刃拿走吧。至于第七道影子——别问我，我当年也装作没看见。"]);break;}
      queueDialogue("沈婆",p.clues.length>=2?
        ["你已经看见的，比我能说的可靠。", "戏楼最会借活人的嘴撒谎。别把我的话当答案。"]:
        ["若你问我当年死了谁，我也可能骗你。", "去看戏台自己留下的痕迹。死人不擅长改口。"]);
      break;
    }
    case "opera_mask_a":
      addUnique(p.clues,obj.id);queueDialogue("残缺戏单",[
        "末场批注：『地角先登台，人角最后谢幕；天角从不争头场。』",
        "演员名单只写了六人，页尾却有第七枚按过朱砂的指印。"
      ]);break;
    case "opera_mask_b":
      addUnique(p.clues,obj.id);queueDialogue("无面具架",[
        "高锣的红绳系在『人』面背后；最低的锣沿沾着『天』面脱落的金粉。",
        "剩下那张『地』面没有自己的锣绳。三张脸正面却被刮成了同一张脸。"
      ]);break;
    case "opera_false_bill":
      queueDialogue("旧排练单",["潦草抄着『高、低、中』，旁边又被人重重划掉。","纸背写着：『正角沈月娥病缺，替角排练用，不入正戏。』——这个名字被朱砂圈了两遍。"]);break;
    case "opera_burned_ticket":
      collectMemoryFragment(obj.id,"焦边戏票",["票根只剩半张：『中元夜，七人同看末场。』","座号却只印到六。第七个座位被人用朱砂画在票背，像临时添上去的。"]);break;
    case "opera_gong_0":case "opera_gong_1":case "opera_gong_2":
      if(p.solved){showToast("三锣已经归于沉寂");break;}
      if(p.clues.length<2){showToast("只凭锣声分不出三张脸，戏台两侧还有没看完的东西");break;}
      // 戏单决定登台角色：地 -> 天 -> 人；具架决定锣音：地=中、天=低、人=高。
      sequenceStep("opera",obj.index,[1,0,2],()=>{
        completeChapter("opera",["最后一声高锣落下时，台上明明只有六张椅子，幕布上却映出第七个人的影子。","第二盏灯归位了。升降台后似乎还藏着一件东西。"]);
        showGuidance("升降台解锁","戏台右侧的旧升降机松开了锁链，下面藏着戏班留下的东西","E 操作升降机",5);
      });break;
    case "opera_lift":
      p.liftRaised=!p.liftRaised;sound.winch();showToast(p.liftRaised?"升降台正在上升":"升降台正在下降");break;

    case "nameless_bamboo":{
      p.talked=true;
      if(p.solved){queueDialogue("无名客",["你听见了水里的那一声。", "这次不是我告诉你的。"]);break;}
      queueDialogue("无名客",["别问我钟该怎么敲。", "活人听见一座寺，水里听见的是另一座。你信哪一个，自己看。"]);
      break;
    }
    case "bamboo_prayer":
      addUnique(p.clues,obj.id);queueDialogue("倒写祈愿签",[
        "墨字从下往上：『近者受落地之光，远者逐升起之火；居中者只听平直一线。』",
        "签尾有六个香客名字，第七格被整齐割掉。"
      ]);break;
    case "bamboo_incense_book":
      collectMemoryFragment(obj.id,"残破香火簿",["香火簿按年份记着六个固定名字。第七行每年都换一种笔迹，却从不写姓名。","最近一次只留下一句：『孩子怕水，不要让他听第三遍钟。』"]);break;
    case "bamboo_pool":{
      addUnique(p.clues,obj.id);
      if(p.tuned.length===3&&!p.reflectionSealed){
        p.reflectionSealed=true;sound.lantern();createBurst(obj.x,575,"#8bc0bd",18);
        completeChapter("bamboo",["三口钟的余响回到水面，七道倒影里有一道没有对应的人。","当你用灯把那道多余的影子压回水底，第三盏灯才真正亮起：『别让第七个孩子上船。』"]);
        queueDialogue("积水倒影",["钟声不是终点。你必须回到最初看见异常的地方，才能知道三口钟究竟唤醒了什么。"]);
        break;
      }
      queueDialogue("积水倒影",[
        "你把灯稍稍抬高，远钟的倒影先亮；把灯压低，近钟脚下泛出一圈金色。",
        "中钟的倒影只有在灯火几乎水平时才完整。水面却始终多出第七个人的肩膀。"
      ]);break;
    }
    case "bamboo_bell_0":case "bamboo_bell_1":case "bamboo_bell_2":{
      if(p.solved){showToast("三口钟已经各自记住了灯的方向");break;}
      if(p.clues.length<2){showToast("钟声只剩杂响。先弄清祈愿签与倒影在说什么");break;}
      if(!lampIsFocused()){showToast("钟没有回应。把引路灯举起来，再让光落到钟身上");break;}
      const a=world.lamp.angle;
      const aligned=(obj.index===0&&a>.32)||(obj.index===1&&Math.abs(a)<.18)||(obj.index===2&&a<-.32);
      if(!aligned){p.wrongAttempts=(p.wrongAttempts||0)+1;sound.play("puzzle_wrong",{volume:.32});showToast(obj.index===0?"近钟只震了一下，声音立刻散掉":obj.index===1?"中钟的回声歪向一侧，很快消失":"远钟的声音沉在檐下，没有传出去");if(p.wrongAttempts>=2)showPuzzleFailureHint("bamboo","wrongAngle");break;}
      addUnique(p.tuned,obj.index);sound.bell(obj.index);createBurst(obj.x,obj.y-70,"#e8c36d",10);
      if(p.tuned.length===3){
        showToast("第三声余响没有散去——它从来时的水面又响了一次",3.4);
        if(puzzleHintLevel()>0)showGuidance("余声回水","三口钟已经共鸣。声音却从最初那池积水里重新传来——回去看看倒影。","← 返回积水处　E 调查",4.4);
        startStoryApparition("girlBambooHint",7.0);sound.play("story_ghost",{volume:.24});
      } else showToast(`钟身留下了一道暖光 ${p.tuned.length}/3`);
      break;
    }

    case "nameless_ferry":
      p.talked=true;queueDialogue("无名客",p.solved?
        ["船靠过岸了。你已经知道它带走的从来不是人。"]:
        ["我不替这条船点名。", "你若真想知道它等谁，就看它自己会对什么东西起反应。"]);break;
    case "ferry_name_0":case "ferry_name_1":case "ferry_name_2":{
      addUnique(p.names,obj.index);const lines=[
        ["名签上写着『沈月娥』——正是戏楼旧排练单上被朱砂圈过的正角。背面的小字：戏楼失火，尸身未归。"],
        ["它并不在岸上。灯光压向水面后，倒影里的名字才浮回现实：『陈……生』。他似乎是当年守钟的人。"],
        ["船骸下压着一张没有名字的签。尺寸却和纸扎铺旧照片中的孩子相同。背面只有一个『七』字。阿砚的手在发抖。"]
      ];queueDialogue(obj.name,lines[obj.index]);sound.pickup();showToast(`找回名签 ${p.names.length}/3`);
      if(obj.index===0){startStoryApparition("singerFerryMemory",4.8);sound.play("story_ghost",{volume:.24});}
      break;
    }
    case "ferry_reflection":{
      if(!lampIsFocused()||world.lamp.angle<.35){p.wrongAttempts=(p.wrongAttempts||0)+1;showToast("水面墨影晃了一下，又沉回黑水里");if(p.wrongAttempts>=2)showPuzzleFailureHint("ferry","missingReflection");break;}
      p.reflectionRevealed=true;sound.lantern();createBurst(obj.x,565,"#7fc4c4",14);queueDialogue("水面墨影",["灯光压低后，水里出现一张本不存在于岸上的名签。","更怪的是，倒影先出现，真正的纸签才从湿木板缝里慢慢渗出来。"]);
      const story=world.chapterProgress.story;if(story.umbrellaFerryTalked&&!story.umbrellaFerryGone){story.umbrellaFerryGone=true;queueDialogue("撑伞女子",["你看，水里比岸上多一个我。","别替我上船。把名字还回去就够了。"]);}
      break;
    }
    case "ferry_debris":{
      if(!world.ritualBladeUnlocked&&player.weapon?.type!=="ritual"){showToast("普通工具割不开替身纸线。戏楼里那把祭刃或许正是为它留下的");break;}
      p.debrisCleared=true;sound.play("ritual_cut_paper",{volume:.48});createBurst(obj.x,555,"#b59b70",18);queueDialogue("缠绳船骸",["祭刃割断的不是麻绳，而是一束束写着姓名的纸线。","船板抬起后，下面压着第三张名签。"]);break;
    }
    case "ferry_manifest":
      queueDialogue("渡船旧册",["旧册每页都只有六个姓名栏，但页角都多出一道没有编号的水痕。","有人用不同年份的墨反复写过：『别数最后一个。』"]);break;
    case "ferry_child_ticket":
      collectMemoryFragment(obj.id,"儿童船票",["一张从未撕验过的儿童票，日期正好是七年前的中元夜。","姓名栏被水泡白了，只剩年龄：七岁。背面有人写着：『没上船，也算一个。』"]);break;
    case "ferry_winch":
      if(p.solved){showToast("绞盘已经锁定在逆流方向");break;}
      if(p.names.length<3){showToast(`绞盘的三个卡槽仍空着 ${p.names.length}/3`);break;}
      p.winchTurns++;p.boatProgress=.01;sound.winch();completeChapter("ferry",["三张名签插入绞盘后，水里同时有人喊『阿砚』。","可它们记下的死亡年份，比我所谓的出生还早。第四盏灯究竟在替谁记住我？"]);showGuidance("逆流启航","绞盘开始反转，渡船顶着水流靠向纸城","向右前进",5);break;

    case "shenpo_city":{
      p.talked=true;
      if(p.solved){queueDialogue("沈婆",["空坟终于肯露出来了。", "我一路没告诉你它在等谁——因为我也怕自己说出口以后，它就成了真的。"]);break;}
      const memories=world.chapterProgress.story.memoryFinds?.length||0;
      queueDialogue("沈婆",memories>=3?
        ["你捡到的那些旧物，我认得几样。", "我当年也以为把它们分开藏起来，就等于没有骗你。现在看来，只是把一句谎拆成了五句。"]:
        ["纸城会学活人的口气，连我的话也会学。", "你要是只信别人说的，就永远走不出这里。"]);
      break;
    }
    case "city_grave_0":case "city_grave_1":case "city_grave_2":{
      addUnique(p.epitaphs,obj.index);const lines=[
        ["小碑无名：『我死得最早，却从不睡在最左；归乡的人也不该挨着我。』","碑脚刻着六朵莲，第七朵只刻了一半。"],
        ["老者碑：『我在幼者左边，也与归乡者相邻。活到名字被忘光，才终于有人点灯。』"],
        ["归乡者碑：『离乡七年，逆水而归。我停在老者另一侧，却永远碰不到那个孩子。』"]
      ];queueDialogue(obj.name,lines[obj.index]);break;
    }
    case "city_paper_crane":
      collectMemoryFragment(obj.id,"压扁的纸鹤",["纸鹤翅膀内侧写着六个成人名字，笔画都很稳。","最里面还有一行孩子的字：『我叫阿——』，后半个字被折痕压掉了。"]);break;
    case "city_false_grave":{
      triggerClueReaction("city_false_grave","seventh-gap");
      if(p.epitaphs.length<3){
        queueDialogue("新刻假碑",["碑文崭新得不合时宜：『幼者居西，归者居东。』","石粉还没干。沈婆说纸城最擅长替死人补一段听起来顺耳的过去。"]);break;
      }
      const expected=[2,1,0];
      const allPlaced=p.assignments.every(v=>v!==null)&&p.assignments.every((v,i)=>v===expected[i]);
      if(!allPlaced){
        queueDialogue("第七空坟",["假碑背后的薄石板已经松动，下面露出一个空位。","三张纸拓必须先回到正确的墓灯，这块空坟才会承认自己一直在等谁。"]);break;
      }
      if(!world.ritualBladeUnlocked&&player.weapon?.type!=="ritual"){showToast("空坟上覆着戏楼同样的替身纸线。普通工具割不开它");break;}
      p.emptyGraveOpened=true;sound.seal();createBurst(obj.x,548,"#b79d76",20);
      completeChapter("city",["祭刃割开空坟上的替身纸线，六座有名的坟后方露出第七个没有名字的位置。","第五盏灯照亮纸城时，所有纸人的脸都变成了我。师父怕的不是我点灯，而是我看见那个空位。"]);
      break;
    }
    case "city_memory_0":case "city_memory_1":case "city_memory_2":{
      if(p.epitaphs.length<3){showToast("纸拓还没有显形。先读完三块真正的墓碑");break;}
      if(p.carriedMemory!==null){showToast("你手里已经捧着一张纸拓。先把它送回一盏墓灯");break;}
      p.carriedMemory=obj.index;sound.pickup();
      const labels=["幼者","老者","归乡者"];showToast(`捧起${labels[obj.index]}纸拓——它会跟着你走到下一盏墓灯`);
      break;
    }
    case "city_lantern_0":case "city_lantern_1":case "city_lantern_2":{
      if(p.solved){showToast("三盏墓灯已经各自守住一段人生");break;}
      if(p.epitaphs.length<3){showToast("先读完三块真正的墓碑");break;}
      if(p.assignments[obj.index]!==null){showToast("这盏墓灯已经接住一段人生，不能再硬塞另一张纸拓");break;}
      if(p.carriedMemory===null){showToast("墓灯的纸槽是空的。回到第七空坟旁，把一张人生纸拓亲手带过来");break;}
      const memory=p.carriedMemory,labels=["幼者","老者","归乡者"],expected=[2,1,0];
      p.carriedMemory=null;
      if(memory!==expected[obj.index]){
        p.wrongAttempts=(p.wrongAttempts||0)+1;sound.play("puzzle_wrong",{volume:.36});createBurst(obj.x,520,"#684f46",5);
        showToast(`${labels[memory]}纸拓在灯罩上卷曲发黑——这不是它的位置，纸拓重新出现在空坟旁`);if(p.wrongAttempts>=2)showPuzzleFailureHint("city","wrongMemory");break;
      }
      p.assignments[obj.index]=memory;sound.puzzle();createBurst(obj.x,520,"#d6ae62",10);
      showToast(`${obj.index===0?"西":obj.index===1?"中":"东"}墓灯接住了${labels[memory]}的人生`);
      if(p.assignments.every(v=>v!==null))showGuidance("第七空坟","三段人生都已归位。别继续向右——回到三张纸拓出现的空坟，那里还有一层假皮","向左返回空坟",5);
      break;
    }

    case "nameless_final":{
      p.talked=true;
      const memories=world.chapterProgress.story.memoryFinds?.length||0;
      queueDialogue("无名客",p.solved?
        ["剩下的已经不是我能替你决定的。"]:
        memories>=5?
          ["你把那些没人要求你捡的东西也带到了这里。", "那就好。谜题只会告诉你机关怎么开，旧物才会告诉你为什么有人非要把它关上。","现在别问我谁是第七个。你已经知道该相信哪一类证据。"]:
          ["到这里，别再问我。", "如果还需要我告诉你谁是第七个，那前面的路就都白走了。"]);
      break;
    }
    case "final_mirror":{
      if(!lampIsFocused()){showToast("照魂镜需要你把引路灯真正举起来");break;}
      if(!p.convergenceStarted){
        p.convergenceStarted=true;p.mirrorLit=true;p.candidate=0;resetFinalInspection(p);sound.lantern();createBurst(obj.x,480,"#e6b75a",18);
        queueDialogue("照魂镜",["镜面没有给出一个答案，而是分出七道相似的影子。","每转一相，声音、旧名与受光方式都会改变。只有一道人影同时符合你一路见过的四件事。"]);
        if(puzzleHintLevel()>0)showGuidance("四证合一","用七相转盘逐个换影；对每一道影依次核对受光倒影、回应铜片、归名牌与第七空位。","转盘 → 镜 → 铜片 → 归名牌 → 晶石",4.4);
        break;
      }
      const sh=currentFinalShadow(),ok=finalLightMatches(sh);p.reflectionSeen=ok;
      if(ok){sound.play("final_echo",{volume:.32});showToast(`第 ${p.candidate+1} 影在这束光里终于成形：${sh.note}`,3.0);}
      else showToast(`第 ${p.candidate+1} 影仍被镜面切碎。换一个灯光方向再看`,2.7);
      break;
    }
    case "final_echo_0":case "final_echo_1":case "final_echo_2":{
      if(!p.convergenceStarted){showToast("铜片没有对象可回应。先让照魂镜分出七道影子");break;}
      const sh=currentFinalShadow(),matches=obj.index===sh.voice;
      sound.play(matches?"final_echo":"puzzle_wrong",{volume:matches?.34:.18});
      if(matches){p.heardEcho=true;p.echoSequence=[obj.index];showToast(`第 ${p.candidate+1} 影在${obj.index===0?"低":obj.index===1?"中":"高"}声里回应：『${sh.word}』`,3.0);}
      else showToast(`第 ${p.candidate+1} 影没有回应这块铜片`,2.1);
      break;
    }
    case "final_inscription":
      p.inscription=true;queueDialogue("第七刻痕",[
        "六道刻痕都有被供奉过的磨损，只有最后一道像是后来硬挤进去的空位。",
        "旁边留着四个几乎被擦掉的字：『影、声、名、位』。"
      ]);break;
    case "final_blank_tag":
      collectMemoryFragment(obj.id,"烧白的空名签",["名签被火烤得只剩纤维，没有旧名，也没有死亡年月。","边缘却有和纸扎铺旧照片完全一致的红线。它像是先有了一具替身，后来才等到一个名字。"]);break;
    case "final_dial":
      if(!p.convergenceStarted){showToast("七相转盘还没有与镜中的影子接上");break;}
      p.candidate=(p.candidate+1)%7;p.dial=p.candidate;resetFinalInspection(p);sound.play("ui_select",{volume:.24});showToast(`照魂镜转到第 ${p.candidate+1} 道影子`,1.8);break;
    case "final_name_tablet":{
      triggerClueReaction("final_name_tablet","identity");
      if(!p.convergenceStarted){showToast("归名牌还不知道你在查看谁");break;}
      const sh=currentFinalShadow();p.readName=true;
      if(sh.oldName){sound.play("paper_pickup",{volume:.20});showToast(`第 ${p.candidate+1} 影的旧名：${sh.oldName}`,2.8);}
      else{sound.play("final_echo",{volume:.28});showToast(`第 ${p.candidate+1} 影：没有旧名。牌面只剩后来写上的两个字——阿砚`,3.2);}
      break;
    }
    case "final_crystal":{
      if(!p.convergenceStarted){showToast("忆火晶石前没有可供判断的人影");break;}
      if(p.convergenceSolved){showToast("四条证据已经落在同一道影子上");break;}
      if(!p.inscription){showToast("你还没有注意到刻痕留下的四个字：影、声、名、位");break;}
      if(!p.reflectionSeen){showToast("这道人影还没有在正确方向的光里完整出现");break;}
      if(!p.heardEcho){showToast("你还没听见这道人影真正回应哪一道声音");break;}
      if(!p.readName){showToast("归名牌还没有核对这道人影原先有没有名字");break;}
      if(!finalEvidenceReady(p)){
        p.wrongAttempts=(p.wrongAttempts||0)+1;sound.play("puzzle_wrong",{volume:.40});shake=4;
        showToast("忆火晶石熄了下去，四条证据没有同时落定",3.2);if(p.wrongAttempts>=2)showPuzzleFailureHint("final","wrongEvidence");break;
      }
      p.convergenceSolved=true;p.crystalLit=true;p.echoSolved=true;p.nameAccepted=true;sound.lantern();createBurst(obj.x,485,"#f1c96d",28);
      queueDialogue("忆火晶石",["影、声、名、位第一次落在同一个人身上。","那个人没有更早的名字。后来，他才叫阿砚。"]);break;
    }
    case "final_seal":
      if(p.solved){showToast("封柱已经解除");break;}
      if(!p.convergenceSolved){showToast("封柱只接受一道人影。先让影、声、名、位同时指向它");break;}
      completeChapter("final",[]);showGuidance("第七盏灯","走到祭坛中央。接下来不是谜题，而是选择。","E 面对它",4);break;
  }
  if(!p.solved)saveGame({resumeRegion:obj.chapter});
}

function chapterObjective(id=world.currentRegion){
  const p=world.chapterProgress?.[id];if(!p)return "继续探索";
  if(id==="opera"&&p.solved&&!world.ritualBladeUnlocked)return "升降台上留下了戏魂祭刃：取走它才能割断后面的替身纸线";
  if(p.solved)return "前路已经开启，继续向右";
  if(id==="opera"){
    if(p.clues.length<2)return `戏台留下两处彼此矛盾的痕迹 ${p.clues.length}/2`;
    return `让三张脸自己暴露登台关系 ${p.sequence.length}/3`;
  }
  if(id==="bamboo"){
    if(p.clues.length<2)return `一张签在说方向，一池水在说另一件事 ${p.clues.length}/2`;
    if(p.tuned.length<3)return `让三口钟各自听见属于自己的光 ${p.tuned.length}/3`;
    return "三钟已响，余声却回到了来时的水面";
  }
  if(id==="ferry"){
    if(!p.names.includes(0))return "渡口有三个空卡槽，岸边似乎遗落了什么";
    if(!p.reflectionRevealed)return "水面和岸上少了一样东西";
    if(!p.names.includes(1))return `倒影里有东西开始浮回岸上 ${p.names.length}/3`;
    if(!p.debrisCleared)return "船骸下面还压着一处不肯松开的纸线";
    if(p.names.length<3)return `三个卡槽还差最后一张纸 ${p.names.length}/3`;
    return "三张纸都在手里，绞盘正在等它们";
  }
  if(id==="city"){
    if(p.epitaphs.length<3)return `旧碑之间的位置关系还不完整 ${p.epitaphs.length}/3`;
    if(p.carriedMemory!==null)return "手里的纸拓正在靠近某一盏灯时变暖";
    if(p.assignments.some(v=>v===null))return "三张纸拓与三盏灯之间存在固定的位置关系";
    return "三盏灯都亮了，但第七空坟仍然没有闭合";
  }
  if(id==="final"){
    if(!p.convergenceStarted)return "照魂镜里有七道相似的影子";
    if(!p.inscription)return "调查镜旁刻痕，确认这次要同时核对哪些证据";
    if(!p.convergenceSolved)return "转动七相逐个核对：倒影、回应的声音、旧名与所在位置必须属于同一个人";
    if(!p.solved)return "把已经被四条证据同时确认的影子交给终灯封柱";
    return "走向第七盏灯，决定它接下来代表什么";
  }
  return "继续探索";
}

function chapterObjectiveCompact(id=world.currentRegion){
  const p=world.chapterProgress?.[id];if(!p)return "继续前行";
  if(id==="opera")return p.solved&&!world.ritualBladeUnlocked?"戏楼 · 取走祭刃":p.solved?"戏楼 · 幕落":"戏楼 · 七影";
  if(id==="bamboo")return p.solved?"竹寺 · 钟止":p.tuned.length===3?"竹寺 · 回看倒影":"竹寺 · 三钟";
  if(id==="ferry")return p.solved?"古渡 · 船归":"古渡 · 三名";
  if(id==="city"){
    if(p.solved)return "纸城 · 空坟已开";
    if(p.carriedMemory!==null)return `纸城 · 手持${["幼者","老者","归乡者"][p.carriedMemory]}纸拓`;
    return p.assignments.every(v=>v!==null)?"纸城 · 返回空坟":"纸城 · 纸拓归位";
  }
  if(id==="final")return p.solved?"灯域 · 第七盏灯待决":p.convergenceStarted?`灯域 · 第 ${p.candidate+1}/7 影`:"灯域 · 照见七影";
  return "继续探索";
}

function interactionLabel(target){
  if(!target)return "调查";
  if(target.kind==="lore")return target.obj?.title||"旧物";
  if(target.kind==="lamp")return "唤醒引路灯";
  if(target.kind==="drop")return `拾取 ${weaponDef(target.obj.type).name}`;
  if(target.kind==="checkpoint")return "点亮存档灯";
  if(target.kind==="door")return world.noteFound?"解开封门":"查看门上封印";
  if(target.kind==="ember")return "取得灯芯火";
  if(target.kind==="seventh")return "面对第七盏灯";
  if(target.kind==="chapter"){
    const o=target.obj;
    if(o.kind==="npc")return `与${o.name}交谈`;
    if(o.kind==="gong")return `敲响${o.name}`;
    if(o.kind==="bell")return `让${o.name}尝试共鸣`;
    if(o.kind==="graveLantern")return `把纸拓送入${o.name}`;
    if(o.kind==="memoryToken")return `捧起${o.name}`;
    if(o.kind==="emptyGrave")return `查看${o.name}`;
    if(o.kind==="nameSlip")return `拾取${o.name}`;
    if(o.kind==="winch")return "转动渡口绞盘";
    if(o.kind==="nameReflection")return "观察水面墨影";
    if(o.kind==="debris")return "清理缠绳船骸";
    if(o.kind==="nameTablet")return "查看当前影子的旧名";
    if(o.kind==="lift")return "操作戏台升降机";
    if(o.kind==="mirror")return world.chapterProgress.final.convergenceStarted?"查看当前影子的倒光":"让照魂镜分出七影";
    if(o.kind==="echo")return `用${o.name}试探当前影子`;
    if(o.kind==="dial")return "切换下一道影子";
    if(o.kind==="crystal")return "让四条证据在此汇合";
    if(o.kind==="seal")return "解除终灯封柱";
    return `调查${o.name}`;
  }
  return "调查";
}

const FULL_CHAPTERS={
  opera:{title:"无面戏楼",text:"幕布后，有人刚刚谢过一场早已散掉的戏。",speaker:"沈婆"},
  bamboo:{title:"倒悬竹寺",text:"第一声钟响以前，先看水。",speaker:"无名客"},
  ferry:{title:"逆流古渡",text:"水面上少一个名字，水面下多一道影子。",speaker:"阿砚"},
  city:{title:"幽都纸城",text:"新碑太白，旧碑太沉。",speaker:"旁白"},
  final:{title:"第七灯域",text:"这里没有新的规矩。",speaker:"无名客"}
};

// Stage 3 finale: seven candidate shadows are inspected through one combined
// inference instead of replaying four disconnected mini-puzzles. Only the
// seventh shadow is simultaneously mirror-born, nameless, responsive to the
// middle call of “阿砚”, and seated in the empty seventh position.
const FINAL_SHADOWS=[
  {oldName:"陈某",voice:0,word:"归",light:"down",note:"岸上有名，影子朝下沉"},
  {oldName:"沈月娥",voice:2,word:"月娥",light:"level",note:"戏衣尚在，声音却太高"},
  {oldName:"周四郎",voice:1,word:"回家",light:"down",note:"有旧名，也有完整归处"},
  {oldName:"林阿福",voice:0,word:"师父",light:"level",note:"名字与影子都过于完整"},
  {oldName:"无名孩子",voice:2,word:"河里",light:"up",note:"无旧姓，却不是后来那个名字"},
  {oldName:"顾小满",voice:1,word:"别回头",light:"level",note:"会回应中声，但不在空位"},
  {oldName:"",voice:1,word:"阿砚",light:"up",note:"没有旧名，只在倒光里成形"}
];
const ENDING_CHOICES=[
  {id:"keep",title:"留下「阿砚」",sub:"承认后来得到的名字，也背着六人的记忆继续活下去"},
  {id:"return",title:"归还六人的记忆",sub:"把借来的声音交还六盏灯，只留下自己后来走过的人生"},
  {id:"extinguish",title:"熄灭第七盏灯",sub:"终止以替身承接亡念的仪式，让无阴镇自己记住死者"}
];
function currentFinalShadow(){
  const p=world.chapterProgress?.final||{};return FINAL_SHADOWS[clamp(p.candidate||0,0,6)]||FINAL_SHADOWS[0];
}
function finalLightMatches(profile=currentFinalShadow()){
  if(!lampIsFocused())return false;const a=world.lamp.angle;
  if(profile.light==="up")return a<-.28;
  if(profile.light==="down")return a>.28;
  return Math.abs(a)<=.28;
}
function resetFinalInspection(p){p.heardEcho=false;p.readName=false;p.reflectionSeen=false;p.echoSequence=[];}
function finalEvidenceReady(p){
  const sh=currentFinalShadow();return p.candidate===6&&p.heardEcho&&p.readName&&p.reflectionSeen&&sh.oldName===""&&sh.voice===1&&finalLightMatches(sh);
}
function endingSubtitle(){
  return world.finalChoice==="keep"?"名字留下":world.finalChoice==="return"?"记忆归灯":world.finalChoice==="extinguish"?"第七盏灯熄灭":"灯火未决";
}
function endingFinalLine(){
  return world.finalChoice==="keep"?"后来，镇里的人仍叫他阿砚。":world.finalChoice==="return"?"六盏灯各归其名，阿砚只带走自己的以后。":world.finalChoice==="extinguish"?"没有第七盏灯，天也会亮。":"";
}
function beginEpilogue(choiceId){
  world.finalChoice=choiceId;world.endingChoiceActive=false;world.lanternsRecovered=7;world.epilogueActive=true;world.epilogueComplete=false;world.epilogueBeat=0;
  for(const e of world.enemies)e.inactive=true;world.bossActive=false;world.projectiles.length=0;world.fields.length=0;
  player.x=1240;player.vx=0;player.vy=0;player.health=player.maxHealth;player.dead=false;player.lampHeld=world.lampAcquired;world.lamp.held=world.lampAcquired;world.lamp.focused=false;
  const g=getPrimaryGroundAt(player.x+player.w*.5);if(g){player.y=g.y-player.h;player.grounded=true;player.groundY=g.y;}
  player.checkpointX=player.x;player.checkpointY=player.y;cameraX=clamp(player.x-W*.30,0,world.width-W);world.currentRegion="alleyA";world.epilogueStartX=player.x;
  sound.lantern();shake=10;impactFlash=.12;createBurst(19320,510,"#f3c46c",30);
  const lines=choiceId==="keep"?["名字是后来才有的。后来，也算我的一生。","六个人的记忆不会替我活下去，但我会记得他们来过。"]:
    choiceId==="return"?["我把不属于我的梦还给六盏灯。","阿砚这个名字留下，因为它已经被我自己叫过很多年。"]:
    ["如果第七盏灯只能靠另一个替身继续亮，那就让它在这里停下。","死人应该被记住，不该被复制。活人也不该替谁成为容器。"];
  queueDialogue("阿砚",lines);
}
function updateEpilogue(dt){
  if(!world.epilogueActive)return;
  // A short, walkable coda. No enemies, no objectives, only familiar places
  // changed by what the player decided.
  if(world.epilogueBeat<1&&player.x>1540){world.epilogueBeat=1;sound.play("story_ghost",{volume:.16});}
  if(world.epilogueBeat<2&&player.x>2080){world.epilogueBeat=2;sound.play("story_ghost",{volume:.16});}
  if(world.epilogueBeat<3&&player.x>2450){world.epilogueBeat=3;sound.play("story_ghost",{volume:.16});}
  if(world.epilogueBeat<4&&player.x>2920){
    world.epilogueBeat=4;
    const lines=world.finalChoice==="keep"?["伞下的位置空着。远处戏楼只响了一声锣。","天没有立刻亮，但这一次，影子跟上了我的脚步。"]:
      world.finalChoice==="return"?["雨巷里那些借来的声音安静下来。","我仍然记得他们的名字，只是不再从我的梦里醒来。"]:
      ["一路上的灯一盏盏暗下去，窗里却第一次有人自己点起了火。","没有第七盏灯以后，无阴镇还是得学会记住自己的死人。"];
    queueDialogue("阿砚",lines);world.endingTimer=1.2;
  }
}
function updateChapterProgress(){
  const r=sceneRegionAt(player.x+player.w*.5);
  if(r.id===world.currentRegion)return;
  world.currentRegion=r.id;
  if(FULL_CHAPTERS[r.id]&&!world.visitedRegions[r.id]){
    world.visitedRegions[r.id]=true;
    const c=FULL_CHAPTERS[r.id];showGuidance(c.title,c.text,"",3.0);
    // The room establishes itself before anyone explains it. Entering a chapter
    // never starts an NPC lecture; characters are optional witnesses, not quest givers.
    // Entering a scene no longer grants a lantern automatically. Each chapter
    // now owns a discover -> infer -> operate -> reveal progression chain.
    saveGame({resumeRegion:r.id,advanceCheckpoint:true});
  }
}

function updateChapterMechanisms(dt){
  ensureChapterShortcuts();
  const story=world.chapterProgress.story;
  if(!world.storyRuntime)world.storyRuntime={active:Object.create(null)};
  const active=world.storyRuntime.active||(world.storyRuntime.active=Object.create(null));
  for(const id of Object.keys(active)){active[id]-=dt;if(active[id]<=0)delete active[id];}
  for(const obj of CHAPTER_INTERACTABLES){
    if(obj.kind!=="npc")continue;
    const r=npcRuntimeFor(obj),t=npcTargetFor(obj),dx=t.x-r.x;
    r.targetX=t.x;r.groundY=t.y;
    const wantsMove=Math.abs(dx)>3;
    const desiredDir=wantsMove?(Math.sign(dx)||r.dir):r.dir;
    if(wantsMove&&desiredDir!==r.dir&&r.state!=="turn"){r.state="turn";r.stateTimer=.10;r.vx=0;}
    if(r.state==="turn"){
      r.stateTimer=Math.max(0,(r.stateTimer||0)-dt);
      r.vx=0;
      if(r.stateTimer<=0){r.dir=desiredDir;r.state="move";}
    }else if(wantsMove){
      r.state="move";r.dir=desiredDir;
      const near=Math.abs(dx)<26,cruise=near?Math.max(24,118*Math.abs(dx)/26):118;
      const targetV=r.dir*cruise,dv=targetV-(r.vx||0),step=420*dt;
      r.vx=Math.abs(dv)<=step?targetV:(r.vx||0)+Math.sign(dv)*step;
      r.x+=r.vx*dt;
      if((r.dir>0&&r.x>t.x)||(r.dir<0&&r.x<t.x)){r.x=t.x;r.vx=0;r.state="settle";r.stateTimer=.15;}
    }else{
      const dv=-(r.vx||0),step=620*dt;r.vx=Math.abs(dv)<=step?0:(r.vx||0)+Math.sign(dv)*step;r.x+=r.vx*dt;
      if(Math.abs(t.x-r.x)<3&&Math.abs(r.vx)<8){r.x=t.x;r.vx=0;if(r.state==="move"){r.state="settle";r.stateTimer=.15;}}
      if(r.state==="settle"){r.stateTimer=Math.max(0,(r.stateTimer||0)-dt);if(r.stateTimer<=0)r.state="idle";}
    }
    r.moving=r.state==="move"&&Math.abs(r.vx)>8;
    r.stepPhase=(r.stepPhase||0)+Math.abs(r.vx)*dt*.055;
    r.spriteBlend=Math.min(1,(r.spriteBlend??1)+dt*7.5);
    if((r.transientTimer||0)>0){r.transientTimer=Math.max(0,r.transientTimer-dt);if(r.transientTimer===0)r.transientSprite=null;}
    if(NPC_REVEAL_IDS.has(obj.id)&&!world.npcRevealSeen?.[obj.id]&&chapterObjectVisible(obj)&&Math.abs((player.x+player.w*.5)-r.x)<520)startNpcReveal(obj);
    if(r.reveal!=="none"){
      r.revealTimer=Math.max(0,(r.revealTimer||0)-dt);
      if(r.reveal==="preReveal"){r.revealAlpha=.25;if(r.revealTimer<=0){r.reveal="reveal";r.revealTimer=.30;}}
      else if(r.reveal==="reveal"){r.revealAlpha=Math.min(1,r.revealAlpha+dt*2.5);if(r.revealTimer<=0){r.reveal="settle";r.revealTimer=.20;r.revealAlpha=1;}}
      else if(r.reveal==="settle"&&r.revealTimer<=0){r.reveal="none";r.revealAlpha=1;}
    }
    r.y=t.y;
    if(obj.id==="umbrella_rain"&&story.umbrellaRainDeparting&&!story.umbrellaRainGone&&!r.moving){story.umbrellaRainGone=true;saveGame();}
    if(obj.id==="lantern_girl_city"&&story.girlCityDeparting&&!story.girlCityGone&&!r.moving){story.girlCityGone=true;saveGame({resumeRegion:"city"});}
  }

  // Observation-driven NPC beats. These are not E prompts: the player notices them by moving through the world.
  if(world.doorOpen&&player.x>2530&&player.x<2790&&!story.girlRainSeen){
    story.girlRainSeen=true;startStoryApparition("girlRain",4.8);sound.play("story_ghost",{volume:.20});
  }
  if(world.emberCount>=3&&player.x>5580&&player.x<5960&&!story.girlBossSeen){
    story.girlBossSeen=true;startStoryApparition("girlBoss",4.6);sound.play("story_ghost",{volume:.20});
  }
  const opera=world.chapterProgress.opera;
  if(world.bossDefeated&&player.x>7860&&player.x<8460&&!story.operaSingerIntroSeen){
    story.operaSingerIntroSeen=true;startStoryApparition("singerIntro",5.2);sound.play("story_ghost",{volume:.20});
  }
  if(opera.talked&&opera.clues.length>=1&&player.x>8120&&player.x<8440&&!story.girlOperaSeen){
    story.girlOperaSeen=true;startStoryApparition("girlOpera",3.8);sound.play("story_ghost",{volume:.20});
  }
  if(opera.clues.length>=2&&!opera.solved&&player.x>8420&&player.x<9250&&!story.operaSingerClueSeen){
    story.operaSingerClueSeen=true;startStoryApparition("singerClue",5.0);sound.play("story_ghost",{volume:.20});
  }
  if(opera.solved&&player.x>9190&&player.x<9700&&!story.operaSingerFarewellSeen){
    story.operaSingerFarewellSeen=true;startStoryApparition("singerFarewell",5.2);sound.play("story_ghost",{volume:.20});
  }
  const bamboo=world.chapterProgress.bamboo;
  if(bamboo.clues.length>0&&player.x>10480&&player.x<10920&&!story.girlBambooSeen){
    story.girlBambooSeen=true;startStoryApparition("girlBamboo",4.2);sound.play("story_ghost",{volume:.20});
  }
  if(puzzleHintLevel()>0&&bamboo.wrongAttempts>=2&&!bamboo.solved&&!story.girlBambooHintSeen&&player.x>10200&&player.x<12080){
    story.girlBambooHintSeen=true;startStoryApparition("girlBambooHint",5.2);sound.play("story_ghost",{volume:.20});
  }
  const ferryP=world.chapterProgress.ferry;
  if(ferryP.names.includes(0)&&!ferryP.reflectionRevealed&&player.x>13120&&player.x<13680&&!story.girlFerrySeen){
    story.girlFerrySeen=true;startStoryApparition("girlFerry",4.8);sound.play("story_ghost",{volume:.20});
  }
  const city=world.chapterProgress.city;
  if(puzzleHintLevel()>0&&city.wrongAttempts>=2&&!city.solved&&!story.girlCityHintSeen&&player.x>15100&&player.x<17180){
    story.girlCityHintSeen=true;startStoryApparition("girlCityHint",5.0);sound.play("story_ghost",{volume:.20});
  }
  const finalP=world.chapterProgress.final;
  if(finalP.mirrorLit&&player.x>17820&&player.x<18180&&!story.girlFinalSeen){
    story.girlFinalSeen=true;startStoryApparition("girlFinal",5.5);sound.play("story_ghost",{volume:.20});
  }

  if(world.operaLift){
    const target=world.chapterProgress.opera.liftRaised?430:560;
    const oldY=world.operaLift.y;
    world.operaLift.y=lerp(world.operaLift.y,target,clamp(dt*1.8,0,1));
    if(Math.abs(world.operaLift.y-target)<.2)world.operaLift.y=target;
    const dy=world.operaLift.y-oldY;
    if(player.grounded&&player.currentGroundId===world.operaLift.id){
      player.y+=dy;player.groundY=world.operaLift.y;
      player.lastValidGroundPosition={x:player.x,y:player.y,groundY:world.operaLift.y};
    }
    world.chapterProgress.opera.liftProgress=clamp((560-world.operaLift.y)/130,0,1);
  }
  const ferry=world.chapterProgress.ferry;
  if(ferry.solved&&ferry.boatProgress<1)ferry.boatProgress=Math.min(1,ferry.boatProgress+dt*.22);
}

function updatePlayer(dt){
  if(player.dead){ updatePaperDeath(dt); return; }
  player.invuln=Math.max(0,player.invuln-dt); player.hurtTimer=Math.max(0,(player.hurtTimer||0)-dt); player.attackCooldown=Math.max(0,player.attackCooldown-dt); player.dodging=Math.max(0,player.dodging-dt); player.attackBuffer=Math.max(0,(player.attackBuffer||0)-dt);
  if(player.attack){ player.attack.time+=dt; processAttack(); if(player.attack.time>=player.attack.total) player.attack=null; }
  if(!player.attack&&player.attackCooldown<=0&&(player.attackBuffer||0)>0&&player.grounded&&!player.charging){
    const bufferedHeld=player.attackBufferHeld||0;player.attackBuffer=0;player.attackBufferHeld=0;startAttack(bufferedHeld);
  }
  player.guarding=false;
  if(lampIsFocused()&&!player.attack){
    if(keys.w)world.lamp.angle=clamp(world.lamp.angle-dt*1.8,-1.05,1.05);
    if(keys.s)world.lamp.angle=clamp(world.lamp.angle+dt*1.8,-1.05,1.05);
  }
  const wasGrounded=player.grounded,fallSpeed=player.vy;
  if(window.Motion)window.Motion.PlayerController.update(dt);
  else {
  const move=(keys.a?-1:0)+(keys.d?1:0);
  if(move){ player.facing=move; const speed=player.dodging>0?430:lampIsFocused()?175:player.charging?78:220; player.vx=lerp(player.vx,move*speed,clamp(dt*12,0,1)); }
  else player.vx=lerp(player.vx,0,clamp(dt*(player.grounded?15:3),0,1));
  if(pressed.has("k")&&player.grounded){ if(player.lampHeld)setLampHeld(false); player.vy=-520; player.grounded=false; sound.jump(); }
  if(player.dodging>0){ player.vx=(player.dodgeDirection||-player.facing)*470; player.invuln=Math.max(player.invuln,.08); }
  player.vy+=1300*dt; player.vy=Math.min(player.vy,760);
  }
  // The ritual blade is a mobility weapon, not a faster copy of the ruler.
  // Its slashes carry Ayan forward; the third hit is a pronounced thrust.
  if(player.attack?.dashSpeed){
    const ap=clamp(player.attack.time/player.attack.total,0,1);
    const drive=player.attack.type==="ritual"?Math.max(0,1-ap/.72):Math.max(0,1-ap/.58);
    if(drive>0)player.vx=player.facing*player.attack.dashSpeed*drive;
  }
  const prevY=player.y,prevX=player.x; player.x+=player.vx*dt;
  const hitPlayerWall=resolveHorizontalAgainstWalls(player,prevX);
  if(hitPlayerWall?.id==="shop-door"&&!world.doorHintShown){
    world.doorHintShown=true;showGuidance("封门","按 E 查看封印；若封印没有反应，请调查左侧桌案的烧焦纸条","E 互动",6);
  }
  if(hitPlayerWall?.id?.startsWith("chapter-gate:")){
    const chapter=hitPlayerWall.id.split(":")[1];
    showToast(chapterObjective(chapter),3.2);
  }
  if(world.wallHp>0&&player.x>4230&&!world.wallHintShown){
    world.wallHintShown=true;
    showGuidance("裂墙挡路","长按 J 蓄力，松开后用重击破坏已经开裂的旧砖墙","长按 J · 蓄力攻击",5.5);
  }
  player.x=clamp(player.x,0,world.width-player.w);
  player.y+=player.vy*dt; player.grounded=false;let landedSurface="stone";
  for(const p of world.platforms){
    if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.vy>=0&&prevY+player.h<=p.y+8&&player.y+player.h>=p.y){
      player.y=p.y-player.h; player.vy=0; player.grounded=true;player.groundY=p.y;player.currentGroundId=p.id;landedSurface=p.kind||p.surfaceType||"stone";
      player.lastValidGroundPosition={x:player.x,y:player.y,groundY:p.y};
      if(player.attack&&player.attack.kind==="plunge"){ shake=8; createBurst(player.x+20,player.y+72,"#d6cbbb",8); }
    }
  }
  if(!wasGrounded&&player.grounded&&fallSpeed>145)sound.land(fallSpeed,landedSurface);
  if(window.Motion)window.Motion.PlayerController.afterCollision(dt,wasGrounded,fallSpeed);
  if(player.y>760){
    const safe=player.lastValidGroundPosition;
    if(safe){player.x=safe.x;player.y=safe.y;player.vx=0;player.vy=0;player.grounded=true;player.groundY=safe.groundY;player.invuln=Math.max(player.invuln,.8);showToast("脚下一滑，你退回了最近的落脚点",1.6);}
    else damagePlayer(999);
  }
  if(player.x>6030&&player.x<7270&&!world.bossActive&&!world.bossDefeated) beginBoss();
  if(player.x>1120&&!world.introRain){ world.introRain=true; showGuidance("雨巷","门外没有风，灯笼却都朝着河的方向。你的影子慢了半步。","",3.4); }
  if(!world.epilogueActive&&world.doorOpen&&world.lampAcquired&&player.x>1200&&!world.firstEncounterStarted){
    world.firstEncounterStarted=true; const first=world.enemies.find(e=>e.first);if(first)first.inactive=false;
    if(world.lamp.focused||world.tutorialFlags.lampRaisedOnce)showGuidance("影子先于身体","用 W / S 调整光束，照实影子后再攻击","W / S 调光　J 攻击　L 后撤",4.2);else showLampRaiseTutorialIfNeeded();
  }
  if(!world.epilogueActive&&world.firstShadowDefeated){for(const e of world.enemies)if(e.inactive&&!e.first&&e.x<2100)e.inactive=false;}
  if(player.x>4700&&!world.lanternHintShown){world.lanternHintShown=true;showGuidance("无声灯阵","看墙上的刻痕：一画、二画、三画。按笔画从少到多依次击打对应灯笼","J 击打灯笼",7);}
  updateChapterProgress();
  findInteraction();
}

function updateEnemies(dt){
  for(const e of world.enemies){
    if(e.dying){
      e.deathTimer=Math.max(0,(e.deathTimer||0)-dt);
      e.vx=0;e.vy=0;
      if(e.deathTimer<=0){
        e.dying=false;
        spawnSpriteFx(e.type==="paper"?"vfxPaper":"vfxShadow",e.x+e.w/2,e.y+e.h,100,.30,false);
      }
      continue;
    }
    if(!e.alive||e.inactive)continue;
    e.hurt=Math.max(0,(e.hurt||0)-dt);e.bindTimer=Math.max(0,(e.bindTimer||0)-dt);e.attackTimer=Math.max(0,(e.attackTimer||0)-dt*(e.type==="elite"&&e.lampFed?1.45:1));e.stateTimer=Math.max(0,(e.stateTimer||0)-dt);
    e.feedPulse=Math.max(0,(e.feedPulse||0)-dt);e.starvePulse=Math.max(0,(e.starvePulse||0)-dt);
    const bound=(e.bindTimer||0)>0;
    const litByLamp=lampHitsPoint(e.x+e.w/2,e.y+e.h*.48,330);
    if(e.type==="shadow"){
      if(litByLamp){
        e.exposeTimer=(e.exposeTimer||0)+dt;
        if(e.exposeTimer>=.32){if(!e.exposed)world.tutorialFlags.shadowRevealLearned=true;e.exposed=true;e.fixedTimer=Math.max(e.fixedTimer||0,.22);}
      }else{
        e.exposeTimer=Math.max(0,(e.exposeTimer||0)-dt*.5);
        e.exposed=false;
        e.fixedTimer=Math.max(0,(e.fixedTimer||0)-dt);
      }
    }else if(e.type==="paper"){
      // Paper bodies become brittle only after sustained illumination. In darkness
      // the paper skin folds back over the seam, so brute-force attacks are weak.
      e.brittleTimer=clamp((e.brittleTimer||0)+(litByLamp?dt:-dt*.9),0,.65);
      e.brittle=e.brittleTimer>=.24;
    }else if(e.type==="elite"){
      // Lantern bearers feed on direct light. The hot/cold transition itself is now
      // a readable world cue: hot core = empowered, collapsed cool core = damage window.
      const wasFed=!!e.lampFed;
      e.lampFeedTimer=clamp((e.lampFeedTimer||0)+(litByLamp?dt:-dt*1.35),0,1);
      e.lampFed=e.lampFeedTimer>.18;
      if(!wasFed&&e.lampFed)e.feedPulse=.28;
      else if(wasFed&&!e.lampFed){
        e.starvePulse=.38;
        if(!world.tutorialFlags.lanternCoreLearned){
          world.tutorialFlags.lanternCoreLearned=true;
          if(puzzleHintLevel()>0)showGuidance("灯核冷却","橙色热芯已经缩成青色冷芯。现在才是祭刃切断它的窗口。","移开灯光 → 灯核转青 → 祭刃攻击",4.2);
          else showToast("灯核由橙转青，外壳出现了短暂裂隙",2.6);
          saveGame();
        }
      }
    }
    if(Math.abs(e.x-player.x)>1250){ if(!e.grounded)resolveEntityVertical(e,dt); continue; }

    const playerHurtbox=getPlayerHurtbox(),playerCx=playerHurtbox.x+playerHurtbox.w*.5,playerCy=playerHurtbox.y+playerHurtbox.h*.5;
    const dx=playerCx-(e.x+e.w*.5),dist=Math.abs(dx),dir=Math.sign(dx)||e.desiredDir||1;
    const verticalDist=Math.abs(playerCy-(e.y+e.h*.5));
    const hasLOS=!wallBetween(e.x+e.w*.5,e.y+e.h*.45,playerCx,playerCy);
    e.desiredDir=dir;

    if(e.hurt>0&&!["DEAD","STAGGER"].includes(e.aiState)){
      e.aiState="HIT";e.stateTimer=Math.max(e.stateTimer,.12);
    }
    if(bound&&["PREPARE_ATTACK","ATTACK_ACTIVE"].includes(e.aiState)){
      e.aiState="RECOVERY";e.recoveryTotal=.18;e.stateTimer=.18;e.vx*=.2;
    }

    if(e.aiState==="PREPARE_ATTACK"){
      e.vx=lerp(e.vx,0,clamp(dt*18,0,1));
      if(e.stateTimer<=0){e.aiState="ATTACK_ACTIVE";e.attackActiveTotal=e.type==="elite" ? .14 : .11;e.stateTimer=e.attackActiveTotal;e.attackDidHit=false;}
    }else if(e.aiState==="ATTACK_ACTIVE"){
      const attackRange=e.type==="paper"?112:e.type==="elite"?105:92;
      const hitbox={x:dir>0?e.x+e.w-4:e.x-attackRange+4,y:e.y+6,w:attackRange,h:Math.max(28,e.h-8)};
      if(!e.attackDidHit&&hasLOS&&verticalDist<92&&rectsOverlap(hitbox,playerHurtbox)){damagePlayer(e.damage,dir);e.attackDidHit=true;}
      e.vx=dir*(e.type==="paper"?70:e.type==="elite"?95:82);
      if(e.stateTimer<=0){e.aiState="RECOVERY";e.recoveryTotal=e.type==="paper"?.42:e.type==="elite"?.38:.30;e.stateTimer=e.recoveryTotal;e.vx*=.22;e.attackTimer=e.type==="paper"?1.60:e.type==="elite"?1.38:1.08;}
    }else if(e.aiState==="RECOVERY"){
      e.vx=lerp(e.vx,0,clamp(dt*12,0,1));
      if(e.stateTimer<=0)e.aiState=dist<520&&hasLOS?"CHASE":"IDLE";
    }else if(e.aiState==="HIT"){
      e.vx*=Math.pow(.05,dt);
      if(e.stateTimer<=0)e.aiState="NOTICE";
    }else if(e.aiState==="BLOCKED"||e.aiState==="TURN"){
      e.vx=lerp(e.vx,0,clamp(dt*16,0,1));
      if(e.stateTimer<=0){e.desiredDir*=-1;e.aiState="PATROL";e.stateTimer=.35;}
    }else{
      if(dist<380&&hasLOS&&e.aiState==="IDLE"){e.aiState="NOTICE";e.stateTimer=.22;e.vx*=.4;}
      if(e.aiState==="NOTICE"){
        e.vx=lerp(e.vx,0,clamp(dt*14,0,1));
        if(e.stateTimer<=0)e.aiState=hasLOS?"CHASE":"SEARCH";
      }else{
        if(!hasLOS&&dist<500){e.aiState="SEARCH";e.vx=lerp(e.vx,0,clamp(dt*10,0,1));}
        else if(dist<620){e.aiState="CHASE";}
        else if(e.aiState!=="PATROL")e.aiState="IDLE";

        if(e.aiState==="CHASE"){
          const attackRange=e.type==="paper"?118:e.type==="elite"?108:88;
          const activeAttackers=world.enemies.filter(other=>other!==e&&other.alive&&!other.inactive&&["PREPARE_ATTACK","ATTACK_ACTIVE"].includes(other.aiState)&&Math.abs((other.x+other.w*.5)-playerCx)<430).length;
          const attackSlots=difficulty==="hard"?2:1;
          if(!bound&&dist<attackRange&&verticalDist<80&&hasLOS&&e.attackTimer<=0&&activeAttackers<attackSlots){
            e.aiState="PREPARE_ATTACK";e.windupTotal=e.type==="paper" ? .46 : e.type==="elite" ? .42 : .34;e.stateTimer=e.windupTotal;e.windup=e.stateTimer;e.vx*=.18;
          }else{
            const block=wallAhead(e,dir,12),edge=!groundAhead(e,dir,14,38);
            if(block||edge){e.aiState="BLOCKED";e.stateTimer=.28;e.vx=0;}
            else e.vx=lerp(e.vx,dir*e.speed,clamp(dt*6,0,1));
          }
        }else if(e.aiState==="PATROL"){
          const pdir=e.desiredDir||1;
          if(wallAhead(e,pdir,10)||!groundAhead(e,pdir,12,34)){e.aiState="TURN";e.stateTimer=.22;e.vx=0;}
          else e.vx=lerp(e.vx,pdir*e.speed*.42,clamp(dt*4,0,1));
          if(e.stateTimer<=0)e.aiState="IDLE";
        }else if(e.aiState==="SEARCH"){
          e.vx=lerp(e.vx,0,clamp(dt*8,0,1));if(e.stateTimer<=0){e.stateTimer=.4;e.aiState="IDLE";}
        }else e.vx=lerp(e.vx,0,clamp(dt*8,0,1));
      }
    }

    e.windup=e.aiState==="PREPARE_ATTACK"?Math.max(e.stateTimer,0):0;
    if(bound)e.vx*=.34;
    const oldX=e.x;e.x+=e.vx*dt;
    const hitWall=resolveHorizontalAgainstWalls(e,oldX);
    if(hitWall&&!['PREPARE_ATTACK','ATTACK_ACTIVE','RECOVERY'].includes(e.aiState)){e.aiState="BLOCKED";e.stateTimer=.28;}
    resolveEntityVertical(e,dt);

    const moved=Math.abs(e.x-(e.lastPositionX??e.x));
    if(Math.abs(e.vx)>12&&moved<.35)e.stuckTimer=(e.stuckTimer||0)+dt;else e.stuckTimer=Math.max(0,(e.stuckTimer||0)-dt*2);
    e.lastPositionX=e.x;
    if(e.stuckTimer>.42){
      const safe=e.lastValidGroundPosition;
      if(safe){e.x=safe.x;e.y=safe.y;e.vx=0;e.vy=0;e.grounded=true;e.groundY=safe.groundY;}
      else snapEntityToGround(e,true);
      e.stuckTimer=0;e.aiState="TURN";e.stateTimer=.28;e.desiredDir*=-1;
    }
    if(window.Motion?.EnemyMotor)window.Motion.EnemyMotor.afterMove(e,dt);
  }
}

function updateProjectiles(dt){
  for(let i=world.projectiles.length-1;i>=0;i--){
    const p=world.projectiles[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.groundWave){const gp=getPrimaryGroundAt(p.x);if(gp)p.y=gp.y-20;}p.life-=dt;
    if(p.owner==="enemy"&&rectsOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2},getPlayerHurtbox())){ damagePlayer(p.damage,Math.sign(p.vx)); p.life=0; }
    if(p.owner==="player"){
      p.hitTargets||(p.hitTargets=new Set());
      for(const e of world.enemies){ if(e.alive&&!p.hitTargets.has(e)&&rectsOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2},e)){
        const scale=enemyLampDamageScale(e);p.hitTargets.add(e);
        if(scale>0){const dmg=p.damage*scale;e.hp-=dmg;e.hurt=.18;sound.hit();createBurst(p.x,p.y,scale>1.1?"#e6c77b":p.color,6);if(e.hp<=0)killEnemy(e);} 
        if((p.pierce||0)>0)p.pierce--;else p.life=0;break;
      } }
      const bossBox=getBossHurtbox(world.boss);
      if(world.bossActive&&world.boss&&!world.bossDefeated&&world.boss.phaseTransition<=0&&!p.hitTargets.has(world.boss)&&bossBox&&rectsOverlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2},bossBox)){
        p.hitTargets.add(world.boss);if(world.boss.voiceTrial){p.life=0;continue;}world.boss.hp-=p.damage;sound.bossHit(false);bossNarrativeBeat(world.boss,"first_hit","“阿砚。”");hitStop=Math.max(hitStop,.028);shake=Math.max(shake,4);
        if((p.pierce||0)>0)p.pierce--;else p.life=0;if(world.boss.hp<=0)defeatBoss();
      }
    }
    if(p.life<=0||p.y>760) world.projectiles.splice(i,1);
  }
}

function updateFields(dt){
  for(let i=world.fields.length-1;i>=0;i--){
    const f=world.fields[i];f.life-=dt;f.tick-=dt;
    const pulse=f.tick<=0;
    for(const e of world.enemies){
      if(!e.alive)continue;const dx=f.x-(e.x+e.w/2),dy=f.y-(e.y+e.h/2),d=Math.hypot(dx,dy);
      if(d<f.r){e.x+=Math.sign(dx)*Math.min(58,Math.abs(dx))*dt;if(pulse){const scale=enemyLampDamageScale(e);if(scale>0){const dmg=f.damage*scale;e.hp-=dmg;e.hurt=.18;world.floaters.push({x:e.x+e.w/2,y:e.y-4,text:`${Math.round(dmg)}`,life:.65,max:.65,vy:-28,color:scale>1.1?"#e6c77b":"#a9d8df"});if(e.hp<=0)killEnemy(e);}}}
    }
    const b=world.boss;if(b&&world.bossActive&&!world.bossDefeated&&b.phaseTransition<=0&&!b.voiceTrial){const bh=getBossHurtbox(b),bx=bh?bh.x+bh.w*.5:b.x+b.w*.5,by=bh?bh.y+bh.h*.5:b.y+b.h*.5;const d=Math.hypot(f.x-bx,f.y-by);if(d<f.r+80&&pulse){b.hp-=f.damage*.65;b.hurt=.14;bossNarrativeBeat(b,"first_hit","“阿砚。”");hitStop=Math.max(hitStop,.045);shake=Math.max(shake,6);impactFlash=Math.max(impactFlash,.06);if(b.hp<=0)defeatBoss();}}
    if(pulse){f.tick=.46;createBurst(f.x+rand(-f.r*.5,f.r*.5),f.y-rand(0,50),"#8fc7d2",3);}
    if(f.life<=0)world.fields.splice(i,1);
  }
}

function bossNarrativeBeat(b,id,text){
  if(!b)return false;
  b.storyBeats||(b.storyBeats=new Set());
  if(b.storyBeats.has(id))return false;
  b.storyBeats.add(id);
  showToast(text,1.8);
  window.AudioManager?.play('boss_voice_whisper',{volume:.55});
  return true;
}

function beginBoss(){
  const maxHp=300*difficultyValues[difficulty].enemyHealth;
  world.bossActive=true;
  world.boss={
    x:6470,y:350,w:330,h:225,hp:maxHp,maxHp,uiHp:maxHp,
    timer:1.2,windup:0,attackFlash:0,dash:0,dashTotal:.48,hurt:0,
    phase:1,lastPhase:1,pendingPhase:null,transitionFrom:1,transitionTo:1,
    phaseTransition:0,phaseTransitionTotal:.58,lastAttackId:null,queuedAttackId:null,telegraphKind:null,telegraphLabel:"",telegraphDir:-1,telegraphTotal:0,attackRepeat:0,voiceTrial:false,voiceTrialDone:false,voiceProbe:[0,0,0],voiceRevealed:[false,false,false],voiceCorrect:1,voiceHitHint:false,voiceControlHintShown:false,storyBeats:new Set()
  };
  sound.boss(); shake=18; queueDialogue("百口灯妖",["阿——砚——", "这些声音里，有一个属于你。"]); showToast("首领：百口灯妖",3);
}

function chooseBossAttack(b){
  const pools={
    1:["triple","wideTriple"],
    2:["fan","fanWave","doubleWave"],
    3:["dashVolley","rageFan","dashWave"]
  };
  let pool=pools[b.phase]||pools[1];
  if(pool.length>1&&b.lastAttackId)pool=pool.filter(id=>id!==b.lastAttackId);
  return pool[Math.floor(Math.random()*pool.length)]||pools[b.phase][0];
}
function bossAttackMeta(id){
  const table={
    triple:{kind:"volley",windup:.62,label:"三口聚光"},wideTriple:{kind:"volley",windup:.70,label:"散口聚光"},
    fan:{kind:"volley",windup:.58,label:"百口齐鸣"},fanWave:{kind:"ground",windup:.66,label:"灯声压地"},doubleWave:{kind:"ground",windup:.70,label:"双向灯潮"},
    dashVolley:{kind:"dash",windup:.50,label:"黑灯扑身"},rageFan:{kind:"volley",windup:.48,label:"乱口追声"},dashWave:{kind:"dash",windup:.52,label:"黑灯踏浪"}
  };
  return table[id]||{kind:"volley",windup:.56,label:"灯口聚光"};
}
function queueBossAttack(b){
  if(b.queuedAttackId)return b.queuedAttackId;
  const id=chooseBossAttack(b),meta=bossAttackMeta(id);
  b.queuedAttackId=id;b.telegraphKind=meta.kind;b.telegraphLabel=meta.label||"";b.telegraphTotal=meta.windup;
  b.telegraphDir=Math.sign(player.x-(b.x+b.w*.5))||-1;b.windup=meta.windup;
  return id;
}

function bossAttack(b){
  const attackId=b.queuedAttackId||chooseBossAttack(b);
  const attackKind=b.telegraphKind||bossAttackMeta(attackId).kind||"volley";
  b.lastAttackId=attackId;b.queuedAttackId=null;b.telegraphKind=null;b.telegraphLabel="";
  b.attackFlash=.32;shake=Math.max(shake,5.5);sound.bossAttack(attackKind);
  if(/Wave/.test(attackId)||attackId==="fanWave")kickCamera(0,5);
  else if(/dash/i.test(attackId))kickCamera((b.telegraphDir||-1)*6,-2);
  else kickCamera((b.telegraphDir||-1)*2.5,-1);
  const origin={x:b.x+b.w*.5,y:b.y+(b.phase===1?96:b.phase===2?118:76)};
  const aim=Math.atan2((getPlayerHurtbox().y+getPlayerHurtbox().h*.5)-origin.y,(getPlayerHurtbox().x+getPlayerHurtbox().w*.5)-origin.x);
  const speedMul=difficultyValues[difficulty].bossProjectileSpeed||1;
  const volleyMul=difficultyValues[difficulty].bossVolley||1;
  const shot=(a,speed=285,r=10,damage=13,life=4,color="#c5763a")=>pushProjectile({x:origin.x,y:origin.y,vx:Math.cos(a)*speed*speedMul,vy:Math.sin(a)*speed*speedMul,r,damage,owner:"enemy",life,color});
  const groundWave=(dir=-1,speed=390)=>{const gp=getPrimaryGroundAt(b.x+b.w*.5);pushProjectile({x:b.x+b.w*.5,y:(gp?gp.y:610)-20,vx:dir*speed*speedMul,vy:0,r:17,damage:15,owner:"enemy",life:1.45,color:"#37202a",groundWave:true});};
  const oddCount=base=>{let n=Math.max(3,Math.round(base*volleyMul));if(n%2===0)n+=1;return n;};
  const fan=(count,center,spread,speed,r,damage,life,color)=>{const half=(count-1)/2;for(let i=0;i<count;i++)shot(center+(i-half)*spread,speed,r,damage,life,color);};

  if(attackId==="triple"){
    fan(3,aim,.15,245,10,12,4,"#d3913f");
  }else if(attackId==="wideTriple"){
    fan(3,aim,.27,230,10,12,4,"#c88945");
  }else if(attackId==="fan"){
    fan(oddCount(7),Math.PI,.18,278,10,13,3.7,"#c5763a");
  }else if(attackId==="fanWave"){
    fan(oddCount(5),Math.PI,.24,270,10,13,3.7,"#bd6b39");
    groundWave(-1,360);
  }else if(attackId==="doubleWave"){
    fan(3,aim,.20,255,10,13,3.5,"#bf7840");
    groundWave(-1,350);groundWave(1,330);
  }else if(attackId==="rageFan"){
    fan(oddCount(5),aim,.22,310,10,15,3.2,"#9d3532");
  }else{
    b.dash=.48;b.dashTotal=.48;b.dashDir=b.telegraphDir||Math.sign(player.x-(b.x+b.w*.5))||-1;
    if(attackId==="dashVolley"){for(let i=-2;i<=2;i++)shot(aim+i*.22,315,10,15,3.3,"#9d3532");}
    else groundWave(-b.dashDir,365);
  }
}

function updateBoss(dt){
  const b=world.boss; if(!world.bossActive||!b||world.bossDefeated)return;
  if(b.dying){
    b.deathTimer=Math.max(0,(b.deathTimer||0)-dt);
    b.windup=0;b.dash=0;b.timer=999;b.attackFlash=0;b.hurt=0;
    if(b.deathTimer<=0)finalizeBossDefeat();
    return;
  }
  b.hurt=Math.max(0,b.hurt-dt);b.attackFlash=Math.max(0,b.attackFlash-dt);
  b.uiHp=lerp(b.uiHp??b.hp,b.hp,clamp(dt*8,0,1));
  const desiredPhase=b.hp<b.maxHp*.32?3:b.hp<b.maxHp*.65?2:1;

  // Phase behavior is locked until the visual transition completes. The old
  // implementation changed b.phase immediately, so Phase 02 AI could start on
  // the same frame that Phase 01 art disappeared.
  if(!b.pendingPhase&&desiredPhase!==b.phase){
    b.pendingPhase=desiredPhase;b.transitionFrom=b.phase;b.transitionTo=desiredPhase;
    b.phaseTransition=b.phaseTransitionTotal||.58;b.windup=0;b.dash=0;b.timer=.55;b.queuedAttackId=null;b.telegraphKind=null;b.telegraphLabel="";b.telegraphTotal=0;
    showToast(desiredPhase===2?"戏台展开，满城低语从灯幕后涌出":"灯幕伏地，黑灯开始追猎",2.4);
    sound.bossPhase();
    if(desiredPhase===2){window.AudioManager?.play('gong_low',{volume:.22});window.AudioManager?.play('temple_bell_far',{volume:.18});}
    if(desiredPhase===3){bossNarrativeBeat(b,"phase3","“不是你的名字。”");window.AudioManager?.play('ferry_water',{volume:.16});}
    shake=Math.max(shake,9);kickCamera(0,-7);impactFlash=Math.max(impactFlash,.07);
  }

  const bossGround=getPrimaryGroundAt(b.x+b.w*.5);
  if(bossGround){b.groundY=bossGround.y;b.y=bossGround.y-b.h;}

  if(b.phaseTransition>0){
    b.phaseTransition=Math.max(0,b.phaseTransition-dt);
    if(b.phaseTransition<=0&&b.pendingPhase){
      b.phase=b.pendingPhase;b.lastPhase=b.phase;b.pendingPhase=null;b.timer=.62;b.windup=0;b.dash=0;b.queuedAttackId=null;b.telegraphKind=null;b.telegraphLabel="";b.telegraphTotal=0;
      if(b.phase===2&&!b.voiceTrialDone){
        b.voiceTrial=true;b.voiceProbe=[0,0,0];b.voiceRevealed=[false,false,false];b.timer=999;
        bossNarrativeBeat(b,"voice_trial","“第七个。”");
      }
    }
    return;
  }

  if(b.voiceTrial){
    if(!b.voiceControlHintShown){
      b.voiceControlHintShown=true;
      showGuidance("灯妖进入虚相","血条锁住，裁魂尺无效。举灯扫过三张嘴，找出真正叫『阿砚』的声音。",player.lampHeld?"W / S 扫描光束":"Q 举灯　W / S 扫描",5.2);
    }
    const mouths=[{x:b.x+72,y:b.y+78,label:"师父"},{x:b.x+b.w*.5,y:b.y+52,label:"阿砚"},{x:b.x+b.w-72,y:b.y+82,label:"第七个"}];
    let active=-1,bestDiff=Infinity;const lp=lampPose();
    for(let i=0;i<mouths.length;i++){
      const dx=mouths[i].x-lp.x,dy=mouths[i].y-lp.y,d=Math.hypot(dx,dy);
      if(d>500)continue;
      const diff=Math.abs(normalizeAngle(Math.atan2(dy,dx)-lp.angle));
      if(diff<.5&&diff<bestDiff){bestDiff=diff;active=i;}
    }
    for(let i=0;i<3;i++)b.voiceProbe[i]=clamp((b.voiceProbe[i]||0)+(active===i?dt:-dt*1.5),0,.8);
    if(active>=0&&b.voiceProbe[active]>.18&&!b.voiceRevealed[active]){
      b.voiceRevealed[active]=true;sound.bossMouth();
      world.floaters.push({x:mouths[active].x,y:mouths[active].y-18,text:`“${mouths[active].label}……”`,life:1.35,max:1.35,vy:-12,color:active===1?"#ffe09a":"#a98b82"});
    }
    if(active>=0&&b.voiceProbe[active]>.58){
      if(active===b.voiceCorrect){
        b.voiceTrial=false;b.voiceTrialDone=true;b.timer=.85;b.voiceProbe=[0,0,0];sound.lantern();shake=14;createBurst(mouths[active].x,mouths[active].y,"#f2c86b",24);
        showToast("这一声只是在叫你——阿砚。",2.6);
      }else{
        b.voiceProbe[active]=0;damagePlayer(7,Math.sign(player.x-(b.x+b.w*.5))||-1);window.AudioManager?.play('boss_voice_whisper',{volume:.38});showToast("那不是属于你的声音。灯光被一口冷气弹了回来");
      }
    }
    return;
  }

  if(b.dash>0){
    b.dash=Math.max(0,b.dash-dt);
    const progress=clamp(1-b.dash/(b.dashTotal||.48),0,1);
    // Smooth ease-out velocity: strong start, controlled finish, no hard stop.
    const dashSpeed=620*Math.pow(1-progress,1.35)+90*Math.sin(progress*Math.PI);
    b.x+=b.dashDir*dashSpeed*dt;
    if(progress>.18&&progress<.82&&Math.floor(progress*12)%2===0)createBurst(b.x+b.w/2,(b.groundY||610)-12,"#30202a",1);
    b.x=clamp(b.x,6070,6950);return;
  }
  if(b.windup>0){b.windup=Math.max(0,b.windup-dt);if(b.windup<=0)bossAttack(b);return;}
  b.timer-=dt;
  if(b.timer<=0){
    queueBossAttack(b);
    b.timer=b.phase===1?2.50:b.phase===2?2.10:1.78;
  }
}

function defeatBoss(){
  const b=world.boss;
  if(!b||b.dying||world.bossDefeated)return;
  b.hp=0;b.dying=true;b.deathTotal=.92;b.deathTimer=b.deathTotal;
  b.windup=0;b.dash=0;b.queuedAttackId=null;b.telegraphKind=null;
  world.projectiles=[];world.fields=[];shake=22;sound.bossDeath();
  createBurst(b.x+b.w*.5,b.y+b.h*.48,"#e7bb58",22);
}
function finalizeBossDefeat(){
  const b=world.boss;
  if(!b||world.bossDefeated)return;
  b.dying=false;
  world.bossDefeated=true;world.bossActive=false;world.projectiles=[];world.fields=[];sound.lantern();
  createBurst(b.x+b.w*.5,b.y+b.h*.72,"#e7bb58",42);world.lanternsRecovered=Math.max(world.lanternsRecovered,1);
  queueDialogue("无名客",["第一盏灯归位了，但雨没有停。","戏楼的幕布后，还有人在借别人的脸说话。"]);
  showGuidance("前往无面戏楼","百口灯妖只是第一道门。继续向右，六盏灯的余烬正把路照亮。","向右前进",5);
  // Clearing the first act is a progression boundary. Continue now begins at
  // the entrance to the opera house instead of the opening workshop.
  saveGame({resumeRegion:"opera",advanceCheckpoint:true});
}

function updateParticles(dt){
  for(let i=world.particles.length-1;i>=0;i--){
    const p=world.particles[i];
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.type==='paper'){p.vx+=Math.sin((gameTime+i)*3.1)*22*dt;p.vy+=240*dt;p.rot=(p.rot||0)+(p.vr||0)*dt;}
    else if(p.type==='spark'){p.vx*=Math.pow(.06,dt);p.vy+=180*dt;}
    else p.vy+=420*dt;
    p.life-=dt;if(p.life<=0)world.particles.splice(i,1);
  }
  for(let i=world.spriteFx.length-1;i>=0;i--){const f=world.spriteFx[i];f.life-=dt;if(f.life<=0)world.spriteFx.splice(i,1);}
  for(let i=world.floaters.length-1;i>=0;i--){const f=world.floaters[i];f.y+=f.vy*dt;f.vy*=.96;f.life-=dt;if(f.life<=0)world.floaters.splice(i,1);}
}

function update(dt){
  gameTime+=dt;impactFlash=Math.max(0,impactFlash-dt);impactSpot.life=Math.max(0,(impactSpot.life||0)-dt);
  cameraKickX=lerp(cameraKickX,0,1-Math.exp(-18*dt));cameraKickY=lerp(cameraKickY,0,1-Math.exp(-20*dt));
  lanternWarningTimer=Math.max(0,lanternWarningTimer-dt);world.combatReleaseTimer=Math.max(0,(world.combatReleaseTimer||0)-dt);player.paperHurtFlash=Math.max(0,(player.paperHurtFlash||0)-dt);if(world.clueReaction?.timer>0){world.clueReaction.timer=Math.max(0,world.clueReaction.timer-dt);world.clueReaction.active=world.clueReaction.timer>0;}if(guidance.timer>0)guidance.timer-=dt; if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toastEl.classList.remove("visible");}
  sound.update(world.epilogueActive?"epilogue":world.currentRegion,dt);
  if(hitStop>0){hitStop=Math.max(0,hitStop-dt);pressed.clear();released.clear();return;}
  if(state!=="playing"||currentDialogue){pressed.clear();released.clear();return;}
  if(world.endingChoiceActive){
    if(pressed.has("escape")){world.endingChoiceActive=false;showToast("第七盏灯仍在等你",1.8);}
    if(pressed.has("a")||pressed.has("w")){world.endingChoiceIndex=(world.endingChoiceIndex+ENDING_CHOICES.length-1)%ENDING_CHOICES.length;sound.play("ui_select",{volume:.18});}
    if(pressed.has("d")||pressed.has("s")){world.endingChoiceIndex=(world.endingChoiceIndex+1)%ENDING_CHOICES.length;sound.play("ui_select",{volume:.18});}
    if(pressed.has("e")){const choice=ENDING_CHOICES[world.endingChoiceIndex];beginEpilogue(choice.id);}
    pressed.clear();released.clear();return;
  }
  if(pressed.has("escape")){ saveForSuspend();clearTransientInputState();state="paused";showPanel(pausePanel);return; }
  if(window.Motion)window.Motion.beforeUpdate(dt);
  if((player.interactCandidates?.length||0)>1){
    if(pressed.has("arrowup")||(!lampIsFocused()&&pressed.has("w")))cycleInteraction(-1);
    if(pressed.has("arrowdown")||(!lampIsFocused()&&pressed.has("s")))cycleInteraction(1);
  }
  if(pressed.has("e")) interact();
  if(!world.epilogueActive&&pressed.has("q")&&!player.dead&&!window.Motion?.interacting()){
    if(world.lampAcquired){
      setLampFocused(!world.lamp.focused);sound.lantern(world.lamp.focused?"raise":"lower");
      if(world.lamp.focused)world.tutorialFlags.lampRaisedOnce=true;
      showToast(world.lamp.focused?"引路灯已举起——W / S 可调整照射方向":"引路灯已收低");
    } else if(Math.hypot(player.x+20-world.lamp.x,player.y+34-world.lamp.y)<78){setLampHeld(true);sound.pickup();showToast("引路灯回应了你");}
  }
  if(!world.epilogueActive&&pressed.has("j")&&!window.Motion?.interacting()){
    if(player.attack){
      const ap=player.attack.time/Math.max(.001,player.attack.total);
      if(ap>.42){player.attackBuffer=.20;player.attackBufferHeld=0;}
    }else{player.charging=true;player.chargeLevel=0;player.chargeCue=0;jHoldStart=performance.now();}
  }
  if(player.charging){
    const held=performance.now()-jHoldStart,next=held>=1000?2:held>=430?1:0;player.chargeLevel=next;
    if(next>player.chargeCue){player.chargeCue=next;sound.play("ruler_charge",{volume:next===2?.55:.38,rate:next===2?1.08:.92});createBurst(player.x+20,player.y+38,next===2?"#f4cf72":"#c85a42",next===2?10:6);}
  }
  if(!world.epilogueActive&&released.has("j")&&player.charging){const held=performance.now()-jHoldStart;player.charging=false;player.chargeLevel=0;startAttack(held);}
  if(!world.epilogueActive&&pressed.has("l")&&!player.dead){
    const attackProgress=player.attack?(player.attack.time/player.attack.total):1;
    const earlyThirdCancel=!!player.attack&&!player.attack.charged&&player.attack.step===3&&player.attack.time<=FIXED_DT*3.1;
    const cancelPoint=player.attack?.charged?.72:.55;
    const lateCancel=!player.attack||attackProgress>cancelPoint;
    if(earlyThirdCancel||lateCancel){
      const inputDir=(keys.a&&!keys.d)?-1:(keys.d&&!keys.a)?1:-player.facing;
      player.attack=null;player.charging=false;player.attackBuffer=0;player.dodging=.24;player.dodgeDirection=inputDir;player.invuln=difficultyValues[difficulty].dodgeInvuln;sound.dodge();
    }
  }
  updateChapterMechanisms(dt);updatePlayer(dt);updateEpilogue(dt);
  if(["opera","bamboo","ferry","city","final"].includes(world.currentRegion)&&!world.bossActive&&!world.epilogueActive&&!player.attack&&!player.charging&&Math.abs(player.vx)<24)routeHintIdle=Math.min(9,routeHintIdle+dt);
  else routeHintIdle=Math.max(0,routeHintIdle-dt*2.5);
  if(player.grounded&&Math.abs(player.vx)>65&&!player.dodging){sound.stepTimer-=dt;if(sound.stepTimer<=0){const g=getPrimaryGroundAt(player.x+player.w*.5);sound.footstep(g?.kind||g?.surfaceType||"stone",Math.abs(player.vx));sound.stepTimer=Math.abs(player.vx)>175?.22:.31;}}else sound.stepTimer=Math.min(sound.stepTimer,.08);
  if(!world.epilogueActive){
    updateEnemies(dt);
    const pressure=world.enemies.filter(e=>e.alive&&!e.inactive&&Math.abs(e.x-player.x)<190).length;
    const stabilityTarget=(world.combatReleaseTimer||0)>0?1:clamp(1-pressure*.22,0.38,1);
    world.lamp.stable=lerp(world.lamp.stable,stabilityTarget,clamp(dt*5,0,1));
    if(world.lamp.stable<.50&&!lanternWarningLatched){
      lanternWarningLatched=true;lanternWarningTimer=.9;sound.lantern("unstable");
    }else if(world.lamp.stable>.62)lanternWarningLatched=false;
    updateProjectiles(dt); updateFields(dt); updateBoss(dt);
  }else{
    world.lamp.stable=lerp(world.lamp.stable,1,clamp(dt*4,0,1));
  }
  updateParticles(dt);
  if(world.endingTimer>0){world.endingTimer-=dt;if(world.endingTimer<=0&&world.epilogueActive){world.epilogueActive=false;world.epilogueComplete=true;state="ending";try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(SAVE_BACKUP_KEY);continueBtn.classList.add("hidden");}catch(_e){}}}
  if(window.Motion)window.Motion.afterUpdate(dt);
  else {const target=clamp(player.x-W*.38,0,world.width-W);cameraX=lerp(cameraX,target,clamp(dt*4.5,0,1));}
  shake=Math.max(0,shake-dt*28); pressed.clear();released.clear();
}

function strokeLine(points,color="#111",width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.stroke();}

function drawBackground(){
  const zoneX=cameraX+W/2; let top="#101b22",bottom="#263c45";
  if(zoneX<1100){top="#302c25";bottom="#8a7351";} else if(zoneX>5850){top="#150f17";bottom="#42202a";} else if(zoneX>3400){top="#101d22";bottom="#29414a";}
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-cameraX*.18,0);ctx.fillStyle="#08101488";
  for(let i=0;i<18;i++){const x=i*470-150,hh=120+(i%4)*55;ctx.fillRect(x,480-hh,360,hh);ctx.beginPath();ctx.moveTo(x-30,480-hh);ctx.lineTo(x+180,410-hh);ctx.lineTo(x+390,480-hh);ctx.fill();}
  ctx.restore();
  if(zoneX>=1050){
    ctx.strokeStyle="#b9d1d733";ctx.lineWidth=1.3;const off=(gameTime*440)%55;
    for(let i=0;i<85;i++){const x=(i*97-cameraX*.08)%W,y=(i*53+off)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-13,y+32);ctx.stroke();}
  }
  ctx.fillStyle="#dce2d50a";for(let i=0;i<20;i++)ctx.fillRect((i*173+Math.sin(gameTime+i)*25)%W,(i*83)%H,2,2);
}

function drawArchitecture(){
  ctx.save();ctx.translate(-cameraX,0);
  if(cameraX<1250){
    ctx.fillStyle="#443b2e";ctx.fillRect(0,120,1060,490);ctx.fillStyle="#261f1b";ctx.fillRect(30,150,980,430);
    ctx.strokeStyle="#78674d";ctx.lineWidth=9;for(let x=70;x<1040;x+=190){ctx.beginPath();ctx.moveTo(x,150);ctx.lineTo(x,600);ctx.stroke();}
    ctx.fillStyle="#d6c5a4";for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(120+i*105,250+(i%2)*10,28,43,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3c2923";ctx.fillRect(111+i*105,250,18,8);ctx.fillStyle="#d6c5a4";}
    ctx.fillStyle="#5d4c36";ctx.fillRect(360,525,380,18);ctx.fillRect(380,543,15,67);ctx.fillRect(700,543,15,67);
    ctx.fillStyle="#171717";ctx.fillRect(990,260,70,350);ctx.fillStyle="#8f2f28";ctx.fillRect(1002,280,12,210);
  }
  if(cameraX+W>1050){
    for(let x=1120;x<5700;x+=420){
      const base=610,h=180+(x/420%3)*38;ctx.fillStyle=x%840?"#15232a":"#1c2a2e";ctx.fillRect(x,base-h,340,h);
      ctx.fillStyle="#0a1114";ctx.beginPath();ctx.moveTo(x-35,base-h);ctx.lineTo(x+170,base-h-70);ctx.lineTo(x+375,base-h);ctx.fill();
      ctx.fillStyle="#d39a4766";for(let wx=x+45;wx<x+300;wx+=105)ctx.fillRect(wx,base-h+65,38,58);
    }
    ctx.fillStyle="#10222b";ctx.fillRect(2050,612,430,120);ctx.fillStyle="#42606b66";for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(2080+i*50,650,70,14,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle="#d0bd8a66";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(4740,460);ctx.lineTo(4790,430);ctx.lineTo(4840,450);ctx.stroke();ctx.beginPath();ctx.moveTo(4960,400);ctx.lineTo(5010,370);ctx.stroke();ctx.beginPath();ctx.moveTo(5180,520);ctx.lineTo(5230,490);ctx.lineTo(5280,515);ctx.stroke();
  }
  if(cameraX+W>5850){
    ctx.fillStyle="#0d0d12";ctx.fillRect(6000,200,1300,410);ctx.fillStyle="#28151b";ctx.beginPath();ctx.moveTo(5920,220);ctx.lineTo(6650,40);ctx.lineTo(7380,220);ctx.fill();
    ctx.strokeStyle="#74352f";ctx.lineWidth=7;for(let x=6100;x<7300;x+=230){ctx.beginPath();ctx.moveTo(x,220);ctx.lineTo(x,610);ctx.stroke();}
  }
  ctx.restore();
}

function drawPlatforms(){
  ctx.save();ctx.translate(-cameraX,0);
  for(const p of world.platforms){
    ctx.fillStyle=p.kind==="wood"?"#544631":p.kind==="boss"?"#281b20":"#27373a";ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.strokeStyle=p.kind==="roof"?"#71868a":"#101719";ctx.lineWidth=4;ctx.strokeRect(p.x,p.y,p.w,p.h);
    ctx.strokeStyle="#aeb3a51f";ctx.lineWidth=2;for(let x=p.x+18;x<p.x+p.w;x+=42){ctx.beginPath();ctx.moveTo(x,p.y+5);ctx.lineTo(x+15,p.y+p.h-4);ctx.stroke();}
  }
  if(!world.doorOpen){ctx.fillStyle="#171311";ctx.fillRect(1005,270,46,340);ctx.fillStyle="#b33c31";ctx.fillRect(1012,370,32,92);ctx.fillStyle="#decda8";ctx.font="22px serif";ctx.fillText("封",1017,425);}
  if(world.wallHp>0){ctx.fillStyle="#465257";ctx.fillRect(4385,470,45,140);ctx.strokeStyle="#151b1d";ctx.lineWidth=4;strokeLine([[4390,480],[4415,510],[4395,545],[4420,575]],"#161c1e",4);}
  if(!world.gateOpen){ctx.fillStyle="#202426";ctx.fillRect(5590,310,55,300);ctx.fillStyle="#b74234";for(let y=345;y<580;y+=65)ctx.fillRect(5600,y,35,45);}
  if(world.bossActive&&!world.bossDefeated){ctx.fillStyle="#6c1e2499";ctx.fillRect(5990,250,22,360);}
  ctx.restore();
}

function drawProps(){
  ctx.save();ctx.translate(-cameraX,0);
  for(const o of world.lore){ctx.fillStyle=o.critical?"#d8c49b":"#8a7456";ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle="#33281f";ctx.strokeRect(o.x,o.y,o.w,o.h);if(!o.seen){ctx.fillStyle="#e4b757";ctx.beginPath();ctx.arc(o.x+o.w/2,o.y-8,3+Math.sin(gameTime*4),0,Math.PI*2);ctx.fill();}}
  for(const c of world.checkpoints){
    ctx.strokeStyle="#3a2b26";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(c.x,c.y+90);ctx.lineTo(c.x,c.y+20);ctx.stroke();
    ctx.fillStyle=c.lit?"#f0b84f":"#3c4340";ctx.beginPath();ctx.ellipse(c.x,c.y+15,21,30,0,0,Math.PI*2);ctx.fill();
    if(c.lit){ctx.fillStyle="#ffd97a44";ctx.beginPath();ctx.arc(c.x,c.y+15,52+Math.sin(gameTime*3)*4,0,Math.PI*2);ctx.fill();}
  }
  for(const s of world.switches){ctx.strokeStyle="#191c1d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(s.x,s.y+32);ctx.lineTo(s.x,s.y-10);ctx.stroke();ctx.fillStyle=s.lit?"#efb24c":"#4c5150";ctx.beginPath();ctx.ellipse(s.x,s.y-13,17,24,0,0,Math.PI*2);ctx.fill();}
  for(const e of world.embers){if(!e.visible||e.collected||(e.id===1&&world.wallHp>0))continue;const bob=Math.sin(gameTime*3+e.id)*7;ctx.fillStyle="#ffd16655";ctx.beginPath();ctx.arc(e.x,e.y+bob,30,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffd166";ctx.beginPath();ctx.moveTo(e.x,e.y-18+bob);ctx.quadraticCurveTo(e.x+22,e.y+2+bob,e.x,e.y+20+bob);ctx.quadraticCurveTo(e.x-22,e.y+2+bob,e.x,e.y-18+bob);ctx.fill();}
  for(const d of world.drops){const def=weaponDef(d.type);const y=d.y+Math.sin(gameTime*3+d.bob)*5;ctx.fillStyle="#0d1416aa";ctx.fillRect(d.x-5,y-5,46,44);ctx.strokeStyle=def.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d.x+7,y+27);ctx.lineTo(d.x+30,y+5);ctx.stroke();ctx.fillStyle="#eac36b";ctx.beginPath();ctx.arc(d.x+18,y-8,3,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

function drawEnemy(e){
  if(!e.alive)return;const x=e.x-cameraX,y=e.y;ctx.save();if(e.hurt)ctx.globalAlpha=.55;
  if(e.type==="shadow"){
    ctx.fillStyle="#091014";ctx.beginPath();ctx.ellipse(x+24,y+31,29,22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+4,y+28);ctx.lineTo(x-8,y+8);ctx.lineTo(x+15,y+25);ctx.moveTo(x+42,y+28);ctx.lineTo(x+57,y+7);ctx.lineTo(x+31,y+25);ctx.fill();ctx.fillStyle="#d0a84d";ctx.fillRect(x+13,y+25,7,3);ctx.fillRect(x+30,y+25,7,3);
  }else if(e.type==="paper"){
    ctx.fillStyle="#bcb4a1";ctx.beginPath();ctx.moveTo(x+21,y);ctx.lineTo(x+40,y+18);ctx.lineTo(x+34,y+70);ctx.lineTo(x+8,y+70);ctx.lineTo(x+2,y+18);ctx.closePath();ctx.fill();ctx.strokeStyle="#292724";ctx.stroke();ctx.fillStyle="#8f342d";ctx.fillRect(x+9,y+22,25,5);ctx.fillStyle="#171717";ctx.fillRect(x+12,y+12,4,5);ctx.fillRect(x+27,y+12,4,5);
  }else{
    ctx.fillStyle="#1c2729";ctx.beginPath();ctx.moveTo(x+30,y);ctx.lineTo(x+56,y+22);ctx.lineTo(x+52,y+82);ctx.lineTo(x+8,y+82);ctx.lineTo(x+4,y+22);ctx.closePath();ctx.fill();ctx.strokeStyle="#96836a";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#a03930";ctx.fillRect(x+8,y+24,44,9);ctx.fillStyle="#e1c788";ctx.fillRect(x+18,y+12,6,5);ctx.fillRect(x+37,y+12,6,5);
  }
  if(e.windup>0){
    const q=clamp(1-e.windup/Math.max(.001,e.windupTotal||e.windup),0,1),cx=x+e.w/2,cy=y+e.h/2,dir=e.desiredDir||1;
    ctx.strokeStyle=q>.72?"#f2b36c":"#c34b3d";ctx.lineWidth=2+q*1.2;ctx.beginPath();ctx.arc(cx,cy,e.w*(.88-.18*q),0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.35+.55*q;ctx.beginPath();ctx.moveTo(cx+dir*10,cy);ctx.lineTo(cx+dir*(34+18*q),cy);ctx.stroke();ctx.globalAlpha=1;
  }
  if(e.hp<e.maxHp){ctx.fillStyle="#141414";ctx.fillRect(x,y-10,e.w,4);ctx.fillStyle="#a64035";ctx.fillRect(x,y-10,e.w*(e.hp/e.maxHp),4);}
  ctx.restore();
}

function drawBoss(){
  const b=world.boss;if(!b||world.bossDefeated)return;const x=b.x-cameraX,y=b.y;ctx.save();if(b.hurt)ctx.globalAlpha=.55;
  ctx.fillStyle="#c5a775";ctx.beginPath();ctx.moveTo(x+34,y+35);ctx.quadraticCurveTo(x+90,y-18,x+146,y+35);ctx.lineTo(x+164,y+182);ctx.quadraticCurveTo(x+90,y+230,x+16,y+182);ctx.closePath();ctx.fill();ctx.strokeStyle="#24181a";ctx.lineWidth=8;ctx.stroke();
  ctx.fillStyle="#21151a";ctx.beginPath();ctx.ellipse(x+90,y+120,58,32,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b73d31";ctx.lineWidth=5;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(x+47+i*12,y+112);ctx.lineTo(x+53+i*12,y+131);ctx.stroke();}
  for(let i=0;i<6;i++){ctx.fillStyle="#d5b05b";ctx.beginPath();ctx.ellipse(x-20+i*44,y+35+Math.sin(gameTime*2+i)*20,12,18,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

function drawPlayer(){
  const x=player.x-cameraX,y=player.y;ctx.save();if(player.invuln>0&&Math.floor(gameTime*18)%2)ctx.globalAlpha=.35;
  if(player.dodging>0){for(let i=1;i<4;i++){ctx.globalAlpha=.12/i;ctx.fillStyle="#d6cbb4";ctx.fillRect(x-player.facing*i*22,y+18,30,50);}ctx.globalAlpha=1;}
  const bob=player.grounded&&Math.abs(player.vx)>15?Math.sin(gameTime*14)*2:0;
  ctx.fillStyle="#d6c9ad";ctx.beginPath();ctx.arc(x+19,y+15+bob,13,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#121719";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#17272b";ctx.beginPath();ctx.moveTo(x+10,y+26+bob);ctx.lineTo(x+30,y+26+bob);ctx.lineTo(x+38,y+68);ctx.lineTo(x,y+68);ctx.closePath();ctx.fill();ctx.strokeStyle="#0b1012";ctx.stroke();
  ctx.strokeStyle="#171719";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+8,y+68);ctx.lineTo(x+6,y+72);ctx.moveTo(x+30,y+68);ctx.lineTo(x+33,y+72);ctx.stroke();
  ctx.fillStyle="#bb4133";ctx.fillRect(x+9,y+30,22,5);
  ctx.fillStyle="#efb44f";ctx.beginPath();ctx.ellipse(x+player.facing*3+18,y+49,7,10,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=player.weapon?player.weapon.color:"#d8d1bf";ctx.lineWidth=player.weapon&&player.weapon.type==="ruler"?9:4;ctx.beginPath();ctx.moveTo(x+20,y+39);ctx.lineTo(x+20+player.facing*(player.weapon?38:27),y+26);ctx.stroke();
  if(player.guarding){ctx.strokeStyle="#dfbd6a";ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+20+player.facing*18,y+38,28,-1.3,1.3);ctx.stroke();}
  if(player.charging){const t=clamp((performance.now()-jHoldStart)/430,0,1);ctx.strokeStyle=`rgba(225,75,55,${.3+t*.7})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+19,y+36,24+t*15,0,Math.PI*2);ctx.stroke();}
  if(player.attack){const a=player.attack;ctx.strokeStyle=a.color;ctx.lineWidth=a.charged?9:5;ctx.globalAlpha=.7;ctx.beginPath();if(a.kind==="plunge")ctx.arc(x+20,y+65,38,0,Math.PI);else ctx.arc(x+20,y+35,a.range*.72,player.facing>0?-1.15:1.95,player.facing>0?1.15:4.3);ctx.stroke();}
  ctx.restore();
}

function drawParticles(){ctx.save();ctx.translate(-cameraX,0);for(const p of world.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.restore();ctx.globalAlpha=1;}

function drawUI(){
  if(state==="menu")return;
  ctx.save();
  ctx.fillStyle="#081013bb";ctx.fillRect(24,24,300,78);ctx.strokeStyle="#70624d";ctx.strokeRect(24,24,300,78);
  ctx.fillStyle="#d8cab1";ctx.font="15px 'Microsoft YaHei'";ctx.fillText("命灯",48,51);
  ctx.fillStyle="#2b2220";ctx.fillRect(48,64,230,13);ctx.fillStyle=player.health>35?"#b44637":"#e06b45";ctx.fillRect(48,64,230*(player.health/player.maxHealth),13);
  ctx.fillStyle="#b9af9e";ctx.font="13px 'Microsoft YaHei'";ctx.fillText(`难度：${difficultyValues[difficulty].label}`,48,94);
  ctx.textAlign="right";ctx.fillText(player.weapon?`${player.weapon.name}  ${player.weapon.durability}`:"裁魂刀  ∞",305,94);ctx.textAlign="left";
  ctx.fillStyle="#081013bb";ctx.fillRect(W-260,24,236,78);ctx.strokeStyle="#70624d";ctx.strokeRect(W-260,24,236,78);
  ctx.fillStyle="#d8cab1";ctx.font="15px 'Microsoft YaHei'";ctx.fillText("灯芯火",W-235,54);
  for(let i=0;i<3;i++){ctx.fillStyle=i<world.emberCount?"#efb650":"#394244";ctx.beginPath();ctx.arc(W-150+i*35,49,10,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#9d9f97";ctx.font="13px 'Microsoft YaHei'";const objective=!world.noteFound?"调查师父留下的线索":!world.doorOpen?"离开纸扎铺":world.emberCount<3?"在雨巷寻找三缕灯芯火":!world.bossDefeated?"穿过封桥，寻找引魂灯":"第一盏灯已经归位";ctx.fillText(objective,W-235,85);
  if(player.interactTarget&&!currentDialogue){
    let label="调查";const k=player.interactTarget.kind;if(k==="drop")label=`拾取 ${weaponDef(player.interactTarget.obj.type).name}`;if(k==="checkpoint")label="点亮存档灯";if(k==="door")label="打开店门";if(k==="ember")label="取得灯芯火";if(k==="seventh")label="点亮第七盏灯";
    ctx.textAlign="center";ctx.fillStyle="#081013dd";ctx.fillRect(W/2-115,H-95,230,40);ctx.strokeStyle="#8d7b5e";ctx.strokeRect(W/2-115,H-95,230,40);ctx.fillStyle="#ece1c9";ctx.font="16px 'Microsoft YaHei'";ctx.fillText(`E  ${label}`,W/2,H-69);ctx.textAlign="left";
  }
  if(world.bossActive&&world.boss){ctx.fillStyle="#0a0c0ddd";ctx.fillRect(300,H-55,680,18);ctx.fillStyle="#9f342f";ctx.fillRect(304,H-51,672*(world.boss.hp/world.boss.maxHp),10);ctx.fillStyle="#e1d3ba";ctx.textAlign="center";ctx.font="16px serif";ctx.fillText("百 口 灯 妖",W/2,H-68);ctx.textAlign="left";}
  if(player.dead){ctx.fillStyle="#07090ad0";ctx.fillRect(0,0,W,H);ctx.fillStyle="#d9cdb7";ctx.textAlign="center";ctx.font="48px serif";ctx.fillText("灯火暂熄",W/2,H/2);ctx.font="16px sans-serif";ctx.fillStyle="#98958d";ctx.fillText("纸身正在重新拼合……",W/2,H/2+40);ctx.textAlign="left";}
  if(state==="ending"&&!currentDialogue){ctx.fillStyle="#060809e8";ctx.fillRect(0,0,W,H);ctx.fillStyle="#d8c6a7";ctx.textAlign="center";ctx.font="65px serif";ctx.fillText("第七盏灯",W/2,H/2-35);ctx.font="20px serif";ctx.fillStyle="#b5483b";ctx.fillText(world.finalChoice?"灯火归位":"未完待续",W/2,H/2+18);ctx.font="14px sans-serif";ctx.fillStyle="#8c8c84";ctx.fillText("按 E 返回标题",W/2,H/2+72);ctx.textAlign="left";}
  ctx.restore();
}

// ---------- Illustrated rendering pass ----------
function roundedRect(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function glow(x,y,r,color,alpha=.45){ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.35,color.replace(/\)$/,'') );g.addColorStop(1,"transparent");ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawLantern(x,y,scale=1,lit=true,sway=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(sway);ctx.scale(scale,scale);
  if(lit){const g=ctx.createRadialGradient(0,4,1,0,4,48);g.addColorStop(0,"#ffd37a99");g.addColorStop(1,"#e99a2700");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,4,48,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle="#1b1714";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(0,-24);ctx.stroke();
  const body=ctx.createLinearGradient(-17,0,18,0);body.addColorStop(0,lit?"#a73c2e":"#393b39");body.addColorStop(.5,lit?"#e7a14a":"#555b57");body.addColorStop(1,lit?"#8f2d29":"#303533");ctx.fillStyle=body;
  ctx.beginPath();ctx.moveTo(-14,-22);ctx.quadraticCurveTo(-25,0,-15,22);ctx.quadraticCurveTo(0,29,15,22);ctx.quadraticCurveTo(25,0,14,-22);ctx.quadraticCurveTo(0,-28,-14,-22);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#5a261f";ctx.lineWidth=1.4;for(let i=-10;i<=10;i+=5){ctx.beginPath();ctx.moveTo(i,-20);ctx.quadraticCurveTo(i*1.35,0,i,22);ctx.stroke();}
  ctx.fillStyle="#231a16";ctx.fillRect(-17,-25,34,5);ctx.fillRect(-17,22,34,5);ctx.beginPath();ctx.moveTo(-3,27);ctx.lineTo(3,27);ctx.lineTo(7,42);ctx.lineTo(-6,42);ctx.closePath();ctx.fill();ctx.restore();
}
function drawTiledRoof(x,y,w,depth=52,color="#10191d"){
  ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-45,y+depth);ctx.quadraticCurveTo(x+w*.5,y-22,x+w+45,y+depth);ctx.lineTo(x+w+18,y+depth+20);ctx.quadraticCurveTo(x+w*.5,y+depth-10,x-18,y+depth+20);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#54636a55";ctx.lineWidth=1.3;for(let i=0;i<12;i++){const px=x-24+i*(w+48)/11;ctx.beginPath();ctx.moveTo(x+w*.5,y-12);ctx.quadraticCurveTo(px,y+18,px,y+depth+16);ctx.stroke();}
  ctx.strokeStyle="#020608bb";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-38,y+depth);ctx.quadraticCurveTo(x+w*.5,y+depth-7,x+w+38,y+depth);ctx.stroke();ctx.restore();
}
function drawBackgroundV2(){
  const zone=cameraX+W*.5;
  if(drawSceneAsset(zone))return;
  if(!DEBUG_PLACEHOLDERS){ctx.fillStyle="#0b1216";ctx.fillRect(0,0,W,H);return;}
  let colors=zone<1080?["#171816","#5b4b36","#b68b56"]:zone>5850?["#090a10","#24121d","#54212b"]:zone>3400?["#07141a","#17313a","#36545d"]:["#08151d","#1b3440","#4c6265"];
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,colors[0]);sky.addColorStop(.62,colors[1]);sky.addColorStop(1,colors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const moonX=zone>5850?930:1040;glow(moonX,115,130,"#d9d6b5",.14);ctx.fillStyle=zone>5850?"#b34c43":"#d8d1b0";ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(moonX,115,34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.save();ctx.translate(-cameraX*.06,0);ctx.fillStyle="#07101399";ctx.beginPath();ctx.moveTo(-300,410);for(let i=0;i<22;i++){const x=-300+i*420;ctx.quadraticCurveTo(x+180,220-(i%3)*42,x+420,410);}ctx.lineTo(9000,610);ctx.lineTo(-300,610);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(-cameraX*.14,0);for(let i=0;i<23;i++){const x=i*410-250,h=150+(i%4)*36;ctx.fillStyle=i%2?"#0b171cbb":"#102126bb";ctx.fillRect(x,475-h,320,h);drawTiledRoof(x,430-h,320,42,"#081216cc");ctx.fillStyle="#c78c3c24";for(let j=0;j<3;j++){roundedRect(x+45+j*88,380-h,38,52,2);ctx.fill();}}ctx.restore();
  if(zone>1040){
    ctx.save();ctx.globalAlpha=.7;ctx.strokeStyle="#c9e1e766";ctx.lineCap="round";const off=(gameTime*500)%74;
    for(let i=0;i<120;i++){const x=(i*89-cameraX*.035)%1340-30,y=(i*47+off)%780-30;ctx.lineWidth=i%5===0?1.7:.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-14,y+38);ctx.stroke();}
    ctx.restore();
  }
  ctx.fillStyle="#d7e4df10";for(let i=0;i<42;i++){const x=(i*137+Math.sin(gameTime*.35+i)*30)%W,y=95+(i*73)%470;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.5,0,Math.PI*2);ctx.fill();}
}
function drawPaperShopV2(){
  ctx.save();ctx.translate(-cameraX,0);
  const wall=ctx.createLinearGradient(0,120,0,610);wall.addColorStop(0,"#59472f");wall.addColorStop(.45,"#34291f");wall.addColorStop(1,"#1d1a17");ctx.fillStyle=wall;ctx.fillRect(-40,105,1110,505);
  ctx.fillStyle="#171512";ctx.fillRect(18,145,1025,428);ctx.strokeStyle="#72593b";ctx.lineWidth=9;ctx.strokeRect(22,149,1018,420);
  ctx.strokeStyle="#60472f";ctx.lineWidth=8;for(let x=78;x<1000;x+=184){ctx.beginPath();ctx.moveTo(x,150);ctx.lineTo(x,575);ctx.stroke();}
  ctx.fillStyle="#251d18";ctx.fillRect(42,185,290,310);ctx.fillRect(760,185,232,310);
  for(let row=0;row<3;row++){ctx.fillStyle="#775b3d";ctx.fillRect(52,265+row*91,270,7);ctx.fillRect(770,265+row*91,212,7);}
  // Paper figures now read as crafted props rather than capsules.
  for(let i=0;i<8;i++){const px=73+(i%4)*70+(i>3?700:0),py=205+(i%2)*94;ctx.save();ctx.translate(px,py);ctx.fillStyle=i%3===0?"#c9b58d":"#ded2b7";ctx.strokeStyle="#3b2b23";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,13,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-15,16);ctx.quadraticCurveTo(-23,48,-18,67);ctx.lineTo(18,67);ctx.quadraticCurveTo(23,48,15,16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#2e2520";ctx.fillRect(-6,-3,3,2);ctx.fillRect(4,-3,3,2);ctx.strokeStyle="#8f392e";ctx.beginPath();ctx.moveTo(-7,9);ctx.quadraticCurveTo(0,13,7,9);ctx.stroke();ctx.restore();}
  // Central worktable, scissors, thread, paper stacks and the critical note.
  ctx.fillStyle="#49341f";roundedRect(348,504,400,34,5);ctx.fill();ctx.strokeStyle="#120f0c";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#392719";ctx.fillRect(375,535,20,75);ctx.fillRect(705,535,20,75);
  ctx.fillStyle="#cbbd9f";for(let i=0;i<5;i++)ctx.fillRect(400+i*3,484-i*2,130,8);ctx.strokeStyle="#b7a17c";ctx.lineWidth=3;ctx.beginPath();ctx.arc(580,493,13,0,Math.PI*2);ctx.arc(605,493,13,0,Math.PI*2);ctx.moveTo(590,500);ctx.lineTo(627,519);ctx.stroke();
  glow(692,548,62,"#d04b36",.32);ctx.save();ctx.translate(692,548);ctx.rotate(-.08);ctx.fillStyle="#d8c5a0";ctx.fillRect(-23,-14,46,28);ctx.strokeStyle="#682d26";ctx.strokeRect(-23,-14,46,28);ctx.fillStyle="#9b352d";ctx.fillRect(-18,-8,31,3);ctx.fillRect(-18,-1,25,3);ctx.restore();
  // Paper-window light and shadows.
  ctx.fillStyle="#b9996255";ctx.beginPath();ctx.moveTo(40,170);ctx.lineTo(335,170);ctx.lineTo(470,610);ctx.lineTo(135,610);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#5b4734";ctx.lineWidth=4;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(40+i*59,170);ctx.lineTo(40+i*59,350);ctx.stroke();}
  // Clear double door; open state visibly reveals the blue rain outside.
  ctx.fillStyle="#081116";ctx.fillRect(952,244,104,366);ctx.strokeStyle="#7a5a38";ctx.lineWidth=6;ctx.strokeRect(956,248,96,360);
  if(world.doorOpen){ctx.fillStyle="#202c2e";ctx.fillRect(949,250,17,356);ctx.fillRect(1042,250,17,356);ctx.strokeStyle="#5c422b";ctx.lineWidth=3;ctx.strokeRect(950,254,14,346);ctx.strokeRect(1044,254,14,346);ctx.fillStyle="#79949b33";ctx.beginPath();ctx.moveTo(966,250);ctx.lineTo(1042,250);ctx.lineTo(1014,610);ctx.lineTo(980,610);ctx.closePath();ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(1004,250);ctx.lineTo(1004,606);ctx.stroke();for(let side=0;side<2;side++){ctx.strokeStyle="#493620";ctx.lineWidth=3;ctx.strokeRect(965+side*47,278,37,130);ctx.strokeRect(965+side*47,430,37,130);ctx.fillStyle="#b69050";ctx.beginPath();ctx.arc(994+side*20,425,4,0,Math.PI*2);ctx.fill();}glow(1004,418,74,"#bd3d31",.22);ctx.save();ctx.translate(1004,416);ctx.rotate(.03);ctx.fillStyle="#c93f33";ctx.fillRect(-16,-62,32,124);ctx.strokeStyle="#efc47a";ctx.lineWidth=2;ctx.strokeRect(-16,-62,32,124);ctx.fillStyle="#f0d19a";ctx.font="700 22px serif";ctx.textAlign="center";ctx.fillText("封",0,8);ctx.restore();}
  ctx.restore();
}
function drawTownHouse(x,base,w,h,variant=0){
  ctx.save();ctx.fillStyle=variant%2?"#14262d":"#192c32";ctx.fillRect(x,base-h,w,h);ctx.fillStyle="#0a1317";ctx.fillRect(x+12,base-h+14,w-24,h-18);drawTiledRoof(x-14,base-h-36,w+28,55,variant%2?"#0a151a":"#0d191d");
  ctx.strokeStyle="#3f5559";ctx.lineWidth=4;ctx.strokeRect(x+22,base-h+64,70,94);ctx.strokeRect(x+w-92,base-h+64,70,94);
  ctx.fillStyle="#c88a3c44";ctx.fillRect(x+27,base-h+69,60,84);ctx.fillRect(x+w-87,base-h+69,60,84);
  ctx.strokeStyle="#1b292d";ctx.lineWidth=2;for(const wx of [x+27,x+w-87]){ctx.beginPath();ctx.moveTo(wx+20,base-h+69);ctx.lineTo(wx+20,base-h+153);ctx.moveTo(wx+40,base-h+69);ctx.lineTo(wx+40,base-h+153);ctx.moveTo(wx,base-h+111);ctx.lineTo(wx+60,base-h+111);ctx.stroke();}
  ctx.fillStyle="#141a1b";ctx.fillRect(x+w*.5-35,base-115,70,115);ctx.strokeStyle="#4a3830";ctx.strokeRect(x+w*.5-35,base-115,70,115);ctx.restore();
}
function drawArchitectureV2(){
  if(artReady(sceneAssetForZone(cameraX+W*.5)))return;
  if(!DEBUG_PLACEHOLDERS)return;
  ctx.save();ctx.translate(-cameraX,0);
  if(cameraX+W>1000){
    for(let i=0,x=1100;x<5850;x+=390,i++)drawTownHouse(x,610,330,210+(i%3)*42,i);
    // Shop signs, bridge, ropes, baskets and story props.
    for(let x=1250,i=0;x<5600;x+=690,i++){drawLantern(x,350+(i%3)*30,.72,true,Math.sin(gameTime*1.2+i)*.035);ctx.strokeStyle="#22343a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,250);ctx.lineTo(x,319);ctx.stroke();}
    ctx.fillStyle="#11191c";ctx.fillRect(2050,610,430,120);ctx.strokeStyle="#627b7d55";ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(2090+i*55,650,78,15,0,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle="#82989b55";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2500,365);ctx.quadraticCurveTo(2820,430,3130,350);ctx.stroke();for(let i=0;i<7;i++){const x=2550+i*85;ctx.fillStyle="#8e4438";ctx.fillRect(x,376+(i%2)*10,28,42);}
    ctx.fillStyle="#2b3e42";roundedRect(4280,548,80,62,4);ctx.fill();ctx.strokeStyle="#10181a";ctx.stroke();ctx.fillStyle="#778a85";ctx.fillRect(4295,563,50,4);ctx.fillRect(4295,578,50,4);
    // Puzzle calligraphy marks: explicit readable clue.
    ctx.strokeStyle="#d1b27388";ctx.lineWidth=5;strokeLine([[4740,458],[4790,426],[4842,454]],"#d1b27388",5);strokeLine([[4957,410],[5010,372]],"#d1b27388",5);strokeLine([[5168,528],[5210,492],[5250,520]],"#d1b27388",5);ctx.fillStyle="#cbb98a88";ctx.font="18px serif";ctx.fillText("二",4778,480);ctx.fillText("一",4995,425);ctx.fillText("三",5200,548);
  }
  if(cameraX+W>5850){ctx.fillStyle="#0c0b11";ctx.fillRect(6000,188,1300,422);drawTiledRoof(5930,85,1440,120,"#171018");ctx.strokeStyle="#672c31";ctx.lineWidth=8;for(let x=6110;x<7300;x+=230){ctx.beginPath();ctx.moveTo(x,215);ctx.lineTo(x,610);ctx.stroke();}for(let x=6190;x<7200;x+=340)drawLantern(x,260,1.05,true,Math.sin(gameTime+x)*.025);}
  ctx.restore();
  if(cameraX<1120)drawPaperShopV2();
}
function drawBreakableWallVisual(){
  if(world.wallHp<=0)return;
  const pa=window.ProductionAssets;
  const cx=4407, x=4367, y=452, w=80, h=158, damage=3-world.wallHp;
  ctx.save();
  // Use authored rain-alley masonry so the destructible section belongs to the
  // same material family as the surrounding street. The collider is unchanged.
  let textured=false;
  if(pa?.ready?.("rainWetWall")){
    textured=true;
    // Tile the authored wet masonry vertically instead of stretching one patch.
    pa.drawTopLeft(ctx,"rainWetWall",x,y,w,89,.98);
    pa.drawTopLeft(ctx,"rainWetWall",x,y+78,w,89,.94);
  }
  if(!textured){
    ctx.fillStyle="#15191a";ctx.fillRect(x,y,w,h);
    for(let row=0;row<8;row++){
      const by=y+3+row*19,shift=row%2?9:0;
      for(let bx=x-12+shift;bx<x+w;bx+=34){
        ctx.fillStyle=row%3===0?"#252728":row%3===1?"#1f2324":"#292929";
        ctx.fillRect(bx,by,30,15);ctx.strokeStyle="#34302b";ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,29,14);
      }
    }
  }
  // Darken the seam instead of outlining a rectangular gameplay block.
  const seam=ctx.createLinearGradient(x,0,x+w,0);seam.addColorStop(0,"#080b0caa");seam.addColorStop(.18,"#00000000");seam.addColorStop(.82,"#00000000");seam.addColorStop(1,"#080b0c99");ctx.fillStyle=seam;ctx.fillRect(x-2,y-2,w+4,h+4);
  const crackSets=[
    [[cx,468],[cx-6,489],[cx+2,510],[cx-9,529]],
    [[cx-4,511],[cx+10,532],[cx+2,552],[cx+13,573]],
    [[cx+10,482],[cx+2,501],[cx+15,521],[cx+6,544],[cx+17,563]]
  ];
  ctx.strokeStyle="#080b0c";ctx.lineCap="round";ctx.lineJoin="round";
  for(let i=0;i<=damage&&i<crackSets.length;i++){ctx.lineWidth=1.5+i*.45;ctx.beginPath();const pts=crackSets[i];ctx.moveTo(pts[0][0],pts[0][1]);for(let j=1;j<pts.length;j++)ctx.lineTo(pts[j][0],pts[j][1]);ctx.stroke();}
  // A small worn seal is the gameplay read; the wall itself remains plausible.
  ctx.translate(cx+10,493);ctx.rotate(-.06);ctx.fillStyle="#6d302b";ctx.globalAlpha=.82;ctx.fillRect(-6,-18,12,36);ctx.fillStyle="#d0b886";ctx.font="700 9px serif";ctx.textAlign="center";ctx.fillText("封",0,3);
  ctx.restore();ctx.textAlign="left";ctx.globalAlpha=1;
}
function drawStandableSurfaceLip(p){
  // A collision top must have a readable physical edge. The line is styled as
  // wet wood/stone wear rather than a debug outline, and is intentionally
  // subtle until the player is nearby or standing on that platform.
  const x=p.x,y=p.y,w=p.w;
  const near=Math.abs((player.x+player.w*.5)-(x+w*.5))<360;
  const standing=player.grounded&&player.currentGroundId===p.id;
  let top="#7d7466",under="#201b18",shine="#aeb5aa";
  if(["awning","roof","crate","moving-lift","opera-balcony"].includes(p.kind)){top="#73553d";under="#211914";shine="#a78662";}
  if(p.kind==="stone"){top="#66665f";under="#242827";shine="#8e9790";}
  ctx.save();
  ctx.fillStyle=under;ctx.globalAlpha=.92;ctx.fillRect(x,y+3,w,7);
  ctx.strokeStyle=top;ctx.lineWidth=2;ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(x,y+1);ctx.lineTo(x+w,y+1);ctx.stroke();
  if(near||standing){
    ctx.strokeStyle=shine;ctx.lineWidth=1;ctx.globalAlpha=standing?.62:.28;ctx.beginPath();ctx.moveTo(x+3,y);ctx.lineTo(x+w-3,y);ctx.stroke();
  }
  ctx.restore();
}
function drawGameplayPlatformVisual(p){
  // Ground collision is already embedded in the background. Every elevated
  // collider, however, MUST render a world-space structure in every scene
  // renderer. A hidden collider is treated as a visual bug, never gameplay.
  if(p.h>=40||["street","wood","boss"].includes(p.kind))return;
  const pa=window.ProductionAssets,x=p.x,y=p.y,w=p.w,bottom=610;
  if(p.kind.startsWith("shortcut-")){
    const asset=SHORTCUT_VISUAL_ASSETS[p.shortcutId];
    // Shortcuts are represented by authored chapter architecture rather than
    // generic beams. Collision remains segmented so the visible top and the
    // walkable top stay aligned without a stretched developer-looking rail.
    if(pa?.ready?.(asset)){
      if(p.shortcutId==="opera_backstage"){
        // Three collision steps form one backstage stair. Draw a coherent stair
        // silhouette behind each landing; use the alternate authored stair for
        // the upper landing so the route reads as architecture, not platforms.
        if(p.shortcutIndex===0)pa.drawTopLeft(ctx,"operaStairA",x-22,y-92,150,142,.92);
        else if(p.shortcutIndex===1&&pa.ready?.("operaStairB"))pa.drawTopLeft(ctx,"operaStairB",x-34,y-92,178,116,.88);
        else {ctx.save();ctx.globalAlpha=.64;ctx.fillStyle="#4a3428";ctx.fillRect(x,y+2,w,8);ctx.restore();}
      }else if(p.shortcutId==="bamboo_upper"){
        const h=Math.max(72,bottom-y+4);
        pa.drawTopLeft(ctx,"bambooPlatformA",x-4,y-2,w+8,h,.90);
      }else if(p.shortcutId==="ferry_cabin"){
        const h=Math.max(64,bottom-y+3);
        pa.drawTopLeft(ctx,"ferryDockB",x-3,y-4,w+6,h,.91);
      }else if(p.shortcutId==="city_return"){
        const h=Math.max(58,bottom-y+2);
        pa.drawTopLeft(ctx,"cityBridge",x-2,y-4,w+4,h,.90);
        if((p.shortcutIndex===0||p.shortcutIndex===5)&&pa.ready?.("cityStairs")){
          pa.drawTopLeft(ctx,"cityStairs",x-12,y-34,w+24,78,.55);
        }
      }
    }else{
      // Asset-load fallback is intentionally compact and structural; it never
      // grows posts down the screen or masquerades as a long debug beam.
      ctx.save();ctx.globalAlpha=.82;ctx.fillStyle="#40382e";ctx.fillRect(x,y,w,8);ctx.restore();
    }
    return;
  }
  if(p.kind==="moving-lift"){
    // Always keep a physical deck under the imported mechanism. If the asset
    // is missing/late-loading the player still never stands on empty air.
    ctx.save();ctx.fillStyle="#2a211b";ctx.fillRect(x,y,w,18);ctx.strokeStyle="#6d5138";ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,15);
    for(let tx=x+18;tx<x+w;tx+=34){ctx.strokeStyle="#3b2d24";ctx.beginPath();ctx.moveTo(tx,y+3);ctx.lineTo(tx,y+15);ctx.stroke();}
    ctx.restore();drawStandableSurfaceLip(p);return;
  }
  if(p.kind==="opera-balcony"){
    // Backing beam guarantees the whole collider width is visually supported;
    // the authored balcony art then supplies scene-specific detail.
    ctx.save();ctx.fillStyle="#241a16";ctx.fillRect(x,y,w,26);ctx.fillStyle="#4c3528";ctx.fillRect(x,y+8,w,7);ctx.restore();
    if(pa?.ready?.("gameplayOperaPlatform")){
      pa.drawTopLeft(ctx,"gameplayOperaPlatform",x-4,y-5,w+8,78,.98);
      if(pa.ready("gameplayOperaRail"))pa.drawTopLeft(ctx,"gameplayOperaRail",x-2,y-55,w+4,55,.88);
    }
    drawStandableSurfaceLip(p);return;
  }
  if(p.kind==="crate"){
    // The collider spans the full width, so use a continuous pallet top above
    // decorative crates; no invisible gap can exist between two box sprites.
    ctx.save();ctx.fillStyle="#302219";ctx.fillRect(x,y,w,13);ctx.strokeStyle="#76543a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+w-2,y+2);ctx.stroke();ctx.restore();
    if(pa?.ready?.("shopCrate")){
      const h=Math.max(74,bottom-y+3);
      pa.draw(ctx,"shopCrate",x+w*.33,bottom,h,false,.98);
      pa.draw(ctx,"shopCrate",x+w*.69,bottom,h*.92,true,.92);
    }else{
      ctx.save();ctx.fillStyle="#3b2c20";ctx.fillRect(x,y+12,w,Math.max(28,bottom-y-12));ctx.strokeStyle="#704e34";ctx.strokeRect(x+2,y+14,w-4,Math.max(24,bottom-y-16));ctx.restore();
    }
    drawStandableSurfaceLip(p);return;
  }
  if(p.kind==="awning"){
    // Continuous beam first, authored canopy second. The beam makes the exact
    // standable width legible even when dark rain art blends into the wall.
    ctx.save();ctx.fillStyle="#2c211a";ctx.fillRect(x,y,w,13);ctx.restore();
    if(pa?.ready?.("gameplayRainRoofCap"))pa.drawTopLeft(ctx,"gameplayRainRoofCap",x-4,y-7,w+8,52,.96);
    ctx.save();ctx.strokeStyle="#3a2a20";ctx.lineWidth=6;ctx.lineCap="round";
    for(const bx of [x+18,x+w-18]){ctx.beginPath();ctx.moveTo(bx,y+32);ctx.lineTo(bx,y+64);ctx.lineTo(bx+(bx<x+w/2?18:-18),y+34);ctx.stroke();}
    ctx.restore();drawStandableSurfaceLip(p);return;
  }
  if(p.kind==="roof"){
    ctx.save();ctx.fillStyle="#211a17";ctx.fillRect(x,y,w,14);ctx.restore();
    if(pa?.ready?.("gameplayRainRoofCap"))pa.drawTopLeft(ctx,"gameplayRainRoofCap",x-5,y-8,w+10,55,.98);
    ctx.save();ctx.globalAlpha=.76;ctx.fillStyle="#2b211b";ctx.fillRect(x+11,y+34,7,Math.max(18,bottom-(y+34)));ctx.fillRect(x+w-18,y+34,7,Math.max(18,bottom-(y+34)));ctx.restore();
    drawStandableSurfaceLip(p);return;
  }
  if(p.kind==="stone"){
    const mass=Math.max(16,bottom-y);
    ctx.save();ctx.fillStyle="#252a29";ctx.fillRect(x,y,w,mass);ctx.strokeStyle="#504f49";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,mass-2);ctx.restore();
    if(pa?.ready?.("rainStair"))pa.draw(ctx,"rainStair",x+w*.5,bottom,Math.max(58,bottom-y+6),false,.96);
    drawStandableSurfaceLip(p);return;
  }
  // Last-resort diegetic support: muted masonry with irregular courses.
  const mass=Math.max(10,bottom-y);ctx.save();ctx.fillStyle="#232827";ctx.fillRect(x,y,w,mass);ctx.strokeStyle="#554f46";ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,w-1,mass-1);for(let yy=y+22,row=0;yy<bottom;yy+=22,row++){ctx.strokeStyle="#363c3a";ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy);ctx.stroke();const offset=row%2?16:0;for(let tx=x+offset;tx<x+w;tx+=34){ctx.beginPath();ctx.moveTo(tx,yy-22);ctx.lineTo(tx,yy);ctx.stroke();}}ctx.restore();drawStandableSurfaceLip(p);
}
function drawPlatformsV2(){
  ctx.save();ctx.translate(-cameraX,0);
  // Render only scene-integrated visuals for elevated gameplay surfaces.
  for(const p of world.platforms)drawGameplayPlatformVisual(p);
  if(DEBUG_COLLIDERS){ctx.globalAlpha=.22;for(const p of world.platforms){ctx.fillStyle="#2aa6a6";ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle="#9effff";ctx.strokeRect(p.x,p.y,p.w,p.h);}ctx.globalAlpha=1;}
  drawBreakableWallVisual();
  if(!world.gateOpen){
    // A real sealed timber gate instead of a debug-looking stack of boxes.
    ctx.fillStyle="#171716";ctx.fillRect(5588,304,62,306);
    ctx.strokeStyle="#604b37";ctx.lineWidth=5;ctx.strokeRect(5591,308,56,298);
    ctx.lineWidth=3;for(let xx=5601;xx<5646;xx+=12){ctx.beginPath();ctx.moveTo(xx,312);ctx.lineTo(xx,604);ctx.stroke();}
    ctx.strokeStyle="#342820";ctx.lineWidth=5;for(let yy=358;yy<590;yy+=72){ctx.beginPath();ctx.moveTo(5593,yy);ctx.lineTo(5646,yy);ctx.stroke();}
    ctx.save();ctx.translate(5619,430);ctx.rotate(-.035);ctx.fillStyle="#7a3029";ctx.fillRect(-8,-47,16,94);ctx.fillStyle="#d1b27e";ctx.font="700 12px serif";ctx.textAlign="center";ctx.fillText("封",0,4);ctx.restore();ctx.textAlign="left";
  }
  if(world.bossActive&&!world.bossDefeated){
    // Both physical arena walls have matching visible seal curtains. The old
    // build rendered only the left one while keeping a right-side collider,
    // creating an invisible wall at the far edge of the boss room.
    const drawArenaSeal=(cx)=>{
      ctx.globalAlpha=.9;ctx.fillStyle="#111315";ctx.fillRect(cx-14,244,28,366);
      ctx.strokeStyle="#594437";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-12,246);ctx.lineTo(cx-12,610);ctx.moveTo(cx+12,246);ctx.lineTo(cx+12,610);ctx.stroke();
      for(let yy=285;yy<575;yy+=82){ctx.save();ctx.translate(cx,yy);ctx.rotate((yy%164?-.035:.03));ctx.fillStyle="#6f2c2b";ctx.fillRect(-7,-28,14,56);ctx.fillStyle="#c7aa78";ctx.font="700 10px serif";ctx.textAlign="center";ctx.fillText("镇",0,4);ctx.restore();}
    };
    drawArenaSeal(6002);drawArenaSeal(7283);ctx.textAlign="left";ctx.globalAlpha=1;
  }
  ctx.restore();
}

function drawLanternPuzzleClue(){
  // The old build referenced "wall strokes" in text but never rendered a real
  // clue. These three faded wall tablets are part of the scene, not UI:
  // middle lamp = one stroke, left lamp = two, right lamp = three.
  const clues=[
    {x:5040,y:278,count:1,label:"一"},
    {x:4820,y:338,count:2,label:"二"},
    {x:5260,y:470,count:3,label:"三"}
  ];
  const near=player.x>4620&&player.x<5420;
  for(const c of clues){
    ctx.save();
    ctx.globalAlpha=near?.92:.72;
    ctx.translate(c.x,c.y);
    // aged paper/wood patch so the marks read as environmental information
    ctx.fillStyle="#2b2722cc";ctx.fillRect(-19,-29,38,58);
    ctx.strokeStyle="#6f5d45";ctx.lineWidth=2;ctx.strokeRect(-19,-29,38,58);
    ctx.fillStyle="#b5905c";ctx.font="700 27px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(c.label,0,1);
    // imperfect hand-scratched echoes keep it from feeling like clean UI text
    ctx.strokeStyle="#c7a57499";ctx.lineWidth=1.2;
    for(let i=0;i<c.count;i++){
      const yy=-13+i*12;ctx.beginPath();ctx.moveTo(-10,yy);ctx.lineTo(9+(i%2?2:-1),yy+1);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.globalAlpha=1;
}

function drawPropsV2(){
  ctx.save();ctx.translate(-cameraX,0);
  if(world.epilogueActive){ctx.restore();return;}
  if(!world.lampAcquired){
    // Ayan's authored body art already carries the physical lantern. Before activation,
    // render only its detached wick-fire at the altar so the scene never shows two full lanterns.
    glow(world.lamp.x,world.lamp.y+10,46,"#ffc75f",.26);
    if(!drawSpriteAsset("vfxEmber",world.lamp.x,world.lamp.y+42,58,false,.78)){
      ctx.fillStyle="#ffe092";ctx.beginPath();ctx.arc(world.lamp.x,world.lamp.y+10,10,0,Math.PI*2);ctx.fill();
    }
  }
  for(const o of world.lore){
    const pulse=1+Math.sin(gameTime*4+o.x)*.16;
    const ground=o.placement==="floor"?getPrimaryGroundAt(o.x+o.w/2):null;
    const itemBottom=ground?(ground.y+3):(o.y+o.h+8);
    const glowY=ground?(ground.y-20):(o.y-2);
    if(!o.seen)glow(o.x+o.w/2,glowY,(o.critical?48:39)*pulse,o.critical?"#d34a39":"#dcae55",o.critical?.32:.25);
    const itemKey=o.title==="旧照片"?"itemPhoto":o.critical?"itemNote":o.title.includes("风铃")?"itemBell":"itemTalisman";
    const itemSize=o.seen?50:(o.critical?64:56);
    if(!drawSpriteAsset(itemKey,o.x+o.w/2,itemBottom,itemSize,false,o.seen ? .54 : 1)){ctx.save();ctx.translate(o.x+o.w/2,itemBottom-o.h/2);ctx.fillStyle=o.critical?"#d8c39c":"#967b58";ctx.fillRect(-o.w/2,-o.h/2,o.w,o.h);ctx.restore();}
    if(!o.seen&&Math.abs((player.x+player.w*.5)-(o.x+o.w*.5))<360){ctx.save();ctx.globalAlpha=o.critical?.55:.32;ctx.fillStyle=o.critical?"#e26c57":"#d8ba72";ctx.translate(o.x+o.w*.5,glowY-25+Math.sin(gameTime*3.4)*2);ctx.rotate(Math.PI/4);ctx.fillRect(-3,-3,6,6);ctx.restore();}
  }
  for(const c of world.checkpoints){if(c.lit)glow(c.x,c.y+12,75,"#ffc75f",.32);ctx.strokeStyle="#241a16";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(c.x,c.y+90);ctx.lineTo(c.x,c.y+25);ctx.stroke();if(!drawSpriteAsset("guideLantern",c.x,c.y+54,94,false,c.lit?1:.38))drawLantern(c.x,c.y+7,.72,c.lit,0);ctx.fillStyle="#2f241c";ctx.fillRect(c.x-25,c.y+87,50,7);}
  drawLanternPuzzleClue();
  for(const s of world.switches){drawLantern(s.x,s.y-13,.52,s.lit,Math.sin(gameTime*2+s.id)*.04);ctx.strokeStyle="#1b2223";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(s.x,s.y+8);ctx.lineTo(s.x,s.y+32);ctx.stroke();}
  for(const e of world.embers){if(!e.visible||e.collected||(e.id===1&&world.wallHp>0))continue;const y=e.y+Math.sin(gameTime*3+e.id)*7;glow(e.x,y,55,"#ffd166",.5);ctx.fillStyle="#ffe092";ctx.beginPath();ctx.moveTo(e.x,y-22);ctx.bezierCurveTo(e.x+27,y-3,e.x+14,y+26,e.x,y+30);ctx.bezierCurveTo(e.x-14,y+26,e.x-27,y-3,e.x,y-22);ctx.fill();ctx.fillStyle="#fff1bd";ctx.beginPath();ctx.moveTo(e.x,y-8);ctx.quadraticCurveTo(e.x+9,y+8,e.x,y+17);ctx.quadraticCurveTo(e.x-9,y+8,e.x,y-8);ctx.fill();}
  for(const e of world.embers){if(e.visible&&!e.collected&&(e.id!==1||world.wallHp<=0))drawSpriteAsset("vfxEmber",e.x,e.y+42,72,false,.78);}
  for(const d of world.drops){const def=weaponDef(d.type),y=d.y+Math.sin(gameTime*3+d.bob)*5;glow(d.x+18,y+16,35,def.color,.25);ctx.fillStyle="#091013cc";roundedRect(d.x-7,y-9,50,50,6);ctx.fill();ctx.strokeStyle=def.color;ctx.lineWidth=3;ctx.stroke();const drawn=d.type==="ritual"?drawSpriteAsset("ritualBlade",d.x+18,y+45,58,false,.98):drawAtlasFrame("weapons",0,0,4,2,d.x+18,y+42,45,false,.98);if(!drawn){ctx.save();ctx.translate(d.x+18,y+16);ctx.rotate(-.65);ctx.strokeStyle=def.color;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(18,0);ctx.stroke();ctx.restore();}}
  ctx.restore();
}

function drawStoryApparitions(pa,pulse){
  const active=world.storyRuntime?.active||{};
  for(const [id,time] of Object.entries(active)){
    const a=STORY_APPARITIONS[id];if(!a||a.x<cameraX-180||a.x>cameraX+W+180)continue;
    const fade=Math.min(1,time<1?time:1);
    const ghost=id.startsWith("girl")?.82:.94;
    const singer=id.startsWith("singer"),phase=gameTime*(singer?1.9:2.7)+a.x*.006;
    const sway=Math.sin(phase)*(singer?.7:.8),bob=singer?0:Math.sin(phase*.83)*.55;
    glow(a.x,a.y-72+bob,50,a.glow||"#d8aa59",(.07+pulse*.04)*fade);
    if(singer){ctx.save();ctx.globalAlpha=.17*fade;ctx.fillStyle="#050607";ctx.beginPath();ctx.ellipse(a.x,a.y-2,28,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    ctx.save();ctx.translate(a.x+sway,a.y+bob);ctx.rotate(Math.sin(phase*.7)*(singer?.009:.005));
    // Story apparitions now use the same clean idle series as world NPCs.
    // This keeps memory figures alive without introducing source-sheet fragments.
    let apparitionAnimated=false;
    if(singer){
      const fi=Math.floor((gameTime+a.x*.001)*1.8)%4;
      apparitionAnimated=drawProductionSeries("prodNpcOperaIdle_",4,fi,0,0,roleHeight(a.role),false,ghost*fade);
    }else if(id.startsWith("girl")){
      const fi=Math.floor((gameTime+a.x*.001)*2.0)%4;
      apparitionAnimated=drawProductionSeries("prodNpcGirlIdle_",4,fi,0,0,roleHeight(a.role),false,ghost*fade);
    }
    if(!apparitionAnimated)pa.draw(ctx,a.sprite,0,0,roleHeight(a.role),false,ghost*fade);
    ctx.restore();
  }
}

function drawFinalConvergenceVisual(){
  const p=world.chapterProgress?.final;if(!p?.convergenceStarted||p.solved)return;
  const baseX=17920,baseY=465;ctx.save();
  // Seven faint silhouettes sit inside the mirror's world space. The selected
  // one is not “the answer” visually; it is simply the person currently being
  // examined through the four pieces of evidence.
  for(let i=0;i<7;i++){
    const sx=baseX+(i-3)*46,selected=i===p.candidate;
    ctx.save();ctx.globalAlpha=selected?.60:.16;
    if(selected)glow(sx,baseY+18,34,p.convergenceSolved?"#f1c96d":"#a8c4c0",.15);
    ctx.fillStyle=selected?"#718b88":"#101718";ctx.beginPath();ctx.ellipse(sx,baseY-8,8,10,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(sx-8,baseY+1);ctx.quadraticCurveTo(sx-14,baseY+27,sx-11,baseY+44);ctx.lineTo(sx+11,baseY+44);ctx.quadraticCurveTo(sx+14,baseY+27,sx+8,baseY+1);ctx.closePath();ctx.fill();
    if(i===6){ctx.strokeStyle="#b6935a";ctx.lineWidth=1.2;ctx.strokeRect(sx-15,baseY-24,30,74);}
    ctx.restore();
  }
  const sh=currentFinalShadow();
  ctx.globalAlpha=.72;ctx.fillStyle="#c8ba9d";ctx.font="11px serif";ctx.textAlign="center";ctx.fillText(`第 ${p.candidate+1} 影`,baseX,baseY+72);
  if(p.reflectionSeen){ctx.fillStyle="#9fc3bd";ctx.fillText("倒影成形",baseX,baseY+88);}
  if(p.heardEcho){ctx.fillStyle="#cdb77d";ctx.fillText(`回声：${sh.word}`,baseX-68,baseY+88);}
  if(p.readName){ctx.fillStyle="#cdb77d";ctx.fillText(sh.oldName?`旧名：${sh.oldName}`:"旧名：空",baseX+70,baseY+88);}
  ctx.restore();
}

function drawMountedPropBase(o){
  if(!o?.propMount)return;
  ctx.save();
  if(o.propMount==="woodGap"){
    ctx.globalAlpha=.55;ctx.fillStyle="#2a2019";ctx.fillRect(o.x-30,o.y+5,60,9);ctx.strokeStyle="#7b5a3a";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(o.x-25,o.y+7);ctx.lineTo(o.x+22,o.y+7);ctx.stroke();
  }else if(o.propMount==="wetPlank"){
    ctx.globalAlpha=.48;ctx.fillStyle="#263337";ctx.fillRect(o.x-36,o.y+7,72,8);ctx.globalAlpha=.28;ctx.strokeStyle="#8aa7a6";ctx.beginPath();ctx.moveTo(o.x-30,o.y+8);ctx.lineTo(o.x+25,o.y+8);ctx.stroke();
  }else if(o.propMount==="wreckEdge"){
    ctx.globalAlpha=.52;ctx.strokeStyle="#6a4b36";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(o.x-32,o.y+10);ctx.lineTo(o.x+30,o.y+6);ctx.stroke();ctx.globalAlpha=.4;ctx.strokeStyle="#9a7a57";ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(o.x-18,o.y+1);ctx.quadraticCurveTo(o.x,o.y+15,o.x+18,o.y+3);ctx.stroke();
  }else if(o.propMount==="graveStone"){
    ctx.globalAlpha=.55;ctx.fillStyle="#363633";ctx.strokeStyle="#777064";ctx.lineWidth=1;roundedRect(o.x-28,o.y+2,56,13,4);ctx.fill();ctx.stroke();
  }else if(o.propMount==="groundPaper"){
    ctx.globalAlpha=.28;ctx.fillStyle="#050708";ctx.beginPath();ctx.ellipse(o.x,o.y+12,28,5,0,0,Math.PI*2);ctx.fill();
  }else if(o.propMount==="stoneStep"){
    ctx.globalAlpha=.58;ctx.fillStyle="#3c3a36";ctx.strokeStyle="#7c7468";ctx.lineWidth=1;ctx.fillRect(o.x-31,o.y+4,62,11);ctx.strokeRect(o.x-31,o.y+4,62,11);
  }
  ctx.restore();
}

function drawChapterGameplay(){
  const pa=window.ProductionAssets;if(!pa)return;
  ctx.save();ctx.translate(-cameraX,0);
  const pulse=.55+.25*Math.sin(gameTime*3.2);
  const drawPaperClue=(o,seen=false)=>{
    const size=seen?50:60;
    if(!seen)glow(o.x,o.y-22,42,"#e2b45c",.20+pulse*.14);
    drawSpriteAsset(o.id.includes("mask")?"itemNote":"itemTalisman",o.x,o.y,size,false,seen ? .52 : 1);
  };
  const drawReadabilityAura=(o,p)=>{
    if(!chapterObjectNeedsAttention(o,p))return;
    const tier=chapterInteractionPriority(o),a=chapterInteractionAnchor(o);
    const px=player.x+player.w*.5,py=player.y+player.h*.5,d=Math.hypot(px-a.x,py-a.y);
    const max=tier>=6?520:tier>=5?430:310;if(d>max)return;
    const near=clamp(1-d/max,.12,1),isCurrent=player.interactTarget?.kind==="chapter"&&player.interactTarget.obj===o;
    const cy=a.y-24+Math.sin(gameTime*3.7+o.x*.01)*2.4;
    // A tiny diegetic 'ink glint': visible before interaction range, but far
    // quieter than an objective arrow. It tells the player where to look.
    ctx.save();ctx.globalAlpha=(tier>=5?.34:.20)*near+(isCurrent?.18:0);
    const col=tier>=6?"#f2cf79":tier>=5?"#d5b66c":"#b5a47f";
    glow(a.x,a.y,26+(tier>=5?10:0),col,.08+.08*near);
    ctx.translate(a.x,cy);ctx.rotate(Math.PI/4);ctx.fillStyle=col;const r=tier>=6?5.5:tier>=5?4.5:3.5;ctx.fillRect(-r/2,-r/2,r,r);ctx.restore();
    if(isCurrent){ctx.save();ctx.globalAlpha=.34+.12*Math.sin(gameTime*5);ctx.strokeStyle="#e8c77b";ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(a.x,a.y+7,tier>=5?34:27,8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  };

  for(const o of CHAPTER_INTERACTABLES){
    const visiblePoint=chapterObjectPoint(o);
    if(visiblePoint.x<cameraX-220||visiblePoint.x>cameraX+W+220||!chapterObjectVisible(o))continue;
    const p=world.chapterProgress[o.chapter];
    drawReadabilityAura(o,p);
    if(o.kind==="npc"){
      const r=npcRuntimeFor(o),phase=r.stepPhase||0,vis=npcVisualFor(o);
      // Normal NPC feet stay locked to the authored ground plane. Previous
      // vertical bobbing translated the entire bitmap and made adults hover.
      const bob=0;
      let sprite=(r.transientTimer||0)>0&&r.transientSprite?r.transientSprite:vis.idle;
      if(r.reveal==="settle"&&vis.react)sprite=vis.react;
      else if(!(r.transientTimer>0)&&r.moving&&vis.walk)sprite=vis.walk;
      else if(currentDialogue?.speaker===o.name&&vis.talk)sprite=vis.talk;
      else if(o.id==="umbrella_ferry"&&p.umbrellaFerryTalked)sprite=vis.react||vis.idle;
      else if(o.id==="lantern_girl_city"&&p.girlCityTalked)sprite=vis.react||vis.idle;
      else if(p.solved&&vis.react)sprite=vis.react;
      const glowColor=o.npcType==="girl"?"#e9bd65":o.npcType==="umbrella"?"#c69a58":"#d8aa59";
      // Short pose cross-fades stop NPCs from popping between idle/walk/talk
      // silhouettes like presentation slides.
      if(!r.spriteCurrent){r.spriteCurrent=sprite;r.spritePrevious=sprite;r.spriteBlend=1;}
      if(r.spriteCurrent!==sprite){r.spritePrevious=r.spriteCurrent;r.spriteCurrent=sprite;r.spriteBlend=0;}
      const blend=clamp(r.spriteBlend??1,0,1);
      ctx.save();ctx.globalAlpha=.24;ctx.fillStyle="#050708";ctx.beginPath();ctx.ellipse(r.x,606,Math.max(18,roleHeight(vis.role)*.15),5.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
      glow(r.x,568,46,glowColor,.07+pulse*.035);
      const lean=r.moving?Math.sin(phase)*.007*r.dir:0;
      const squash=r.moving?Math.abs(Math.sin(phase))*.004:0;
      const footOffset=window.CharacterScale?.get(vis.role).footOffset||0;
      const footY=610+footOffset+bob;
      const anim=NPC_ANIM_SERIES[o.npcType]||null;
      const staticOverride=(r.transientTimer||0)>0||currentDialogue?.speaker===o.name||r.reveal==="settle"||
        (o.id==="umbrella_ferry"&&p.umbrellaFerryTalked)||(o.id==="lantern_girl_city"&&p.girlCityTalked)||p.solved;
      ctx.save();ctx.globalAlpha=r.revealAlpha??1;ctx.translate(r.x,footY);ctx.rotate(lean);ctx.scale(1+squash,1-squash*.7);
      let animated=false;
      if(anim&&!staticOverride){
        if(r.moving){
          const frame=Math.floor((r.stepPhase||0)*1.18)%6;
          animated=drawProductionSeries(anim.walk,6,frame,0,0,roleHeight(vis.role),r.dir<0,1);
        }else{
          const phaseOffset=(String(o.id).length%4)*.37;
          const frame=Math.floor((gameTime+phaseOffset)*1.55)%4;
          animated=drawProductionSeries(anim.idle,4,frame,0,0,roleHeight(vis.role),r.dir<0,1);
        }
      }
      if(!animated){
        // Static conversation/reaction poses are still authored full-body art.
        // Crossfade remains intentionally faint so it cannot create a duplicate-body ghost.
        if(blend<1&&r.spritePrevious)pa.draw(ctx,r.spritePrevious,0,0,roleHeight(vis.role),r.dir<0,(1-blend)*.16);
        pa.draw(ctx,r.spriteCurrent||sprite,0,0,roleHeight(vis.role),r.dir<0,1);
      }
      ctx.restore();
      continue;
    }
    if(o.kind==="clue"){
      const seen=(p.clues||[]).includes(o.id)||p.inscription===true;
      if(o.id==="bamboo_pool"){
        ctx.save();const wave=.5+.5*Math.sin(gameTime*2.5);ctx.globalAlpha=seen?.34:.58;ctx.fillStyle="#6b9599";ctx.beginPath();ctx.ellipse(o.x,588,78,10,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=seen?"#779696":"#a8c7c0";ctx.lineWidth=1.4;for(let i=0;i<3;i++){ctx.globalAlpha=(seen?.22:.42)*(1-i*.22);ctx.beginPath();ctx.ellipse(o.x,585,44+i*20+wave*6,5+i*2,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
        if(!seen)drawSpriteAsset("itemTalisman",o.x,574,46,false,.34);
      }else drawPaperClue(o,seen);continue;
    }
    if(o.kind==="flavor"){
      drawSpriteAsset("itemNote",o.x,o.y,46,false,.50);continue;
    }
    if(o.kind==="gong"){
      const active=p.sequence.includes(o.index)||p.solved;if(active)glow(o.x,500,62,"#ffc969",.20);pa.draw(ctx,"operaGong",o.x,610,130+o.index*10,false,active?1:.72);continue;
    }
    if(o.kind==="lift"){
      if(p.solved)glow(o.x,o.y-6,34,"#d9aa55",.18+pulse*.08);continue;
    }
    if(o.kind==="bell"){
      const active=(p.tuned||[]).includes(o.index)||p.solved;
      const a=world.lamp.angle,alignment=o.index===0?clamp((a-.12)/.42,0,1):o.index===1?clamp(1-Math.abs(a)/.42,0,1):clamp((-a-.12)/.42,0,1);
      if(active)glow(o.x,455,55,"#e9c36b",.22);else if(lampIsFocused()&&Math.abs(player.x-o.x)<500&&alignment>.2)glow(o.x,455,42+alignment*24,"#b8d6c4",.06+alignment*.18);
      pa.draw(ctx,"bambooBell",o.x,o.y,92+o.index*7,false,active?1:.62+alignment*.25);continue;
    }
    if(o.kind==="nameSlip"){
      drawMountedPropBase(o);glow(o.x,o.y-24,40,"#d9b65f",.22+pulse*.12);drawSpriteAsset("itemTalisman",o.x,o.y,60,false,1);continue;
    }
    if(o.kind==="nameReflection"){
      ctx.save();const w=.5+.5*Math.sin(gameTime*2.4);ctx.globalAlpha=.36+.14*w;ctx.fillStyle="#6b9b9d";ctx.beginPath();ctx.ellipse(o.x,588,82,11,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#9bc2c0";ctx.lineWidth=1.3;for(let i=0;i<2;i++){ctx.globalAlpha=.34-i*.1;ctx.beginPath();ctx.ellipse(o.x,585,52+i*27+w*6,6+i*2,0,0,Math.PI*2);ctx.stroke();}ctx.restore();drawSpriteAsset("itemTalisman",o.x,577,52,false,.28+.08*w);continue;
    }
    if(o.kind==="debris"){
      glow(o.x,548,50,"#b69b6b",.10+pulse*.06);pa.draw(ctx,"impMechanismWinch",o.x,610,122,false,.68);continue;
    }
    if(o.kind==="winch"){
      if(p.solved)glow(o.x,535,70,"#d9aa50",.18);pa.draw(ctx,"impMechanismWinch",o.x,610,138,false,p.solved?1:.82);continue;
    }
    if(o.kind==="epitaph"){
      const seen=p.epitaphs.includes(o.index);if(!seen)glow(o.x,510,30,"#d8b26b",.18);pa.draw(ctx,"impGraveMarker",o.x,610,126,false,seen?.62:.9);continue;
    }
    if(o.kind==="emptyGrave"){
      const ready=(p.assignments||[]).every(v=>v!==null);if(ready)glow(o.x,520,54,"#bca06c",.18+pulse*.08);pa.draw(ctx,"impGraveMarker",o.x,610,116,false,ready?.9:.55);continue;
    }
    if(o.kind==="memoryToken"){
      const labels=["幼","老","归"],cols=["#d9b96b","#c8a56d","#9fb7ae"];
      drawMountedPropBase(o);glow(o.x,o.y-26,38,cols[o.index],.22+pulse*.11);drawSpriteAsset("itemTalisman",o.x,o.y,60,false,.98);
      ctx.save();ctx.fillStyle="#111617dd";ctx.beginPath();ctx.arc(o.x,o.y-64,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle=cols[o.index];ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle=cols[o.index];ctx.font="700 12px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(labels[o.index],o.x,o.y-63.5);ctx.restore();continue;
    }
    if(o.kind==="graveLantern"){
      const assigned=(p.assignments||[])[o.index]!==null&&Number.isInteger((p.assignments||[])[o.index]);const lit=assigned||p.solved;if(lit)glow(o.x,520,66,"#ffc45c",.28);pa.draw(ctx,"impGraveLantern",o.x,610,124,false,lit?1:.48);continue;
    }
    if(o.kind==="mirror"){
      const id=p.mirrorLit?"impPuzzleMirrorLitA":"impPuzzleMirror";
      if(p.mirrorLit)glow(o.x,493,78,"#ffd779",.22);
      // Keep the mirror visually behind Ayan and give the dark disc a readable
      // pedestal so it reads as a world object rather than a giant HUD circle.
      ctx.save();ctx.fillStyle="#332923";ctx.strokeStyle="#806342";ctx.lineWidth=3;
      ctx.fillRect(o.x-42,578,84,13);ctx.strokeRect(o.x-42,578,84,13);
      ctx.beginPath();ctx.moveTo(o.x-30,591);ctx.lineTo(o.x-44,610);ctx.moveTo(o.x+30,591);ctx.lineTo(o.x+44,610);ctx.stroke();ctx.restore();
      pa.draw(ctx,id,o.x,586,156,false,.96);continue;
    }
    if(o.kind==="echo"){
      const active=p.convergenceStarted&&p.heardEcho&&currentFinalShadow().voice===o.index;if(active)glow(o.x,520,48,"#e7c36b",.20);pa.draw(ctx,"operaGong",o.x,610,104+o.index*5,false,active?1:.66);continue;
    }
    if(o.kind==="dial"){
      const variants=["impPuzzleDialA","impPuzzleDialB","impPuzzleDialC","impPuzzleDialD"];
      const id=p.dial===3?"impPuzzleDial":variants[p.dial%variants.length];if(p.dial===3)glow(o.x,515,72,"#ffc35f",.24);pa.draw(ctx,id,o.x,610,158,false,1);continue;
    }
    if(o.kind==="nameTablet"){
      const active=p.readName||p.convergenceSolved;if(active)glow(o.x,525,54,"#e7c36b",.18);pa.draw(ctx,"impGraveMarker",o.x,610,124,false,active?1:.72);continue;
    }
    if(o.kind==="crystal"){
      if(p.crystalLit)glow(o.x,510,82,"#ffd775",.30);pa.draw(ctx,p.crystalLit?"impPuzzleCrystal":"impPuzzleCrystalA",o.x,610,148,false,p.crystalLit?1:.7);continue;
    }
    if(o.kind==="seal"){
      if(p.solved)glow(o.x,500,88,"#ffd779",.32);pa.draw(ctx,p.solved?"impPuzzleSeal":"impPuzzleSealA",o.x,610,158,false,1);continue;
    }
  }

  const cityP=world.chapterProgress.city;
  if(cityP?.carriedMemory!==null&&Number.isInteger(cityP.carriedMemory)){
    const cols=["#d9b96b","#c8a56d","#9fb7ae"],cx=player.x+player.facing*26,cy=player.y+18+Math.sin(gameTime*3)*3;
    glow(cx,cy,25,cols[cityP.carriedMemory],.18);drawSpriteAsset("itemTalisman",cx,cy+22,36,player.facing<0,.9);
  }
  drawStoryApparitions(pa,pulse);
  drawFinalConvergenceVisual();

  if(world.operaLift){
    const lift=world.operaLift;pa.draw(ctx,"impMechanismLift",lift.x+lift.w*.5,lift.y+63,240,false,1);
    if(world.chapterProgress.opera.solved&&lift.y>432)glow(lift.x+lift.w*.5,lift.y,66,"#d7aa54",.18);
  }
  const ferry=world.chapterProgress.ferry;
  if(ferry.solved){
    const t=ferry.boatProgress,eased=1-Math.pow(1-t,3),boatX=13240+eased*720;
    pa.draw(ctx,"ferryBoat",boatX,575,185,false,.94);glow(boatX,515,65,"#d8ad59",.12);
  }
  for(const [chapter,x] of Object.entries(CHAPTER_GATE_X)){
    const solved=world.chapterProgress[chapter].solved;
    if(solved&&(chapter!=="opera"||world.ritualBladeUnlocked))continue;
    ctx.save();
    ctx.fillStyle="rgba(10,14,17,.24)";ctx.fillRect(x-10,244,54,368);
    ctx.strokeStyle="#4f3a28";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+2,252);ctx.lineTo(x+2,604);ctx.moveTo(x+32,252);ctx.lineTo(x+32,604);ctx.stroke();
    ctx.strokeStyle="#826341";ctx.lineWidth=3;
    for(let y=286;y<578;y+=72){ctx.beginPath();ctx.moveTo(x+2,y);ctx.lineTo(x+32,y+2);ctx.stroke();}
    for(let y=292;y<578;y+=72){
      ctx.save();ctx.translate(x+17,y);ctx.rotate((y%144?-.05:.04));
      ctx.fillStyle="#d7c19a";ctx.strokeStyle="#6b4934";ctx.lineWidth=1.2;roundedRect(-12,-19,24,38,4);ctx.fill();ctx.stroke();
      ctx.fillStyle="#8b2e2a";ctx.fillRect(-8,-10,16,3);ctx.fillRect(-6,-4,12,2.6);ctx.fillRect(-5,2,10,2.4);
      ctx.restore();
    }
    glow(x+17,426,84,"#d8b46a",.07);
    ctx.restore();
  }
  ctx.textAlign="left";ctx.restore();
}

// Sparse official modules sit on the real collision layout. They are not a
// preview scene: these are the paper shop and rain-alley objects the player
// walks past and interacts around during normal gameplay.
function drawOfficialEnvironment(){
  ctx.save();ctx.translate(-cameraX,0);
  // The full authored background is the scene's visual source of truth.
  // Only an interaction-state overlay is drawn here; decorative auto-extracts
  // are intentionally excluded to prevent duplicate/partial architecture.
  if(cameraX<W+1120&&world.doorOpen)drawSpriteAsset("shopDoorOpen",1027,610,270,false,1);
  ctx.restore();
}

function drawInteractionWorldMarker(){
  if(world.epilogueActive||currentDialogue||!player.interactTarget)return;
  const target=player.interactTarget,a=interactionAnchor(target);if(!a)return;
  const sx=a.x-cameraX,sy=a.y;if(sx<-80||sx>W+80||sy<30||sy>H+40)return;
  const px=player.x+player.w*.5,py=player.y+player.h*.5;
  const d=Math.hypot(px-a.x,py-a.y),proximity=clamp(1-(d-32)/135,.25,1);
  const t=gameTime||0,bob=Math.sin(t*4.2)*2.5,pulse=.5+.5*Math.sin(t*5.6);
  let category="调查",label=interactionLabel(target);
  if(target.kind==="chapter")category=chapterInteractionCategory(target.obj);
  else if(["drop","ember"].includes(target.kind))category="拾取";
  else if(target.kind==="checkpoint"||target.kind==="door"||target.kind==="lamp"||target.kind==="seventh")category="操作";
  const y=sy-39+bob,style=interactionVisualStyle(target);
  ctx.save();ctx.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
  ctx.globalAlpha=.15*proximity;const g=ctx.createRadialGradient(sx,y,0,sx,y,30+pulse*6);g.addColorStop(0,style.glow);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,y,34+pulse*4,0,Math.PI*2);ctx.fill();
  // A small paper tag marks only the currently selected object; semantic color
  // distinguishes main progress, NPCs and optional lore without adding debug boxes.
  ctx.font="700 12px 'Microsoft YaHei',sans-serif";const text=`E  ${category}`;const tw=Math.ceil(ctx.measureText(text).width)+24;
  ctx.globalAlpha=.94;drawPaperTag(sx-tw/2,y-13,tw,27,style.fill,style.stroke);
  ctx.fillStyle=style.ink;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,sx,y+.5);
  ctx.globalAlpha=.42*proximity;ctx.strokeStyle=style.stroke;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx,y+15);ctx.lineTo(sx,sy-7);ctx.stroke();
  ctx.globalAlpha=.24*proximity;ctx.strokeStyle=style.glow;ctx.beginPath();ctx.ellipse(sx,sy-2,22+pulse*6,6+pulse*1.5,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

function drawLampBeam(){
  if(!world.lamp.lit||!lampIsFocused()||world.epilogueActive)return;
  const p=lampPose(),x=p.x-cameraX,y=p.y;
  // Gameplay still tests the full 330px beam. Only the visual spill is shortened/narrowed
  // so late-game clues are not covered by a giant translucent triangle.
  const len=Math.min(lampBeamReach(330),235),spread=.18;
  ctx.save();ctx.globalCompositeOperation="screen";
  const color=world.lamp.stable<.55?"#b9d5ce":"#ffd47b";
  const spill=ctx.createRadialGradient(x,y,0,x,y,76);
  spill.addColorStop(0,color+"66");spill.addColorStop(.20,color+"32");spill.addColorStop(.58,color+"10");spill.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=spill;ctx.globalAlpha=.38;ctx.beginPath();ctx.arc(x,y,76,0,Math.PI*2);ctx.fill();
  const outerLen=len,innerLen=len*.78,coreLen=len*.58;
  ctx.fillStyle=color;
  ctx.globalAlpha=.032;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(p.angle-spread)*outerLen,y+Math.sin(p.angle-spread)*outerLen);ctx.quadraticCurveTo(x+Math.cos(p.angle)*outerLen*.94,y+Math.sin(p.angle)*outerLen*.94,x+Math.cos(p.angle+spread)*outerLen,y+Math.sin(p.angle+spread)*outerLen);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.072;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(p.angle-.12)*innerLen,y+Math.sin(p.angle-.12)*innerLen);ctx.quadraticCurveTo(x+Math.cos(p.angle)*innerLen*.92,y+Math.sin(p.angle)*innerLen*.92,x+Math.cos(p.angle+.12)*innerLen,y+Math.sin(p.angle+.12)*innerLen);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.14;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(p.angle-.055)*coreLen,y+Math.sin(p.angle-.055)*coreLen);ctx.quadraticCurveTo(x+Math.cos(p.angle)*coreLen*.98,y+Math.sin(p.angle)*coreLen*.98,x+Math.cos(p.angle+.055)*coreLen,y+Math.sin(p.angle+.055)*coreLen);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.10;ctx.strokeStyle="#ffe6ab";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+Math.cos(p.angle)*18,y+Math.sin(p.angle)*18);ctx.lineTo(x+Math.cos(p.angle)*innerLen,y+Math.sin(p.angle)*innerLen);ctx.stroke();
  ctx.restore();
}
function drawCombatReleaseBeat(){
  if((world.combatReleaseTimer||0)<=0)return;
  const q=clamp(world.combatReleaseTimer/.80,0,1),age=1-q,x=(world.combatReleaseX||player.x)-cameraX;
  if(x<-120||x>W+120)return;
  const g=getPrimaryGroundAt(world.combatReleaseX||player.x),gy=(g?.y||610);
  ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.22*q;ctx.strokeStyle="#d9bf82";ctx.lineWidth=1.6;
  ctx.beginPath();ctx.ellipse(x,gy-3,28+age*48,6+age*6,0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha=.12*q;ctx.beginPath();ctx.ellipse(x,gy-3,48+age*62,10+age*8,0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawEnemyV2(e){
  if(!e.alive&&!e.dying)return;const x=e.x-cameraX,y=e.y,t=gameTime;
  const visual=window.Motion?.getEnemyVisual?.(e)||{};
  const motion=window.Motion?.getEnemyMotionState?.(e)||{mode:"idle",phase:t*1.2,stageProgress:0,attackProgress:0};
  const moving=["PATROL","CHASE","NOTICE","SEARCH","TURN"].includes(e.aiState)&&Math.abs(e.vx)>5;
  const attacking=["PREPARE_ATTACK","ATTACK_ACTIVE","RECOVERY"].includes(e.aiState);
  const facingDir=Math.abs(e.vx)>4?Math.sign(e.vx):(e.desiredDir||1),flip=facingDir<0;
  let height=e.type==="elite"?148:e.type==="shadow"?102:128;
  let prefix="",count=1,index=0;
  if(e.dying){
    const dp=clamp(1-(e.deathTimer||0)/Math.max(.001,e.deathTotal||.7),0,1);
    if(e.type==="paper"){prefix="prodPaperDeath_";count=7;height=132;}
    else if(e.type==="shadow"){prefix="prodShadowDeathFull_";count=8;height=112;}
    else {prefix="prodLanternDeath_";count=7;height=154;}
    index=Math.min(count-1,Math.floor(dp*count));
  }else if(e.type==="paper"){
    if(e.hurt>0){prefix="prodPaperHurt_";count=2;index=Math.min(count-1,Math.floor(clamp((.18-e.hurt)/.18,0,.9999)*count));} 
    else if(attacking){prefix="prodPaperAttack_";count=6;index=Math.floor(motion.attackProgress*(count-.001));} 
    else if(moving){prefix=Math.abs(e.vx)>e.speed*.75?"prodPaperRun_":"prodPaperWalk_";count=6;index=Math.floor(motion.phase)%count;} 
    else {prefix="prodPaperIdle_";count=4;index=Math.floor((motion.animTime||0)*4.2)%count;}
  }else if(e.type==="shadow"){
    if(e.hurt>0){prefix="prodShadowHurt_";count=3;index=Math.min(count-1,Math.floor(clamp((.18-e.hurt)/.18,0,.9999)*count));} 
    else if(attacking){prefix="prodShadowAttack_";count=7;index=Math.floor(motion.attackProgress*(count-.001));} 
    else if(moving){prefix="prodShadowMove_";count=6;index=Math.floor(motion.phase)%count;} 
    else {prefix="prodShadowIdle_";count=6;index=Math.floor((motion.animTime||0)*5.0)%count;}
  }else{
    if(e.hurt>0){prefix="prodLanternHurt_";count=4;index=Math.min(count-1,Math.floor(clamp((.18-e.hurt)/.18,0,.9999)*count));}
    else if(attacking){prefix="prodLanternAttack_";count=6;index=Math.floor(motion.attackProgress*(count-.001));} 
    else if(moving){prefix="prodLanternMove_";count=6;index=Math.floor(motion.phase)%count;} 
    else {prefix="prodLanternIdle_";count=6;index=Math.floor((motion.animTime||0)*4.6)%count;}
  }
  ctx.save();if(e.hurt)ctx.globalAlpha=.72;
  // Ground contact + restrained warm rim light keep dark enemies readable
  // against rain-black masonry without turning them into neon outlines.
  ctx.save();ctx.globalAlpha=.30;ctx.fillStyle="#050708";ctx.beginPath();ctx.ellipse(x+e.w/2,y+e.h+4,e.w*.52,5.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  glow(x+e.w/2,y+e.h*.45,e.type==="elite"?74:52,e.type==="shadow"?"#c15a50":"#d89b50",.19);
  ctx.save();ctx.translate(x+e.w/2+(visual.offsetX||0),y+e.h+5+(visual.offsetY||0));ctx.rotate(visual.rotation||0);ctx.scale(visual.scaleX||1,visual.scaleY||1);
  ctx.shadowColor=e.aiState==="PREPARE_ATTACK"?"rgba(224,91,60,.78)":e.type==="shadow"?"rgba(201,116,80,.42)":"rgba(222,166,92,.32)";ctx.shadowBlur=e.aiState==="PREPARE_ATTACK"?13:7;
  const ok=drawProductionSeries(prefix,count,index,0,0,height,flip,.98);
  ctx.shadowBlur=0;
  if(!ok){
    const idleKey=e.type==="paper"?"paperIdle":e.type==="shadow"?"shadowIdle":"lanternEnemyIdle";
    const attackKey=e.type==="paper"?"paperAttack":e.type==="shadow"?"shadowAttack":"lanternEnemyAttack";
    drawSpriteAsset(attacking?attackKey:idleKey,0,0,height,flip,.98);
  }
  ctx.restore();
  if(e.dying){
    ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;ctx.restore();return;
  }
  if(e.type==="shadow"&&e.exposed){ctx.globalAlpha=.65;ctx.strokeStyle="#e6c36d";ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.strokeRect(x-5,y-6,e.w+10,e.h+10);ctx.setLineDash([]);}
  if((e.bindTimer||0)>0){ctx.save();ctx.globalAlpha=.72;ctx.strokeStyle="#9ccbc2";ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.strokeRect(x-8,y-8,e.w+16,e.h+16);ctx.setLineDash([]);glow(x+e.w/2,y+e.h*.52,46,"#88b8ae",.10);ctx.restore();}
  if(e.type==="paper"&&e.brittle){ctx.globalAlpha=.72;ctx.strokeStyle="#d8b76f";ctx.lineWidth=1.4;ctx.setLineDash([3,4]);ctx.strokeRect(x-3,y-4,e.w+6,e.h+8);ctx.setLineDash([]);glow(x+e.w/2,y+e.h*.5,34,"#e4c77e",.10);}
  if(e.type==="elite"&&e.lampFed){glow(x+e.w/2,y+e.h*.42,56,"#d77a3d",.22+.05*Math.sin(t*9));ctx.globalAlpha=.7;ctx.strokeStyle="#e08b46";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+e.w/2,y+e.h*.42,22+Math.sin(t*8)*3,0,Math.PI*2);ctx.stroke();}
  else if(e.type==="elite"){ctx.globalAlpha=.65;ctx.strokeStyle="#8fc1b3";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+e.w/2,y+e.h*.42,16,0,Math.PI*2);ctx.stroke();}
  if(e.type==="elite"&&(e.starvePulse||0)>0){const q=(e.starvePulse||0)/.38;ctx.save();ctx.globalAlpha=.75*q;ctx.strokeStyle="#9ed5c7";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+e.w/2,y+e.h*.42,17+(1-q)*28,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(e.type==="elite"&&(e.feedPulse||0)>0){const q=(e.feedPulse||0)/.28;glow(x+e.w/2,y+e.h*.42,68,"#e08745",.20*q);}
  if(e.aiState==="PREPARE_ATTACK"){
    const q=clamp(motion.stageProgress||0,0,1),pulse=.45+.55*Math.sin(q*Math.PI*.5);
    if(e.type==="paper"){
      glow(x+e.w/2,y+e.h*.55,e.w*.9,"#c64b38",.12+.09*q);ctx.save();ctx.globalAlpha=.28+.38*q;ctx.strokeStyle="#e4a06c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+e.w/2+facingDir*10,y+e.h*.55,34+q*12,facingDir>0?-1.1:Math.PI-1.1,facingDir>0?1.0:Math.PI+1.0);ctx.stroke();ctx.restore();
    }else if(e.type==="shadow"){
      ctx.save();ctx.globalAlpha=.18+.34*q;ctx.strokeStyle="#c48b80";ctx.setLineDash([5,5]);for(let i=1;i<=2;i++)ctx.strokeRect(x-i*facingDir*7,y-4+i*2,e.w+8,e.h+5);ctx.setLineDash([]);ctx.restore();
    }else{
      const cx=x+e.w/2,cy=y+e.h*.42;glow(cx,cy,64,"#dc6f3d",.16+.12*q);ctx.save();ctx.globalAlpha=.42+.4*q;ctx.strokeStyle=e.lampFed?"#f19b4f":"#a8d6c8";ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(cx,cy,30-10*q,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.globalAlpha=.20+.34*pulse;ctx.strokeStyle=e.type==="shadow"?"#9b716f":e.type==="elite"?"#d9824c":"#e09862";ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(x+e.w/2,y+e.h+3,e.w*(.52+.10*q),7+q*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;
  if(e.hp<e.maxHp){ctx.fillStyle="#080c0d";roundedRect(x-2,y-13,e.w+4,7,3);ctx.fill();ctx.fillStyle="#b94739";roundedRect(x,y-11,e.w*(e.hp/e.maxHp),3,2);ctx.fill();}
  ctx.restore();
}

function drawBossV2(){
  const b=world.boss;if(!b||world.bossDefeated)return;const x=b.x-cameraX,y=b.y,t=gameTime;
  if(b.dying){
    const dp=clamp(1-(b.deathTimer||0)/Math.max(.001,b.deathTotal||.92),0,1),count=6;
    const idx=Math.min(count-1,Math.floor(dp*count));
    ctx.save();
    ctx.globalAlpha=dp>.78?clamp((1-dp)/.22,.18,1):1;
    glow(x+b.w*.5,y+b.h*.72,210,"#c8583e",.20*(1-dp)+.04);
    ctx.translate(x+b.w*.5,y+b.h+6);
    drawProductionSeries("prodBossDeath_",count,idx,0,0,178,false,1);
    ctx.restore();
    return;
  }
  const keyFor=p=>p===1?"bossPhase1":p===2?"bossPhase2":"bossPhase3";
  const heightFor=p=>p===1?365:p===2?315:255;
  const nudgeFor=p=>p===1?7:p===2?1:3;
  const visual=window.Motion?.getBossVisual?.(b)||{};
  const drawPhase=(phase,alpha=1,extraScale=1)=>{
    const key=keyFor(phase);if(!artReady(key))return false;
    ctx.save();ctx.globalAlpha*=alpha;
    ctx.translate(x+b.w/2+(visual.offsetX||0),y+b.h+nudgeFor(phase)+(visual.offsetY||0));
    ctx.rotate(visual.rotation||0);ctx.scale((visual.scaleX||1)*extraScale,(visual.scaleY||1)*extraScale);
    drawSpriteAsset(key,0,0,heightFor(phase),false,.98);ctx.restore();return true;
  };
  ctx.save();
  if(b.voiceTrial){ctx.globalAlpha=.52+.08*Math.sin(t*6);ctx.globalCompositeOperation="screen";}
  else if(b.hurt){ctx.globalCompositeOperation="screen";ctx.globalAlpha=.86;}
  const glowPhase=b.pendingPhase||b.phase;
  glow(x+b.w/2,y+b.h*.45,glowPhase===3?230:190,glowPhase===3?"#d54436":"#d18a3b",.24);
  const bossActionActive=b.phaseTransition<=0&&(b.windup>0||b.attackFlash>0||b.dash>0);
  if(b.phaseTransition>0&&b.pendingPhase){
    const p=clamp(1-b.phaseTransition/(b.phaseTransitionTotal||.58),0,1);
    const ease=p*p*(3-2*p);
    drawPhase(b.transitionFrom,1-ease*.94,1-ease*.045);drawPhase(b.transitionTo,ease,.94+ease*.06);
  }else drawPhase(b.phase,(bossActionActive&&b.phase>=2)?.16:1,1);
  if(b.windup>0&&b.telegraphKind){
    const tq=clamp(1-b.windup/Math.max(.001,b.telegraphTotal||b.windup),0,1),cx=x+b.w*.5,cy=y+b.h*.46,dir=b.telegraphDir||-1;
    ctx.save();ctx.globalCompositeOperation="screen";
    if(b.telegraphKind==="volley"){
      glow(cx,cy,95+30*tq,"#e7a14e",.10+.13*tq);ctx.globalAlpha=.25+.5*tq;ctx.strokeStyle="#f0b768";ctx.lineWidth=2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(cx,cy,44+18*tq+i*7,-.65+i*.18,.65+i*.18);ctx.stroke();}
    }else if(b.telegraphKind==="ground"){
      const gy=(b.groundY||610)-5;ctx.globalAlpha=.28+.46*tq;ctx.strokeStyle="#a94d43";ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.beginPath();ctx.moveTo(cx-250,gy);ctx.lineTo(cx+250,gy);ctx.stroke();ctx.setLineDash([]);glow(cx,gy,80,"#a83e3b",.10+.10*tq);
    }else if(b.telegraphKind==="dash"){
      const gy=(b.groundY||610)-8,start=cx+dir*(b.w*.34),end=cx+dir*310;
      ctx.globalAlpha=.38+.50*tq;ctx.strokeStyle="#df7057";ctx.lineWidth=3.6;ctx.setLineDash([18,10]);ctx.beginPath();ctx.moveTo(start,gy);ctx.lineTo(end,gy);ctx.stroke();ctx.setLineDash([]);
      ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(end,gy);ctx.lineTo(end-dir*22,gy-11);ctx.moveTo(end,gy);ctx.lineTo(end-dir*22,gy+11);ctx.stroke();
      glow(start+dir*55,gy,76,"#d34f42",.12+.15*tq);
    }
    if(b.telegraphLabel&&tq>.12){
      ctx.globalCompositeOperation="source-over";ctx.globalAlpha=.45+.45*tq;ctx.fillStyle="#f0c38b";ctx.font="600 12px 'Microsoft YaHei'";ctx.textAlign="center";
      ctx.fillText(b.telegraphLabel,cx,Math.max(42,y-18));ctx.textAlign="left";
    }
    ctx.restore();
  }
  // Production attack frames are layered only during attack execution, keeping
  // the authored phase silhouette while adding a clear anticipation/action pose.
  if(bossActionActive){
    const phase=b.phase||1;
    let actionP=.5;
    if(b.windup>0)actionP=clamp(1-b.windup/Math.max(.001,b.telegraphTotal||b.windup),0,1)*.42;
    else if(b.dash>0)actionP=.42+clamp(1-b.dash/Math.max(.001,b.dashTotal||.48),0,1)*.46;
    else if(b.attackFlash>0)actionP=.42+clamp(1-b.attackFlash/.32,0,1)*.58;
    const idx=Math.min(3,Math.floor(clamp(actionP,0,.9999)*4));
    ctx.save();ctx.translate(x+b.w/2,y+b.h+4);ctx.rotate(visual.rotation||0);
    if(phase===2)drawProductionSeries("prodBossP2_",4,idx,0,0,330,false,.96);
    else if(phase===3)drawProductionSeries("prodBossP3_",4,idx,0,0,285,false,.98);
    else if(b.attackFlash>0||b.windup>0)drawProductionSeries("prodBossErupt_",4,idx,0,0,260,false,.86);
    ctx.restore();
  }
  if(b.attackFlash>0){ctx.globalAlpha=Math.min(1,b.attackFlash*2.1);ctx.strokeStyle="#f4bf66";ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+b.w/2,y+b.h*.48,120+Math.sin(t*18)*10,0,Math.PI*2);ctx.stroke();}
  if(b.voiceTrial){
    const mouths=[{x:72,y:78},{x:b.w*.5,y:52},{x:b.w-72,y:82}];
    for(let i=0;i<3;i++){
      const m=mouths[i],mx=x+m.x,my=y+m.y,probe=b.voiceProbe?.[i]||0,revealed=b.voiceRevealed?.[i],beat=.5+.5*Math.sin(t*5+i*1.7);
      // All three scan points remain readable before the player happens to put
      // the lamp on them. This makes the phase a deliberate search, not pixel hunting.
      glow(mx,my,46+beat*8,revealed?(i===b.voiceCorrect?"#eec466":"#916866"):"#9bb8b4",.12+probe*.18);
      ctx.save();ctx.globalAlpha=.62+probe*.32;ctx.strokeStyle=revealed?(i===b.voiceCorrect?"#f0c86d":"#8b6562"):"#9fbab5";ctx.lineWidth=1.8+probe*3;
      ctx.beginPath();ctx.ellipse(mx,my,28+probe*9,17+probe*5,0,0,Math.PI*2);ctx.stroke();
      for(let r=0;r<2;r++){ctx.globalAlpha=.26+.12*beat;ctx.beginPath();ctx.arc(mx,my,35+r*10+beat*4,-.55,.55);ctx.stroke();}
      ctx.globalAlpha=.86;ctx.fillStyle="#0b1214d9";ctx.beginPath();ctx.arc(mx,my-31,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b9d0c8";ctx.stroke();ctx.fillStyle="#d7e5df";ctx.font="700 10px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(revealed?"声":"?",mx,my-30.5);ctx.restore();
    }
  }
  ctx.restore();
}


function drawRitualBladeAttackV2(x,footY,a){
  if(!a||a.type!=="ritual"||!artReady("ritualBlade"))return;
  const p=clamp(a.time/a.total,0,1),dir=player.facing||1,img=art.ritualBlade;
  const step=a.step||1;let ang,reach=30,lift=68;
  if(a.kind==="ritual-thrust"){ang=Math.PI*.50;reach=38+42*Math.sin(Math.min(1,p/.65)*Math.PI*.5);lift=66;}
  else if(a.kind==="ritual-reverse"){ang=1.10-p*1.75;reach=31;lift=72;}
  else if(a.kind==="ritual-finish"||a.charged){ang=-1.05+p*2.25;reach=35+12*Math.sin(p*Math.PI);lift=70;}
  else {ang=-.90+p*1.65;reach=31;lift=70;}
  const hx=x+20+dir*reach,hy=footY-lift,w=22,h=54;
  ctx.save();ctx.translate(hx,hy);ctx.scale(dir,1);ctx.rotate(ang);ctx.drawImage(img,-w/2,-h+6,w,h);ctx.restore();
  ctx.save();ctx.globalCompositeOperation="screen";ctx.strokeStyle=a.charged?"#ff9a78":"#df684f";ctx.lineWidth=a.charged?7:4;ctx.globalAlpha=(1-p)*.72;
  ctx.beginPath();
  if(a.kind==="ritual-thrust"){ctx.moveTo(x+20+dir*18,footY-67);ctx.lineTo(x+20+dir*(68+50*p),footY-67);}
  else ctx.arc(x+20,footY-70,48+(step===4?11:0),dir>0?-1.25:Math.PI-1.25,dir>0?.85:Math.PI+.85);
  ctx.stroke();ctx.restore();
}

function concealEmbeddedLantern(x,footY){
  if(player.lampHeld)return;
  const dir=player.facing||1,cx=x+20+dir*44,cy=footY-61;
  ctx.save();ctx.translate(cx,cy);ctx.scale(dir,1);
  const g=ctx.createLinearGradient(-14,-18,16,22);g.addColorStop(0,"rgba(28,40,45,.96)");g.addColorStop(.55,"rgba(19,31,35,.97)");g.addColorStop(1,"rgba(11,20,24,.98)");
  ctx.fillStyle=g;ctx.strokeStyle="rgba(7,14,16,.72)";ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-10,-17);ctx.quadraticCurveTo(8,-22,15,-5);ctx.quadraticCurveTo(18,10,8,19);ctx.quadraticCurveTo(-2,23,-15,9);ctx.quadraticCurveTo(-18,-7,-10,-17);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.globalAlpha=.7;ctx.strokeStyle="#6a7b77";ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-6,-8);ctx.quadraticCurveTo(-2,-2,4,8);ctx.stroke();
  ctx.restore();
}

function drawPlayerV2(){
  const x=player.x-cameraX,y=player.y,t=gameTime;
  if(player.dead&&!['collapse','gather'].includes(player.deathPhase))return;
  const visualFootY=y+player.h+6;
  if(artReady("ayanIdle")){
    const motionState=window.Motion?.getPlayerMotionState?.()||{mode:player.hurtTimer>0?"hurt":player.attack?"attack":player.grounded?"idle":"air",phase:t*1.2,airMode:player.vy<-120?"rise":player.vy>120?"fall":"apex"};
    const locomotionModes=new Set(["startMove","move","stopMove","turn"]);
    const moving=player.grounded&&locomotionModes.has(motionState.mode)&&Math.abs(player.vx)>8;
    const fast=(motionState.gait||"walk")==="run";
    const locomotionFrames=fast?["ayanRun1","ayanRun2","ayanRun3","ayanRun4","ayanRun5","ayanRun6"]:["ayanWalk1","ayanWalk2","ayanWalk3","ayanWalk4","ayanWalk5","ayanWalk6"];
    // Motion.phase is still calibrated to the original 3-frame stride. Walk now has
    // six true poses, so sample it at 2x frame density without changing stride speed.
    const locomotionPhase=(motionState.phase||0)*2;
    const locomotionCount=locomotionFrames.length;
    const cycle=((Math.floor(locomotionPhase)%locomotionCount)+locomotionCount)%locomotionCount;
    const cycleFrac=locomotionPhase-Math.floor(locomotionPhase);
    let pose="ayanIdle";
    if(motionState.mode==="hurt"||player.dead)pose="ayanHurt";
    else if(player.dodging>0)pose="ayanDodge";
    else if(motionState.mode==="air")pose="ayanJump";
    else if(player.lampHeld&&world.lamp.focused&&!moving&&!player.attack)pose="ayanRaise";
    else if(moving)pose=locomotionFrames[cycle];
    const visual=window.Motion?.getPlayerVisual?.()||{};
    ctx.save();const paperState=paperBodyState();if(player.invuln>0&&Math.floor(t*20)%2)ctx.globalAlpha=.38;else if(paperState.critical)ctx.globalAlpha=1-paperState.translucency;
    glow(x+20,y+50,58,"#f3b34a",.18);
    if(player.dodging>0){const dd=player.dodgeDirection||-player.facing;for(let i=4;i>0;i--){ctx.save();ctx.translate(x+20-dd*i*16,visualFootY);ctx.rotate(visual.rotation||0);ctx.scale(visual.scaleX||1,visual.scaleY||1);drawSpriteAsset(pose,0,0,148,player.facing<0,.045*i);ctx.restore();}}
    ctx.save();ctx.translate(x+20+(visual.offsetX||0),visualFootY+(visual.offsetY||0));ctx.rotate(visual.rotation||0);ctx.scale(visual.scaleX||1,visual.scaleY||1);
    if(player.dead&&player.deathPhase==="collapse"){
      const dp=clamp((player.deathVisualTimer||0)/.42,0,1),count=7;
      const idx=Math.min(count-1,Math.floor(dp*count));
      if(!drawProductionSeries("prodAyanDeath_",count,idx,0,0,178,player.facing<0,1))drawSpriteAsset("ayanHurt",0,0,174,player.facing<0,1);
    }else if(motionState.mode==="hurt"){
      const hp=clamp(1-(player.hurtTimer||0)/.22,0,1),count=3;
      const idx=Math.min(count-1,Math.floor(hp*count));
      if(!drawProductionSeries("prodAyanHurt_",count,idx,0,0,174,player.facing<0,1))drawSpriteAsset("ayanHurt",0,0,174,player.facing<0,1);
    }else if(player.dodging>0){
      const dp=clamp(1-player.dodging/.24,0,1),count=4,idx=Math.min(count-1,Math.floor(dp*count));
      if(!drawProductionSeries("prodAyanDodge_",count,idx,0,0,150,player.facing<0,1))drawSpriteAsset("ayanDodge",0,0,148,player.facing<0,1);
    }else if(motionState.mode==="attack"&&player.attack){
      const ap=clamp(player.attack.time/player.attack.total,0,1);
      if(player.attack.type==="ritual"){
        let prefix="prodAyanAttack1_",count=5,height=180;
        if(player.attack.kind==="ritual-reverse"){prefix="prodAyanAttack2_";count=6;height=182;}
        else if(player.attack.kind==="ritual-thrust"){prefix="prodAyanAttack3_";count=6;height=184;}
        else if(player.attack.kind==="ritual-finish"||player.attack.kind==="ritual-dash"||player.attack.charged){prefix="prodAyanHeavy_";count=4;height=186;}
        const eased=ap<.22?(ap/.22)*.16:.16+((ap-.22)/.78)*.84;
        const idx=Math.min(count-1,Math.floor(clamp(eased,0,.9999)*count));
        if(!drawProductionSeries(prefix,count,idx,0,0,height,player.facing<0,1)){
          drawSpriteAsset(player.attack.charged?"ayanAttackHeavy":"ayanAttackLight",0,0,176,player.facing<0,1);
        }
      }else{
        let prefix="prodAyanAttack1_",count=5,height=184;
        if(player.attack.charged){prefix="prodAyanHeavy_";count=4;height=188;}
        else if(player.attack.step===2){prefix="prodAyanAttack2_";count=6;}
        else if(player.attack.step===3){prefix="prodAyanAttack3_";count=6;}
        const idx=Math.min(count-1,Math.floor(clamp(ap,0,.9999)*count));
        if(!drawProductionSeries(prefix,count,idx,0,0,height,player.facing<0,1))drawSpriteAsset(player.attack.charged?"ayanAttackHeavy":"ayanAttackLight",0,0,174,player.facing<0,1);
      }
    }else if(motionState.mode==="air"){
      // Six clean jump poses only: every frame keeps Ayan's lantern visible.
      // 0-2 rise, 3 fall, 4-5 landing/recovery.
      let airIndex=2;
      if(motionState.airMode==="rise")airIndex=player.vy<-360?0:player.vy<-210?1:2;
      else if(motionState.airMode==="apex")airIndex=2;
      else airIndex=3;
      if(!drawProductionSeries("prodAyanJump_",6,airIndex,0,0,178,player.facing<0,1))drawSpriteAsset("ayanJump",0,0,174,player.facing<0,1);
    }else if(motionState.mode==="land"){
      const lp=clamp(1-(motionState.landTimer||0)/.12,0,1),li=lp<.52?4:5;
      if(!drawProductionSeries("prodAyanJump_",6,li,0,0,176,player.facing<0,1))drawSpriteAsset("ayanCrouch",0,0,152,player.facing<0,1);
    }else if(moving&&player.grounded&&!player.dodging){
      // Walk and run now both have six distinct poses on one shared pivot.
      // Render exactly one body frame: no whole-body crossfade / ghosting needed.
      drawPlayerLocomotionSprite(pose,0,0,174,player.facing<0,1);
    }else if(pose==="ayanIdle"){
      const idleIndex=Math.floor(gameTime*2.2)%4;
      if(!drawProductionSeries("prodAyanIdle_",4,idleIndex,0,0,174,player.facing<0,1))drawSpriteAsset("ayanIdle",0,0,174,player.facing<0,1);
    }else drawSpriteAsset(pose,0,0,pose==="ayanDodge"?148:(pose==="ayanRaise"?184:174),player.facing<0,1);
    ctx.restore();
    if(!player.lampHeld)concealEmbeddedLantern(x,visualFootY);
    if(player.attack?.type==="ritual")drawRitualBladeAttackV2(x,visualFootY,player.attack);
    if(player.weapon?.type==="ritual"&&!player.lampHeld&&!player.attack&&artReady("ritualBlade")){
      const img=art.ritualBlade;ctx.save();ctx.translate(x+20+player.facing*25,visualFootY-70);ctx.rotate(player.facing*.72);ctx.scale(player.facing,1);ctx.drawImage(img,-8,-32,16,38);ctx.restore();
    }
    // The lantern remains its own gameplay object and follows a hand anchor;
    // beam, flame stability and drop/pick-up state are independent of body art.
    if(player.lampHeld){
      // Every approved Ayan gameplay pose already contains the lantern in his hand.
      // Drawing a second standalone lantern on top made the prop look pasted-on/doubled.
      // Keep only the dynamic light origin here; the body sprite owns the visible held lantern.
      const p=lampPose(),lv=window.Motion?.getLanternVisual?.()||{};
      glow((p.x-cameraX)+(lv.sway||0)*8,p.y+8,38,"#ffd477",.24*(lv.scale||1));
    }
    if(player.charging){const q=clamp((performance.now()-jHoldStart)/430,0,1);glow(x+20,y+38,34+q*28,"#dc4938",.32+q*.24);ctx.strokeStyle="#e45b47";ctx.lineWidth=2+q*3;ctx.beginPath();ctx.arc(x+20,y+38,27+q*18,0,Math.PI*2);ctx.stroke();}
    // Production attack frames already contain the authored lantern arc. The
    // previous build drew an extra dark ring and a second slash sprite over
    // them, which read as unexplained ghosts around Ayan.
    if(player.grounded&&player.x>1100&&Math.abs(player.vx)>40)drawSpriteAsset("vfxSplash",x+20,visualFootY+3,42,false,.25+.2*Math.abs(Math.sin(t*8)));
    if(paperState.fragile||player.paperHurtFlash>0){
      const burn=Math.max(paperState.edgeBurn,clamp((player.paperHurtFlash||0)/.34,0,1)*.55);
      ctx.save();ctx.globalAlpha=.10+.20*burn;ctx.strokeStyle="#7a4b2d";ctx.lineWidth=2+2*burn;ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(x+20,y+42,25+burn*4,55,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
    ctx.restore();return;
  }
  ctx.save();ctx.translate(x+20,y+72);ctx.scale(1.16,1.16);ctx.translate(-(x+20),-(y+72));if(player.invuln>0&&Math.floor(t*20)%2)ctx.globalAlpha=.38;
  const moving=player.grounded&&Math.abs(player.vx)>25,walk=moving?Math.sin(t*13):0,bob=moving?Math.abs(Math.sin(t*13))*2:Math.sin(t*2.1)*.8;
  if(player.dodging>0){for(let i=4;i>0;i--){ctx.save();ctx.globalAlpha=.07*i;ctx.translate(-player.facing*i*16,0);drawPlayerGhost(x,y,bob);ctx.restore();}}
  glow(x+20,y+50,42,"#f3b34a",.16);
  // Legs and cloth shoes.
  ctx.strokeStyle="#101719";ctx.lineWidth=8;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x+14,y+56);ctx.lineTo(x+12+walk*5,y+70);ctx.moveTo(x+27,y+56);ctx.lineTo(x+28-walk*5,y+70);ctx.stroke();ctx.strokeStyle="#9b8569";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+7+walk*5,y+70);ctx.lineTo(x+15+walk*5,y+70);ctx.moveTo(x+24-walk*5,y+70);ctx.lineTo(x+34-walk*5,y+70);ctx.stroke();
  // Coat silhouette with animated hems and embroidered trim.
  const coat=ctx.createLinearGradient(x,y+25,x+40,y+68);coat.addColorStop(0,"#20383c");coat.addColorStop(.55,"#152a2f");coat.addColorStop(1,"#0b191d");ctx.fillStyle=coat;ctx.strokeStyle="#071013";ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(x+10,y+27+bob);ctx.quadraticCurveTo(x+20,y+22+bob,x+31,y+27+bob);ctx.bezierCurveTo(x+37,y+39,x+40,y+55,x+37+walk*2,y+67);ctx.quadraticCurveTo(x+29,y+63,x+22,y+68);ctx.quadraticCurveTo(x+13,y+63,x+3-walk*2,y+67);ctx.bezierCurveTo(x+5,y+50,x+5,y+37,x+10,y+27+bob);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#aa3f33";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+10,y+31+bob);ctx.quadraticCurveTo(x+21,y+36,x+32,y+31+bob);ctx.stroke();ctx.strokeStyle="#6c807c";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x+20,y+35);ctx.lineTo(x+21,y+60);ctx.stroke();
  // Head, ears and hair with loose strands.
  ctx.fillStyle="#d8c4a5";ctx.strokeStyle="#1a1715";ctx.lineWidth=2.4;ctx.beginPath();ctx.ellipse(x+21,y+16+bob,13.5,15.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle="#151718";ctx.beginPath();ctx.moveTo(x+7,y+16+bob);ctx.quadraticCurveTo(x+7,y-1+bob,x+22,y+1+bob);ctx.quadraticCurveTo(x+38,y+2+bob,x+35,y+19+bob);ctx.lineTo(x+31,y+12+bob);ctx.quadraticCurveTo(x+20,y+9+bob,x+10,y+14+bob);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x+33,y+9+bob);ctx.quadraticCurveTo(x+43,y+17+bob,x+36,y+31+bob);ctx.lineTo(x+30,y+27+bob);ctx.closePath();ctx.fill();
  // Expressive facial state: blink, attack focus, hurt grimace, calm idle.
  const blink=Math.sin(t*.9)>.982,mood=player.dead?"dead":player.hurtTimer>0?"hurt":player.attack?"attack":moving?"run":"idle";ctx.strokeStyle="#25201c";ctx.fillStyle="#25201c";ctx.lineWidth=1.7;
  if(blink||mood==="dead"){ctx.beginPath();ctx.moveTo(x+13,y+17+bob);ctx.lineTo(x+18,y+18+bob);ctx.moveTo(x+24,y+18+bob);ctx.lineTo(x+29,y+17+bob);ctx.stroke();}
  else{const eyeY=y+17+bob,tilt=mood==="attack"?-1:mood==="hurt"?1:0;ctx.beginPath();ctx.ellipse(x+16,eyeY+tilt,2.1,mood==="hurt"?1:1.7,0,0,Math.PI*2);ctx.ellipse(x+27,eyeY-tilt,2.1,mood==="hurt"?1:1.7,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+12,eyeY-4+tilt);ctx.lineTo(x+19,eyeY-5-tilt);ctx.moveTo(x+23,eyeY-5-tilt);ctx.lineTo(x+30,eyeY-4+tilt);ctx.stroke();}
  ctx.strokeStyle=mood==="hurt"?"#8c3c32":"#5b342d";ctx.lineWidth=1.6;ctx.beginPath();if(mood==="attack")ctx.moveTo(x+18,y+25+bob),ctx.lineTo(x+26,y+25+bob);else if(mood==="hurt")ctx.arc(x+22,y+29+bob,4,Math.PI,Math.PI*2);else ctx.arc(x+21,y+23+bob,4,.25,Math.PI-.25);ctx.stroke();
  // Arms follow attack and guard states.
  const reach=player.attack?player.facing*18:player.facing*5;ctx.strokeStyle="#d0b996";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x+11,y+35);ctx.lineTo(x+7-reach*.25,y+51);ctx.moveTo(x+31,y+35);ctx.lineTo(x+31+reach,y+46);ctx.stroke();ctx.fillStyle="#cdb591";ctx.beginPath();ctx.arc(x+31+reach,y+46,4,0,Math.PI*2);ctx.fill();
  // Waist lantern, scarf tail and weapon.
  glow(x+21-player.facing*3,y+51,26,"#ffc557",.32);drawLantern(x+21-player.facing*3,y+51,.23,true,Math.sin(t*5)*.05);
  ctx.strokeStyle="#a93e33";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+8,y+31);ctx.quadraticCurveTo(x-3-player.facing*walk*3,y+39,x-8-player.facing*walk*5,y+48);ctx.stroke();
  if(player.weapon&&!player.lampHeld){const handX=x+31+reach,handY=y+46;ctx.strokeStyle="#2b211c";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(handX+player.facing*11,handY-5);ctx.stroke();ctx.strokeStyle=player.weapon.color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(handX+player.facing*8,handY-4);ctx.lineTo(handX+player.facing*47,handY-19);ctx.stroke();}
  if(player.lampHeld){const p=lampPose();glow(p.x-cameraX,p.y,30,"#ffd477",.25);drawLantern(p.x-cameraX,p.y,.28,true,Math.sin(t*5)*.08);}
  if(player.charging){const q=clamp((performance.now()-jHoldStart)/430,0,1);glow(x+21,y+37,32+q*24,"#dc4938",.3+q*.25);ctx.strokeStyle="#e45b47";ctx.lineWidth=2+q*3;ctx.beginPath();ctx.arc(x+21,y+37,25+q*17,0,Math.PI*2);ctx.stroke();}
  if(player.attack){const a=player.attack,progress=a.time/a.total;ctx.strokeStyle=a.color;ctx.lineWidth=a.charged?13:7;ctx.globalAlpha=.75*(1-progress);ctx.beginPath();if(a.kind==="plunge")ctx.arc(x+21,y+65,46,0,Math.PI);else ctx.arc(x+21,y+37,a.range*.82,player.facing>0?-1.2:1.95,player.facing>0?1.2:4.33);ctx.stroke();for(let n=1;n<=3;n++){ctx.globalAlpha=.22*(1-progress);ctx.lineWidth=Math.max(1,(a.charged?8:4)-n);ctx.beginPath();if(a.kind==="plunge")ctx.arc(x+21+n*3,y+62+n*2,42+n*4,.08,Math.PI-.1);else ctx.arc(x+21,y+37,(a.range*.72)+n*8,player.facing>0?-1.05-n*.05:2.05,player.facing>0?1.02+n*.04:4.2);ctx.stroke();}ctx.globalAlpha=1;}
  ctx.restore();
}
function drawPlayerGhost(x,y,bob){ctx.fillStyle="#9cb2b3";ctx.beginPath();ctx.ellipse(x+21,y+16+bob,13,15,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+10,y+27);ctx.lineTo(x+32,y+27);ctx.lineTo(x+38,y+67);ctx.lineTo(x+3,y+67);ctx.closePath();ctx.fill();}
function drawProjectilesV2(){
  ctx.save();
  for(const p of world.projectiles){
    const x=p.x-cameraX,y=p.y;
    if(x<-80||x>W+80||y<-80||y>H+80)continue;
    // Avoid one radial-gradient allocation per projectile per frame. Two flat
    // translucent shapes preserve readability while keeping Phase 02 cheap.
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(p.vy,p.vx));
    ctx.globalAlpha=.16;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.r*2.1,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.95;ctx.beginPath();ctx.moveTo(p.r*1.6,0);ctx.quadraticCurveTo(0,-p.r,-p.r*1.3,0);ctx.quadraticCurveTo(0,p.r,p.r*1.6,0);ctx.fill();
    ctx.globalAlpha=.6;ctx.strokeStyle="#fff7";ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
function drawEntityShadowsV2(){
  ctx.save();ctx.translate(-cameraX,0);ctx.fillStyle="#02060766";
  const playerGround=groundInfoAt(player.x+player.w*.5,player.y+player.h-8,220)||getPrimaryGroundAt(player.x+player.w*.5);
  if(playerGround){const h=Math.max(0,(playerGround.groundY??playerGround.y)-(player.y+player.h));ctx.globalAlpha=clamp(.42-h*.01,.12,.42);ctx.beginPath();ctx.ellipse(player.x+player.w/2,(playerGround.groundY??playerGround.y)+3,24-h*.04,5-h*.01,0,0,Math.PI*2);ctx.fill();}
  for(const e of world.enemies){if(!e.alive)continue;const gy=e.groundY??getPrimaryGroundAt(e.x+e.w*.5)?.y;if(gy==null)continue;const air=Math.max(0,gy-(e.y+e.h));ctx.globalAlpha=clamp(.38-air*.012,.1,.38);ctx.beginPath();ctx.ellipse(e.x+e.w/2,gy+3,Math.max(10,e.w*.52-air*.05),Math.max(2,5-air*.02),0,0,Math.PI*2);ctx.fill();}
  if(world.bossActive&&world.boss){const b=world.boss,gy=b.groundY??getPrimaryGroundAt(b.x+b.w*.5)?.y;if(gy!=null){ctx.globalAlpha=.4;ctx.beginPath();ctx.ellipse(b.x+b.w*.5,gy+4,105,15,0,0,Math.PI*2);ctx.fill();}}
  ctx.restore();ctx.globalAlpha=1;
}
function drawEnvironmentalDetailsV3(){
  if(productionRegionId(sceneRegionAt(cameraX+W*.5).id))return;
  if(artReady(sceneAssetForZone(cameraX+W*.5)))return;
  ctx.save();ctx.translate(-cameraX,0);
  // Wet ground, broken paper, drain grates and reflected lantern strokes.
  if(cameraX+W>1000){
    const puddles=[[1230,598,105],[1820,598,78],[2510,598,125],[3260,598,92],[4100,598,135],[4930,598,96],[5480,598,68],[6170,598,120],[6900,598,90]];
    ctx.strokeStyle="#90aeb055";ctx.lineWidth=1.5;for(const [x,y,r] of puddles){ctx.beginPath();ctx.ellipse(x,y,r,6,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#d39b4844";ctx.beginPath();ctx.moveTo(x-12,y-2);ctx.lineTo(x+12,y-2);ctx.moveTo(x-7,y+2);ctx.lineTo(x+7,y+2);ctx.stroke();ctx.strokeStyle="#90aeb055";}
    ctx.fillStyle="#a9987755";for(let i=0;i<24;i++){const x=1180+i*181,y=586+(i%3)*6;ctx.save();ctx.translate(x,y);ctx.rotate((i%5-2)*.22);ctx.fillRect(-8,-2,16,4);ctx.restore();}
    for(const x of [1580,2380,3540,4650,5380]){ctx.fillStyle="#121e21";ctx.fillRect(x,592,62,10);ctx.strokeStyle="#53696b";ctx.lineWidth=1;for(let k=6;k<60;k+=9){ctx.beginPath();ctx.moveTo(x+k,594);ctx.lineTo(x+k,600);ctx.stroke();}}
    // Market residue: baskets, ceramic jars, stacked boards and faded shop banners.
    for(const [x,c] of [[1450,"#6f4b34"],[2700,"#42575a"],[3325,"#704638"],[5160,"#475b5d"]]){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,584,23,9,0,0,Math.PI*2);ctx.lineTo(x+18,610);ctx.lineTo(x-18,610);ctx.closePath();ctx.fill();ctx.strokeStyle="#1b2526";ctx.stroke();ctx.strokeStyle="#9b7c5855";for(let k=-12;k<=12;k+=8){ctx.beginPath();ctx.moveTo(x+k,584);ctx.lineTo(x+k*.8,607);ctx.stroke();}}
    for(const [x,label] of [[1320,"灯"],[2210,"渡"],[3600,"纸"],[4890,"茶"]]){ctx.fillStyle="#7f332d";ctx.fillRect(x,330,44,102);ctx.strokeStyle="#c0915c";ctx.lineWidth=2;ctx.strokeRect(x+4,334,36,94);ctx.fillStyle="#dbc89c";ctx.font="22px serif";ctx.textAlign="center";ctx.fillText(label,x+22,388);ctx.textAlign="left";ctx.strokeStyle="#303b3d";ctx.beginPath();ctx.moveTo(x+22,286);ctx.lineTo(x+22,330);ctx.stroke();}
    ctx.fillStyle="#aab8b31b";for(const x of [1160,2020,2440,3180,4050,5570]){ctx.beginPath();ctx.moveTo(x,610);ctx.lineTo(x+23,535);ctx.lineTo(x+42,610);ctx.closePath();ctx.fill();}
  }
  if(cameraX<1150){
    // Workshop micro-details: brush wash, ink stone, twine, wood grain and loose cuttings.
    ctx.fillStyle="#2a2119";ctx.beginPath();ctx.ellipse(616,501,22,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#0c0d0d";ctx.beginPath();ctx.ellipse(616,498,15,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#4b3022";ctx.fillRect(547,475,28,28);for(let i=0;i<5;i++){ctx.strokeStyle=i%2?"#bba06e":"#6e4b31";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(550+i*5,478);ctx.lineTo(543+i*7,438-i*5);ctx.stroke();}
    ctx.strokeStyle="#8d7048";ctx.lineWidth=1.2;for(let y=514;y<538;y+=7){ctx.beginPath();ctx.moveTo(360,y);ctx.bezierCurveTo(470,y-3,620,y+4,742,y);ctx.stroke();}
    ctx.fillStyle="#d2c19d";for(let i=0;i<9;i++){ctx.save();ctx.translate(260+i*58,588+(i%2)*6);ctx.rotate((i%3-1)*.4);ctx.fillRect(-6,-2,12,4);ctx.restore();}
  }
  ctx.restore();
}
function drawRegionAmbienceV4(){
  if(world.epilogueActive)return;
  const id=sceneRegionAt(cameraX+W*.5).id,t=gameTime;
  const ranges={opera:[7300,9800],bamboo:[9800,12300],ferry:[12300,14700],city:[14700,17400],final:[17400,19800]};
  const range=ranges[id];if(!range)return;
  const span=range[1]-range[0];
  ctx.save();ctx.translate(-cameraX,0);
  if(id==="opera"){
    ctx.fillStyle="#c79a70";
    for(let j=0;j<11;j++){
      const wx=range[0]+((j*227+t*7)%span),y=130+((j*83+t*13)%390);
      ctx.globalAlpha=.08+.06*(.5+.5*Math.sin(t*1.7+j));ctx.beginPath();ctx.arc(wx,y,1.2+(j%3)*.5,0,Math.PI*2);ctx.fill();
    }
  }else if(id==="bamboo"){
    for(let j=0;j<10;j++){
      const wx=range[0]+((j*239+t*18)%span),y=90+((j*67+t*24)%500);
      ctx.save();ctx.translate(wx,y);ctx.rotate(.45+Math.sin(t*1.4+j)*.7);ctx.globalAlpha=.13;ctx.fillStyle="#8ea77a";ctx.beginPath();ctx.ellipse(0,0,7,2.1,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }else if(id==="ferry"){
    ctx.strokeStyle="#a7ced0";ctx.lineWidth=1.2;
    for(let j=0;j<8;j++){
      const wx=range[0]+((j*271)%span),y=548+(j%4)*12;
      ctx.globalAlpha=.08+.05*(.5+.5*Math.sin(t*1.3+j));ctx.beginPath();ctx.ellipse(wx,y,38+(j%3)*15+Math.sin(t+j)*5,4+(j%2)*2,0,0,Math.PI*2);ctx.stroke();
    }
  }else if(id==="city"){
    for(let j=0;j<12;j++){
      const wx=range[0]+((j*211+t*10)%span),y=100+((j*79+t*15)%500);
      ctx.save();ctx.translate(wx,y);ctx.rotate(t*.3+j);ctx.globalAlpha=.10;ctx.fillStyle=j%3?"#c5b99c":"#8e7965";ctx.fillRect(-3,-1,6,2);ctx.restore();
    }
  }else if(id==="final"){
    for(let j=0;j<13;j++){
      const wx=range[0]+((j*181)%span),y=130+((j*61-t*14)%440+440)%440,pulse=.5+.5*Math.sin(t*2+j);
      ctx.globalAlpha=.09+.11*pulse;ctx.fillStyle=j%2?"#d8a46a":"#b2748c";ctx.beginPath();ctx.arc(wx,y,1.5+pulse*1.5,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();ctx.globalAlpha=1;
}
function objectiveHintTarget(){
  if(routeHintIdle<5.4||!["opera","bamboo","ferry","city","final"].includes(world.currentRegion))return null;
  const p=world.chapterProgress?.[world.currentRegion];if(!p||p.solved)return null;
  const candidates=CHAPTER_INTERACTABLES.filter(o=>o.chapter===world.currentRegion&&chapterObjectVisible(o)&&chapterObjectNeedsAttention(o,p));
  if(!candidates.length)return null;
  candidates.sort((a,b)=>chapterInteractionPriority(b)-chapterInteractionPriority(a)||Math.abs(a.x-player.x)-Math.abs(b.x-player.x));
  return candidates[0];
}
function drawObjectiveWhisperV4(){
  const o=objectiveHintTarget();if(!o)return;
  const a=chapterInteractionAnchor(o),sx=a.x-cameraX,fade=clamp((routeHintIdle-5.4)/2,0,.72),pulse=.5+.5*Math.sin(gameTime*4);
  ctx.save();ctx.globalAlpha=fade;
  if(sx<54||sx>W-54){
    const left=sx<54,x=left?26:W-26,y=H*.48;
    ctx.strokeStyle="#d1ae72";ctx.fillStyle="rgba(13,17,20,.72)";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x,y,15+pulse*2,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#e0c58e";ctx.font="700 16px serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(left?"‹":"›",x,y-1);
    ctx.font="9px 'Microsoft YaHei'";ctx.fillStyle="#aa9777";ctx.fillText("线索",x,y+28);
  }else{
    const y=Math.max(72,a.y-70);ctx.strokeStyle="#d3b06f";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sx,y+5);ctx.lineTo(sx,y+23);ctx.stroke();
    ctx.globalAlpha*=.55;glow(sx,y,22+pulse*5,"#e7bd70",.18);
  }
  ctx.restore();
}
function drawImpactSpotV4(){
  if((impactSpot.life||0)<=0)return;
  const q=clamp(impactSpot.life/Math.max(.001,impactSpot.max),0,1),sx=impactSpot.x-cameraX,sy=impactSpot.y;
  if(sx<-90||sx>W+90)return;
  const age=1-q,p=impactSpot.power||1;
  ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.22*q;ctx.fillStyle=impactSpot.color;ctx.beginPath();ctx.arc(sx,sy,10+age*26*p,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.48*q;ctx.strokeStyle=impactSpot.color;ctx.lineWidth=1.4+p*.45;ctx.beginPath();ctx.arc(sx,sy,7+age*34*p,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawParticlesV2(){ctx.save();ctx.translate(-cameraX,0);for(const p of world.particles){if(p.x<cameraX-80||p.x>cameraX+W+80||p.y<-80||p.y>H+80)continue;const a=clamp(p.life/p.max,0,1);ctx.globalAlpha=a;ctx.fillStyle=p.color;if(p.type==='spark'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillRect(-p.size*2.3,-p.size*.35,p.size*4.6,p.size*.7);ctx.restore();}else if(p.type==='paper'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);ctx.fillStyle=p.color||'#d8c7a1';ctx.fillRect(-(p.w||8)/2,-(p.h||3)/2,p.w||8,p.h||3);ctx.strokeStyle='rgba(96,72,46,.45)';ctx.lineWidth=.8;ctx.strokeRect(-(p.w||8)/2,-(p.h||3)/2,p.w||8,p.h||3);ctx.restore();}else if(p.size>4)ctx.fillRect(p.x-p.size*.8,p.y-p.size*.25,p.size*1.6,p.size*.5);else{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}}ctx.restore();ctx.globalAlpha=1;}
function drawOfficialSpriteFx(){ctx.save();ctx.translate(-cameraX,0);for(const f of world.spriteFx){const a=clamp(f.life/f.max,0,1);drawSpriteAsset(f.key,f.x,f.y,f.height,f.flip,Math.sin(Math.min(1,a)*Math.PI)*.95);}ctx.restore();}
function drawFloatersV5(){ctx.save();ctx.translate(-cameraX,0);ctx.textAlign="center";ctx.font="700 16px 'Microsoft YaHei',sans-serif";for(const f of world.floaters){ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.fillStyle="#11191ddd";ctx.fillText(f.text,f.x+1,f.y+1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.restore();ctx.globalAlpha=1;ctx.textAlign="left";}
const FOREGROUND_OCCLUDERS={
  opera:[{x:8420,y:410,w:46,h:205,type:"pillar"}],
  bamboo:[{x:10840,y:360,w:90,h:250,type:"bamboo"}],
  ferry:[{x:13210,y:500,w:130,h:115,type:"reed"}],
  city:[{x:16540,y:500,w:86,h:120,type:"grave"}]
};
function drawForegroundOcclusion(){
  const region=sceneRegionAt(cameraX+W*.5).id,items=FOREGROUND_OCCLUDERS[region];
  if(!items?.length||world.epilogueActive)return;
  ctx.save();ctx.translate(-cameraX,0);
  for(const o of items){
    if(o.x+o.w<cameraX-60||o.x>cameraX+W+60)continue;
    ctx.save();
    if(o.type==="pillar"){
      ctx.globalAlpha=.34;ctx.fillStyle="#201814";ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.globalAlpha=.22;ctx.fillStyle="#6e4f35";ctx.fillRect(o.x+7,o.y,o.w*.18,o.h);
    }else if(o.type==="bamboo"){
      ctx.globalAlpha=.30;ctx.strokeStyle="#1f332d";ctx.lineWidth=7;
      for(let i=0;i<3;i++){const bx=o.x+i*23;ctx.beginPath();ctx.moveTo(bx,o.y+o.h);ctx.quadraticCurveTo(bx-8,o.y+120,bx+4,o.y);ctx.stroke();}
      ctx.globalAlpha=.18;ctx.fillStyle="#4b675c";for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(o.x+12+(i%3)*24,o.y+70+i*24,18,5,(i%2?-.45:.45),0,Math.PI*2);ctx.fill();}
    }else if(o.type==="reed"){
      ctx.globalAlpha=.28;ctx.strokeStyle="#59675a";ctx.lineWidth=3;
      for(let i=0;i<8;i++){const rx=o.x+i*15;ctx.beginPath();ctx.moveTo(rx,o.y+o.h);ctx.quadraticCurveTo(rx-8,o.y+45,rx+(i%2?7:-6),o.y+5);ctx.stroke();}
    }else if(o.type==="grave"){
      ctx.globalAlpha=.30;ctx.fillStyle="#2c2d2b";ctx.strokeStyle="#69625b";ctx.lineWidth=1.4;roundedRect(o.x,o.y,o.w,o.h,8);ctx.fill();ctx.stroke();
      ctx.globalAlpha=.18;ctx.fillStyle="#bfb39c";ctx.fillRect(o.x+16,o.y+18,o.w-32,4);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawForegroundV2(){
  ctx.save();const zone=cameraX+W/2;if(zone>1050){const fog=ctx.createLinearGradient(0,470,0,720);fog.addColorStop(0,"transparent");fog.addColorStop(1,"#a9c0bd14");ctx.fillStyle=fog;ctx.fillRect(0,430,W,290);ctx.strokeStyle="#d7e6e72a";ctx.lineWidth=1;for(let i=0;i<8;i++){const x=(i*173+gameTime*74)%W,y=615+(i%3)*7;ctx.beginPath();ctx.arc(x,y,7+(i%3)*4,Math.PI*1.08,Math.PI*1.92);ctx.stroke();}}
  ctx.fillStyle="#03070955";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(180,0);ctx.lineTo(135,90);ctx.lineTo(0,135);ctx.fill();ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(W-180,0);ctx.lineTo(W-135,90);ctx.lineTo(W,135);ctx.fill();ctx.restore();
}
function drawLightingV3(){
  const zone=cameraX+W/2,region=sceneRegionAt(zone).id;ctx.save();
  const palettes={
    paperShop:{grade:"#cfb486",alpha:.13},alleyA:{grade:"#89a8b6",alpha:.16},alleyB:{grade:"#7f9eae",alpha:.18},alleyC:{grade:"#7993a3",alpha:.18},bossArena:{grade:"#927a85",alpha:.17},
    opera:{grade:"#9a6d68",alpha:.15},bamboo:{grade:"#789991",alpha:.17},ferry:{grade:"#7096a4",alpha:.18},city:{grade:"#8d8176",alpha:.16},final:{grade:"#987381",alpha:.20}
  };const pal=palettes[region]||palettes.alleyA;
  // One colour grade is applied after actors are drawn, so figures inherit the
  // room's atmosphere instead of looking like separately lit cut-outs.
  ctx.globalCompositeOperation="multiply";ctx.globalAlpha=pal.alpha;ctx.fillStyle=pal.grade;ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation="screen";ctx.globalAlpha=1;
  const warm=(x,y,r=100,a=.22,color="255,201,112")=>{if(x<-r||x>W+r)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${a})`);g.addColorStop(.42,`rgba(${color},${a*.38})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
  if(region==="paperShop"){
    for(const wx of [112,692,1004])warm(wx-cameraX,500,105,.22,"255,203,120");
  }else if(["alleyA","alleyB","alleyC"].includes(region)){
    // Rain alley: practical window/lantern pools only. No universal cinema beam.
    const lights=[1250,1940,2630,3320,4010,4700,5390];for(const wx of lights)warm(wx-cameraX,390,92,.18,"255,191,92");
    ctx.globalAlpha=.055;ctx.fillStyle="#b8d6df";for(let i=0;i<3;i++){const x=((i*430-gameTime*18)%1500)-120;ctx.fillRect(x,150,85,460);}ctx.globalAlpha=1;
  }else if(region==="bossArena"){
    warm(6200-cameraX,300,145,.12,"210,92,68");warm(6810-cameraX,300,145,.12,"210,92,68");
    const g=ctx.createRadialGradient(W*.5,H*.48,80,W*.5,H*.48,470);g.addColorStop(0,"rgba(150,35,42,.09)");g.addColorStop(1,"rgba(150,35,42,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }else if(region==="opera"){
    // Theatre: narrow stage pools and candle warmth from below.
    for(const wx of [7720,8420,9080,9500])warm(wx-cameraX,510,105,.18,"241,157,82");
    ctx.globalAlpha=.08;ctx.fillStyle="#d3a277";for(const wx of [8350,9050]){const x=wx-cameraX;ctx.beginPath();ctx.moveTo(x-24,105);ctx.lineTo(x+24,105);ctx.lineTo(x+95,610);ctx.lineTo(x-95,610);ctx.closePath();ctx.fill();}ctx.globalAlpha=1;
  }else if(region==="bamboo"){
    // Temple: one cold moon shaft plus isolated amber shrine light.
    const x=11380-cameraX;ctx.globalAlpha=.095;ctx.fillStyle="#a5c8c4";ctx.beginPath();ctx.moveTo(x-80,0);ctx.lineTo(x+45,0);ctx.lineTo(x-45,H);ctx.lineTo(x-185,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;warm(10540-cameraX,500,95,.14,"220,170,94");
  }else if(region==="ferry"){
    // Ferry: light comes from the water line; horizontal shimmer replaces beams.
    ctx.globalAlpha=.10;const wg=ctx.createLinearGradient(0,500,0,660);wg.addColorStop(0,"rgba(122,185,196,0)");wg.addColorStop(1,"rgba(122,185,196,.48)");ctx.fillStyle=wg;ctx.fillRect(0,470,W,190);ctx.globalAlpha=.11;ctx.strokeStyle="#b5d6d3";for(let i=0;i<9;i++){const y=565+i*8;ctx.beginPath();ctx.moveTo((i*137+gameTime*18)%280-60,y);ctx.lineTo(W-(i*53%190),y);ctx.stroke();}ctx.globalAlpha=1;warm(12820-cameraX,485,85,.13,"229,177,92");
  }else if(region==="city"){
    // Paper city: low grave/fire light; upper frame stays comparatively dead.
    for(const wx of [14980,15720,16550,17140])warm(wx-cameraX,570,88,.16,"224,145,76");const cg=ctx.createLinearGradient(0,420,0,H);cg.addColorStop(0,"rgba(177,91,64,0)");cg.addColorStop(1,"rgba(177,91,64,.11)");ctx.fillStyle=cg;ctx.fillRect(0,400,W,320);
  }else if(region==="final"){
    // Only the final domain earns the unnatural diagonal/divine light language.
    ctx.globalAlpha=.07;ctx.fillStyle="#d2a0bc";ctx.beginPath();ctx.moveTo(W*.73,0);ctx.lineTo(W*.88,0);ctx.lineTo(W*.57,H);ctx.lineTo(W*.39,H);ctx.closePath();ctx.fill();ctx.globalAlpha=1;const fg=ctx.createRadialGradient(W*.58,H*.47,20,W*.58,H*.47,360);fg.addColorStop(0,"rgba(235,194,155,.12)");fg.addColorStop(1,"rgba(170,92,125,0)");ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);
  }
  if(lampIsFocused()){const lp=lampPose(),px=lp.x-cameraX,py=lp.y;warm(px,py,118,.34,"255,210,122");}
  ctx.restore();
}
function drawCombatOverlayV5(){
  ctx.save();if(player.health<35&&!player.dead){const a=(1-player.health/35)*.27*(.78+Math.sin(gameTime*3.2)*.22),g=ctx.createRadialGradient(W/2,H/2,220,W/2,H/2,720);g.addColorStop(0,"transparent");g.addColorStop(1,`rgba(112,34,26,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalAlpha=a*.75;ctx.strokeStyle="#6f452f";ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.strokeRect(8,8,W-16,H-16);ctx.setLineDash([]);}
  if(world.bossActive&&world.boss?.phase===3){ctx.globalAlpha=.08+.03*Math.sin(gameTime*5);ctx.fillStyle="#9b1e2e";ctx.fillRect(0,0,W,H);}
  if(impactFlash>0){ctx.globalAlpha=impactFlash*2.8;ctx.fillStyle="#fff1cf";ctx.fillRect(0,0,W,H);}ctx.restore();
}
function drawEpilogueVisuals(){
  if(!world.epilogueActive)return;
  ctx.save();ctx.translate(-cameraX,0);
  // Familiar street, altered only by small absences/presences. The umbrella
  // woman is gone; a folded paper boat is left where the player first met her.
  const bx=2360,by=590;ctx.globalAlpha=.92;glow(bx,by-7,30,world.finalChoice==="extinguish"?"#d8c49b":"#e5b96b",.10);
  ctx.fillStyle="#d7ccb5";ctx.strokeStyle="#5b5145";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(bx-17,by);ctx.lineTo(bx,by-13);ctx.lineTo(bx+17,by);ctx.lineTo(bx+7,by+5);ctx.lineTo(bx-8,by+5);ctx.closePath();ctx.fill();ctx.stroke();
  // A few windows answer with ordinary human light rather than supernatural beams.
  for(const wx of [1510,1880,2680]){const sx=wx,wy=430;glow(sx,wy,58,"#efb56b",world.finalChoice==="extinguish"?.08:.13);}
  ctx.restore();
  ctx.save();
  const dawn=ctx.createLinearGradient(0,0,0,H);dawn.addColorStop(0,world.finalChoice==="extinguish"?"rgba(151,143,134,.13)":"rgba(160,166,160,.10)");dawn.addColorStop(.58,"rgba(110,120,116,.035)");dawn.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=dawn;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.055;ctx.fillStyle="#f0dfc1";ctx.fillRect(0,0,W,54);ctx.restore();
}

function drawEndingChoiceOverlay(){
  if(!world.endingChoiceActive)return;
  ctx.save();ctx.fillStyle="rgba(3,6,8,.76)";ctx.fillRect(0,0,W,H);
  const x=W/2-350,y=116,w=700,h=452;ctx.fillStyle="#071014ef";roundedRect(x,y,w,h,12);ctx.fill();ctx.strokeStyle="#8e724f";ctx.lineWidth=1.5;ctx.stroke();
  ctx.textAlign="center";ctx.fillStyle="#e1d4ba";ctx.font="700 28px serif";ctx.fillText("第七盏灯没有给出答案",W/2,y+48);ctx.fillStyle="#aaa79d";ctx.font="13px 'Microsoft YaHei',sans-serif";ctx.fillText("它只把最后的决定交回你手里",W/2,y+76);
  ENDING_CHOICES.forEach((c,i)=>{const cy=y+108+i*94,sel=i===world.endingChoiceIndex;ctx.fillStyle=sel?"rgba(111,80,47,.42)":"rgba(18,25,27,.72)";roundedRect(x+38,cy,w-76,74,8);ctx.fill();ctx.strokeStyle=sel?"#d3a85f":"#4d514c";ctx.lineWidth=sel?2:1;ctx.stroke();ctx.textAlign="left";ctx.fillStyle=sel?"#f0d39a":"#d0c6b3";ctx.font="700 17px 'Microsoft YaHei',sans-serif";ctx.fillText(c.title,x+58,cy+28);ctx.fillStyle="#aaa79d";ctx.font="12px 'Microsoft YaHei',sans-serif";ctx.fillText(c.sub,x+58,cy+52);});
  ctx.textAlign="center";ctx.fillStyle="#918e84";ctx.font="12px 'Microsoft YaHei',sans-serif";ctx.fillText("W / S 或 A / D 选择　·　E 确认　·　Esc 暂不决定",W/2,y+h-24);ctx.restore();
}

function canShowGuidance(){return !player.dead&&guidance.timer>0&&!currentDialogue&&state==="playing";}
function guidanceHudStyle(){return {tone:'paper',fill:'rgba(204,194,160,.91)',stroke:'#765c3e',title:'#842f29',ink:'#41382e',key:'#655948'};}
function drawGuidance(){
  if(!canShowGuidance())return;
  const alpha=clamp(guidance.timer<.38?guidance.timer/.38:1,0,1),style=guidanceHudStyle();
  ctx.save();ctx.globalAlpha=alpha;
  // Tutorial guidance now uses the same aged-paper language as the rest of the HUD.
  const x=28,y=124,w=356,h=52;drawPaperTag(x,y,w,h,style.fill,style.stroke);
  ctx.fillStyle=style.title;ctx.font="700 13px 'Microsoft YaHei',sans-serif";ctx.fillText(guidance.title,x+14,y+20,210);
  if(guidance.key){ctx.fillStyle=style.key;ctx.font="10px 'Microsoft YaHei',sans-serif";ctx.textAlign="right";ctx.fillText(guidance.key,x+w-12,y+19,120);ctx.textAlign="left";}
  ctx.fillStyle=style.ink;ctx.font="11px 'Microsoft YaHei',sans-serif";ctx.fillText(guidance.text,x+14,y+39,w-28);
  ctx.restore();
}
function hudLayout(){
  const lifeW=Math.min(248,Math.max(210,W*.20));
  const objectiveW=Math.min(294,Math.max(250,W*.24));
  const bossW=Math.min(660,Math.max(520,W-80));
  return {
    showNormalHud:!world.epilogueActive&&!world.endingChoiceActive&&state!=="ending"&&!(world.currentRegion==="final"&&world.chapterProgress?.final?.convergenceSolved),
    life:{x:20,y:18,w:lifeW,h:76},
    objective:{x:Math.max(20,W-objectiveW-20),y:18,w:objectiveW,h:86},
    boss:{x:Math.max(24,W*.5-bossW*.5),y:H-54,w:bossW,h:30}
  };
}
function currentObjectiveText(){
  if(["opera","bamboo","ferry","city","final"].includes(world.currentRegion))return world.finalChoice?"尾声：沿雨巷向前":chapterObjective(world.currentRegion);
  return !world.lampAcquired?"靠近引路灯，按 E 唤醒":!world.noteFound?"调查师父留下的烧焦纸条":!world.doorOpen?"前往右侧双扇门，解开封纸":world.firstEncounterStarted&&!world.firstShadowDefeated?(world.lamp.focused?"照住影祟，再用裁魂尺击退它":"举起引路灯，让影祟显形"):world.emberCount<3?"探索雨巷，收集三缕灯芯火":world.bossActive&&world.boss?.voiceTrial?"灯妖进入虚相：举灯辨认三张嘴":!world.bossDefeated?"穿过封桥，夺回第一盏引魂灯":"继续追寻其余引魂灯";
}
function drawPaperTag(x,y,w,h,fill="#d8c58d",stroke="#6d5437"){
  ctx.save();ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x+5,y);ctx.lineTo(x+w-7,y+2);ctx.lineTo(x+w,y+8);ctx.lineTo(x+w-3,y+h-5);ctx.lineTo(x+8,y+h);ctx.lineTo(x,y+h-7);ctx.lineTo(x+2,y+5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function lifeHudPortraitKey(){return "portraitAyan";}
function hudLampStatus(){
  return {mode:world.lampAcquired?(world.lamp.focused?"举灯":"收灯"):"未唤醒",recovered:Math.min(6,world.lanternsRecovered||0),total:6};
}
function drawLifeLanternHUD(){
  const l=hudLayout().life,ps=paperBodyState(),ratio=ps.ratio;
  ctx.save();
  drawPaperTag(l.x,l.y,l.w,l.h,"rgba(222,207,164,.90)",ps.critical?"#7e2f28":"#766044");
  // Ayan remains visually tied to the life display; the lantern describes his paper body's state.
  drawSpriteAsset(lifeHudPortraitKey(),l.x+30,l.y+l.h-6,48,false,.94);
  const lx=l.x+68,ly=l.y+39;
  const glowA=.12+.28*ratio;glow(lx,ly,23,"#ffc866",glowA);
  ctx.fillStyle="#4a3024";ctx.fillRect(lx-8,ly-15,16,4);ctx.fillRect(lx-6,ly+14,12,3);
  ctx.fillStyle=ps.critical?"#7b3d32":"#c95638";ctx.beginPath();ctx.moveTo(lx-11,ly-11);ctx.quadraticCurveTo(lx,ly-17,lx+11,ly-11);ctx.lineTo(lx+9,ly+12);ctx.quadraticCurveTo(lx,ly+17,lx-9,ly+12);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.28+.72*ratio;ctx.fillStyle="#ffd977";ctx.beginPath();ctx.ellipse(lx,ly,4+2*ratio,8+5*ratio,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  const tx=l.x+92,barW=Math.max(86,l.w-106);
  ctx.fillStyle="#3b3027";ctx.font="700 13px 'Microsoft YaHei',sans-serif";ctx.fillText("命灯",tx,l.y+23);
  ctx.fillStyle="#8f3029";ctx.fillRect(tx,l.y+34,barW*ratio,5);ctx.strokeStyle="#6f5843";ctx.strokeRect(tx,l.y+34,barW,5);
  ctx.fillStyle="#655748";ctx.font="11px 'Microsoft YaHei',sans-serif";ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}`,tx,l.y+56);
  ctx.textAlign="right";ctx.fillText(hudLampStatus().mode,l.x+l.w-12,l.y+56);ctx.textAlign="left";
  if(ps.fragile){ctx.strokeStyle=`rgba(92,44,32,${.22+.45*ps.edgeBurn})`;ctx.lineWidth=1.4;for(let i=0;i<5;i++){const yy=l.y+10+i*12;ctx.beginPath();ctx.moveTo(l.x+4,yy);ctx.lineTo(l.x+9+ps.edgeBurn*7,yy+5);ctx.stroke();}}
  ctx.restore();
}
function drawObjectiveTalismanHUD(objective){
  const o=hudLayout().objective,status=hudLampStatus();ctx.save();
  // Temporary tutorials take visual priority; the persistent objective remains present but subdued.
  if(canShowGuidance())ctx.globalAlpha=.60;
  drawPaperTag(o.x,o.y,o.w,o.h,"rgba(210,190,127,.90)","#73583a");
  ctx.fillStyle="#8d3029";ctx.fillRect(o.x+12,o.y+10,4,o.h-20);
  ctx.fillStyle="#3a3028";ctx.font="700 12px 'Microsoft YaHei',sans-serif";ctx.fillText("今夜所向",o.x+27,o.y+22);
  ctx.fillStyle="#665544";ctx.font="9px 'Microsoft YaHei',sans-serif";ctx.textAlign="right";ctx.fillText(`${status.mode} · 引魂 ${status.recovered}/${status.total}`,o.x+o.w-22,o.y+22);ctx.textAlign="left";
  // Six restrained lamp dots make recovery progress readable without a second black status panel.
  for(let i=0;i<status.total;i++){const px=o.x+o.w-76+i*9,py=o.y+32;if(i<status.recovered)glow(px,py,7,"#ffc85e",.15);ctx.fillStyle=i<status.recovered?"#b44a31":"#89775d";ctx.beginPath();ctx.arc(px,py,2.3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#54483b";ctx.font="11px 'Microsoft YaHei',sans-serif";const text=String(objective||"继续探索"),max=o.w-40;
  let line="",y=o.y+49;for(const ch of text){const next=line+ch;if(ctx.measureText(next).width>max&&line){ctx.fillText(line,o.x+27,y);line=ch;y+=16;if(y>o.y+o.h-7)break;}else line=next;}if(line&&y<=o.y+o.h-7)ctx.fillText(line,o.x+27,y);
  ctx.restore();
}
function drawBossSealHUD(){
  if(!world.bossActive||!world.boss)return;const b=world.boss,l=hudLayout().boss,ratio=clamp((b.uiHp??b.hp)/b.maxHp,0,1);
  ctx.save();drawPaperTag(l.x,l.y,l.w,l.h,"rgba(218,205,170,.92)",b.voiceTrial?"#5b6d70":"#74332d");
  ctx.strokeStyle=b.voiceTrial?"#667b7e":"#9b342c";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(l.x+10,l.y+l.h*.62);ctx.lineTo(l.x+10+(l.w-20)*ratio,l.y+l.h*.62);ctx.stroke();
  ctx.fillStyle=b.voiceTrial?"#4d6164":"#5b302c";ctx.textAlign="center";ctx.font="700 13px serif";ctx.fillText(`百口灯妖${b.voiceTrial?" · 虚相":""}`,l.x+l.w*.5,l.y+13);ctx.textAlign="left";ctx.restore();
}
function interactionListWindow(maxItems=3){
  const list=player.interactCandidates||[],current=clamp(player.interactIndex||0,0,Math.max(0,list.length-1));
  if(list.length<=maxItems)return {items:list.slice(),localIndex:current,start:0};
  const half=Math.floor(maxItems/2),start=clamp(current-half,0,list.length-maxItems);
  return {items:list.slice(start,start+maxItems),localIndex:current-start,start};
}
function canShowInteractionPrompt(){return !player.dead&&!currentDialogue&&!!player.interactTarget;}
function drawInteractionPaperPrompt(target){
  if(!target||!canShowInteractionPrompt())return;const list=player.interactCandidates||[];
  // Single targets already carry an in-world E paper marker above the object.
  // Keep the bottom paper strip only when several nearby targets need selection.
  if(list.length<=1)return;
  const windowed=interactionListWindow(3),visible=windowed.items,current=windowed.localIndex,w=Math.min(430,W*.48),h=34,x=W*.5-w*.5,y=H-74;ctx.save();drawPaperTag(x,y,w,h,"rgba(213,199,159,.94)","#6d5741");ctx.font="700 11px 'Microsoft YaHei',sans-serif";ctx.textAlign="center";
  const parts=visible.map((t,i)=>`${i===current?'E':'↑↓'} ${interactionLabel(t)}`);ctx.fillStyle="#4b4034";ctx.fillText(parts.join('    '),W*.5,y+22);ctx.textAlign="left";ctx.restore();
}
function drawUIV2(){
  if(state==="menu")return;
  if(state==="ending"&&!currentDialogue){ctx.save();ctx.fillStyle="#060809f4";ctx.fillRect(0,0,W,H);glow(W/2,H/2-30,170,world.finalChoice==="extinguish"?"#8d8174":"#ad3b32",.16);ctx.fillStyle="#ded0b6";ctx.textAlign="center";ctx.font="68px serif";ctx.fillText("第七盏灯",W/2,H/2-50);ctx.font="21px serif";ctx.fillStyle="#bd9a62";ctx.fillText(endingSubtitle(),W/2,H/2+4);ctx.font="13px 'Microsoft YaHei',sans-serif";ctx.fillStyle="#aaa69c";ctx.fillText(endingFinalLine(),W/2,H/2+42);ctx.font="12px 'Microsoft YaHei',sans-serif";ctx.fillStyle="#777b78";ctx.fillText("按 E 返回标题",W/2,H/2+88);ctx.restore();return;}
  if(world.epilogueActive){ctx.save();if(world.epilogueBeat===0&&!currentDialogue){ctx.globalAlpha=.72;ctx.fillStyle="#d4c8b1";ctx.font="12px 'Microsoft YaHei',sans-serif";ctx.textAlign="center";ctx.fillText("沿雨巷向前走",W/2,52);}ctx.restore();return;}
  if(world.endingChoiceActive){drawEndingChoiceOverlay();return;}
  if(world.currentRegion==="final"&&world.chapterProgress?.final?.convergenceSolved){drawGuidance();return;}
  if(!hudLayout().showNormalHud)return;
  ctx.save();drawLifeLanternHUD();drawObjectiveTalismanHUD(currentObjectiveText());drawInteractionPaperPrompt(player.interactTarget);drawBossSealHUD();
  if(!world.noteFound&&player.x>760&&player.x<1030&&!currentDialogue){ctx.fillStyle="#cda960";ctx.font="700 12px 'Microsoft YaHei',sans-serif";ctx.textAlign="center";ctx.fillText("← 红光来自师父留下的纸条",W/2,H-112);ctx.textAlign="left";}
  if(player.dead){const t=player.deathVisualTimer||0,dim=player.deathPhase==='gather'?clamp((t-.9)/.45,0,.58):clamp(t/.35,0,.18);ctx.fillStyle=`rgba(4,7,8,${dim})`;ctx.fillRect(0,0,W,H);const cpX=player.checkpointX-cameraX,cpY=player.checkpointY+player.h*.35;glow(cpX,cpY,42+Math.sin(gameTime*9)*5,"#ffc968",player.deathPhase==='gather'?.34:.12);if(player.deathPhase==='gather'&&t>1.05){ctx.globalAlpha=clamp((t-1.05)/.22,0,1);ctx.fillStyle="#d9cdb7";ctx.textAlign="center";ctx.font="34px serif";ctx.fillText("灯火暂熄",W/2,H/2-4);ctx.font="13px sans-serif";ctx.fillStyle="#a29f96";ctx.fillText("纸身循灯而归",W/2,H/2+26);ctx.textAlign="left";ctx.globalAlpha=1;}}
  ctx.restore();drawGuidance();
}

function drawFullGameProgressionProps(){
  if(!world.finalReady||world.finalChoice)return;
  const x=19320-cameraX;if(x<-120||x>W+120)return;
  glow(x,470,110,"#ffd06a",.28);
  if(!drawSpriteAsset("seventhLantern",x,565,120,false,.96)){
    ctx.save();ctx.fillStyle="#d7aa52";ctx.fillRect(x-13,485,26,80);ctx.restore();
  }
}

function drawAssetQAOverlay(){
  if(!ASSET_QA_MODE)return;
  const st=window.ProductionAssets?.getStatus?.()||{loaded:0,total:0,failed:0,missing:[]};
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle="rgba(4,8,10,.88)";ctx.fillRect(18,18,440,118);
  ctx.strokeStyle=st.failed?"#c94f43":"#7ca58d";ctx.strokeRect(18.5,18.5,439,117);
  ctx.fillStyle="#e4d6ba";ctx.font="700 16px monospace";ctx.fillText("ASSET QA MODE",32,43);
  ctx.font="13px monospace";ctx.fillStyle="#bfc8c3";ctx.fillText(`production ${st.loaded}/${st.total}  failed ${st.failed}`,32,66);
  ctx.fillText(`region ${world.currentRegion}  colliders ${DEBUG_COLLIDERS?"ON":"OFF"}`,32,88);
  const miss=(st.missing||[]).slice(0,3).join(", ")||"none";ctx.fillText(`missing: ${miss}`,32,110);
  ctx.restore();
}

function render(){
  const simulationState=applyRenderInterpolation();
  ctx.save();const jitter=shake*.46;ctx.translate((jitter>0?rand(-jitter,jitter):0)+cameraKickX,(jitter>0?rand(-jitter,jitter):0)+cameraKickY);
  ctx.save();ctx.filter="saturate(0.80) brightness(0.90)";
  const activeRegion=sceneRegionAt(cameraX+W*.5);
  const useProductionScene=productionRegionId(activeRegion.id)&&window.ProductionAssets?.drawScene;
  if(useProductionScene){
    // Paint the legacy authored regions as a base, then draw every production
    // panorama intersecting the camera. This keeps chapter boundaries visible
    // on both sides of the screen instead of exposing a black half-screen.
    drawBackgroundV2();
    window.ProductionAssets.drawWorld(ctx,SCENE_REGIONS,cameraX,W,H,gameTime);
    drawPropsV2();
  }else{
    drawBackgroundV2();
    window.ProductionAssets?.drawWorld?.(ctx,SCENE_REGIONS,cameraX,W,H,gameTime);
    drawArchitectureV2();drawOfficialEnvironment();drawPropsV2();drawEnvironmentalDetailsV3();
  }
  // Collision geometry must NEVER depend on which background renderer is active.
  // The old branch skipped platform visuals in production panorama regions, so
  // the collider remained while the roof/lift/balcony art vanished: players
  // literally appeared to stand on air. Render every standable surface here.
  drawPlatformsV2();
  ctx.restore();
  // Background-only vignette: keep combat silhouettes and hit effects clean.
  ctx.save();const bgVig=ctx.createRadialGradient(W/2,H/2,250,W/2,H/2,760);bgVig.addColorStop(0,"rgba(0,0,0,0)");bgVig.addColorStop(1,"rgba(2,4,6,.15)");ctx.fillStyle=bgVig;ctx.fillRect(0,0,W,H);ctx.restore();
  drawChapterGameplay();drawFullGameProgressionProps();drawEntityShadowsV2();
  if(!world.epilogueActive)for(const e of world.enemies)drawEnemyV2(e);drawBossV2();drawProjectilesV2();drawCombatReleaseBeat();
  drawPlayerV2();drawPaperDeathFx();drawParticlesV2();drawOfficialSpriteFx();drawFloatersV5();drawRegionAmbienceV4();drawLightingV3();drawLampBeam();drawForegroundV2();drawForegroundOcclusion();drawInteractionWorldMarker();drawEpilogueVisuals();if(window.Motion)window.Motion.drawWorldOverlay();ctx.restore();
  const vig=ctx.createRadialGradient(W/2,H/2,160,W/2,H/2,700);vig.addColorStop(0,"transparent");vig.addColorStop(1,world.bossActive&&world.boss&&(world.boss.pendingPhase||world.boss.phase)>=2?"#02030438":"#02030422");ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.035;ctx.fillStyle="#e8ddc8";for(let i=0;i<220;i++){const x=(i*83)%W,y=(i*149)%H;ctx.fillRect(x,y,1+(i%3),1);}ctx.globalAlpha=1;drawImpactSpotV4();drawCombatOverlayV5();drawClueReactionOverlay();drawObjectiveWhisperV4();
  drawUIV2();drawAssetQAOverlay();
  restoreSimulationState(simulationState);
}

function loop(now){
  const frameDt=Math.min(.10,Math.max(0,(now-lastTime)/1000));lastTime=now;
  fixedAccumulator=Math.min(fixedAccumulator+frameDt,FIXED_DT*MAX_FIXED_STEPS);
  let steps=0;
  while(fixedAccumulator>=FIXED_DT&&steps<MAX_FIXED_STEPS){
    snapshotRenderState();
    update(FIXED_DT);fixedAccumulator-=FIXED_DT;steps++;
  }
  renderAlpha=clamp(fixedAccumulator/FIXED_DT,0,1);
  render();requestAnimationFrame(loop);
}

window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();if(["a","d","w","s","j","k","l","q","e","escape","arrowup","arrowdown"].includes(k))e.preventDefault();
  if(!keys[k])pressed.add(k);keys[k]=true;
  if(k==="l"&&!lHoldStart)lHoldStart=performance.now();
  if(k==="e"&&currentDialogue){nextDialogue();pressed.delete("e");}
  else if(k==="e"&&state==="ending"){clearTransientInputState();state="menu";window.AudioManager?.stopEnvironment?.();sound.started=false;sound.ambienceRegion="";showPanel(menu);currentDialogue=null;dialogueEl.classList.remove("visible");}
});
window.addEventListener("keyup",e=>{const k=e.key.toLowerCase();keys[k]=false;released.add(k);if(k==="l"){lReleasedDuration=performance.now()-lHoldStart;lHoldStart=0;}});
window.addEventListener("blur",()=>{if(state==="playing"){saveForSuspend();clearTransientInputState();state="paused";showPanel(pausePanel);}else clearTransientInputState();});

document.getElementById("startBtn").onclick=()=>{showPanel(difficultyPanel);};
continueBtn.onclick=()=>ensureAssetsThenStart("normal",true);
document.getElementById("helpBtn").onclick=()=>showPanel(helpPanel);
document.getElementById("helpClose").onclick=()=>showPanel(menu);
document.getElementById("backBtn").onclick=()=>showPanel(menu);
document.querySelectorAll("[data-difficulty]").forEach(b=>b.onclick=()=>ensureAssetsThenStart(b.dataset.difficulty));
document.getElementById("resumeBtn").onclick=()=>{clearTransientInputState();hidePanels();state="playing";lastTime=performance.now();fixedAccumulator=0;};
document.getElementById("restartBtn").onclick=()=>{hidePanels();state="playing";respawn();};
document.getElementById("quitBtn").onclick=()=>{if(world&&player&&!player.dead)saveGame({resumeRegion:world.currentRegion});clearTransientInputState();state="menu";window.AudioManager?.stopEnvironment?.();sound.started=false;sound.ambienceRegion="";showPanel(menu);};
document.getElementById("fullscreen").onclick=()=>{if(!document.fullscreenElement)document.getElementById("app").requestFullscreen?.();else document.exitFullscreen?.();};

try{if(loadBestSave())continueBtn.classList.remove("hidden");}catch(_e){}
function clearTransientInputState(){
  pressed.clear();released.clear();
  for(const k of Object.keys(keys))keys[k]=false;
  jHoldStart=0;lHoldStart=0;lReleasedDuration=0;
  if(player){player.charging=false;player.chargeLevel=0;player.chargeCue=0;player.attackBuffer=0;player.attackBufferHeld=0;}
}
function saveForSuspend(){
  if((state==="playing"||state==="paused")&&world&&player&&!player.dead&&!world.epilogueActive&&state!=="ending"){
    saveGame({resumeRegion:world.currentRegion});
    return true;
  }
  return false;
}
document.addEventListener("visibilitychange",()=>{if(document.hidden){saveForSuspend();clearTransientInputState();}});
window.addEventListener("pagehide",()=>{saveForSuspend();clearTransientInputState();});
window.addEventListener("resize",resizeGameViewport);
resizeGameViewport();
buildWorld();resetPlayer();requestAnimationFrame(loop);

// Expose a minimal diagnostic surface for automated smoke tests.
window.__GAME__={animationRevision:'v1.1-preview6',getState:()=>({state,difficulty,dialogue:currentDialogue?.text||null,guidance:{title:guidance.title,timer:guidance.timer},camera:{x:cameraX},render:{alpha:renderAlpha,interpolated:getInterpolatedRenderState()},player:{x:player.x,y:player.y,groundY:player.groundY,health:player.health,paperBody:paperBodyState(),paperHurtFlash:player.paperHurtFlash||0,weapon:player.weapon?.type||null,lampHeld:player.lampHeld,grounded:player.grounded,dodging:player.dodging,guarding:player.guarding,attacking:!!player.attack,attackCharged:!!player.attack?.charged,attackKind:player.attack?.kind||null,attackStep:player.attack?.step||0,lampOrigin:lampPose(),checkpointX:player.checkpointX,checkpointY:player.checkpointY,dead:player.dead,deathPhase:player.deathPhase,deathVisualTimer:player.deathVisualTimer,interact:player.interactTarget?.kind||null,interactId:player.interactTarget?.obj?.id||null,interactCandidates:(player.interactCandidates||[]).map(t=>interactionTargetId(t)),interactIndex:player.interactIndex||0,hurtbox:getPlayerHurtbox(),hurtTimer:player.hurtTimer||0},world:{embers:world.emberCount,doorOpen:world.doorOpen,gateOpen:world.gateOpen,wallHp:world.wallHp,puzzleStep:world.puzzleStep,bossActive:world.bossActive,bossDefeated:world.bossDefeated,currentRegion:world.currentRegion,lanternsRecovered:world.lanternsRecovered,finalReady:world.finalReady,finalChoice:world.finalChoice,endingChoiceActive:world.endingChoiceActive,endingChoiceIndex:world.endingChoiceIndex,epilogueActive:world.epilogueActive,epilogueBeat:world.epilogueBeat,epilogueComplete:world.epilogueComplete,chapterProgress:JSON.parse(JSON.stringify(world.chapterProgress)),tutorialFlags:{...world.tutorialFlags},storyApparitions:Object.keys(world.storyRuntime?.active||{}),ritualBladeUnlocked:world.ritualBladeUnlocked,bossHp:world.boss?Math.max(0,Math.round(world.boss.hp)):null,bossPhase:world.boss?.phase||null,bossPendingPhase:world.boss?.pendingPhase||null,bossTransition:world.boss?.phaseTransition||0,bossLastAttack:world.boss?.lastAttackId||null,particles:world.particles.length,projectiles:world.projectiles.length,lanternStable:world.lamp.stable,firstEncounterStarted:world.firstEncounterStarted,firstShadowDefeated:world.firstShadowDefeated,enemiesAlive:world.enemies.filter(e=>e.alive).length,drops:world.drops.map(d=>({type:d.type,x:Math.round(d.x),y:Math.round(d.y)})),nearEnemies:world.enemies.filter(e=>e.alive&&!e.inactive&&Math.abs(e.x-player.x)<180).map(e=>({type:e.type,hp:Math.round(e.hp),x:Math.round(e.x),y:Math.round(e.y),groundY:e.groundY,aiState:e.aiState,exposed:e.exposed})),enemies:world.enemies.filter(e=>e.alive).map(e=>({id:e.id,type:e.type,x:Math.round(e.x),y:Math.round(e.y),groundY:e.groundY,grounded:e.grounded,aiState:e.aiState,stuckTimer:e.stuckTimer||0}))},errors:window.__GAME_ERRORS__||[]}),start:startGame,teleport:(x,y=480)=>{player.x=x;player.y=y;player.vx=player.vy=0;const g=getPrimaryGroundAt(player.x+player.w*.5);if(g){player.y=g.y-player.h;player.grounded=true;}},damage:damagePlayer};
window.__GAME_ERRORS__=[];
window.__ASSET_STATUS__=()=>({loaded:artLoaded,total:Object.keys(artFiles).length,missing:missingRequiredAssets(),ready:requiredAssetsReady(),official:Object.values(artFiles).filter(src=>src.includes("assets/SeventhLantern/")).length});
window.addEventListener("error",e=>window.__GAME_ERRORS__.push(String(e.error||e.message)));

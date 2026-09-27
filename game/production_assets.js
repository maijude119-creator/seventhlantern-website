"use strict";
(() => {
  const files = {
    // Authored continuous world panoramas. These are one long background per
    // region, not screen-sized cards and not repeating tile strips.
    // Original scene painting rebuilt from the project's opera-house language.
    // The mood references are not shipped or drawn by the game.
    bgOpera:"assets/Production/Backgrounds/BG_opera_world_v2.png",
    bgBamboo:"assets/Production/Backgrounds/BG_bamboo_world_v2.png",
    bgFerry:"assets/Production/Backgrounds/BG_ferry_world_v2.png",
    bgCity:"assets/Production/Backgrounds/BG_city_world_v2.png",
    bgFinal:"assets/Production/Backgrounds/BG_final_world_v2.png",
    // Paper shop
    shopAwning:"assets/Production/Environment/PaperShop/ENV_PaperShop_Awning.png",
    shopWall:"assets/Production/Environment/PaperShop/ENV_PaperShop_WallBlockA.png",
    shopGroundA:"assets/Production/Environment/PaperShop/ENV_PaperShop_GroundSetA.png",
    shopGroundB:"assets/Production/Environment/PaperShop/ENV_PaperShop_GroundSetB.png",
    shopWood:"assets/Production/Environment/PaperShop/ENV_PaperShop_WoodSupportA.png",
    shopCrate:"assets/Production/Environment/PaperShop/ENV_PaperShop_WoodCrateA.png",
    // Rain alley
    rainGround:"assets/Production/Environment/RainAlley/ENV_RainAlley_WetGroundSet.png",
    rainWall:"assets/Production/Environment/RainAlley/ENV_RainAlley_MossWallA.png",
    rainWindowA:"assets/Production/Environment/RainAlley/ENV_RainAlley_HouseWindowA.png",
    rainWindowB:"assets/Production/Environment/RainAlley/ENV_RainAlley_HouseWindowB.png",
    rainDoor:"assets/Production/Environment/RainAlley/ENV_RainAlley_HouseDoorA.png",
    rainFence:"assets/Production/Environment/RainAlley/ENV_RainAlley_FenceA.png",
    rainLanternPost:"assets/Production/Environment/RainAlley/ENV_RainAlley_LanternPostA.png",
    rainAwning:"assets/Production/Environment/RainAlley/ENV_RainAlley_AwningLarge.png",
    rainArch:"assets/Production/Environment/RainAlley/ENV_RainAlley_LitArchA.png",
    rainStair:"assets/Production/Environment/RainAlley/ENV_RainAlley_StairSet.png",
    rainBrickPileA:"assets/Production/Environment/RainAlley/ENV_RainAlley_BrickPileA.png",
    rainBrickPileB:"assets/Production/Environment/RainAlley/ENV_RainAlley_BrickPileB.png",
    rainBrickPileC:"assets/Production/Environment/RainAlley/ENV_RainAlley_BrickPileC.png",
    rainFencePlatform:"assets/Production/Environment/RainAlley/ENV_RainAlley_FencePlatform.png",
    rainStairWallA:"assets/Production/Environment/RainAlley/ENV_RainAlley_StairWallA.png",
    rainStairWallB:"assets/Production/Environment/RainAlley/ENV_RainAlley_StairWallB.png",
    rainRoofSupport:"assets/Production/Environment/RainAlley/ENV_RainAlley_RoofSupportA.png",
    rainRoofCorner:"assets/Production/Environment/RainAlley/ENV_RainAlley_RoofCorner.png",
    rainWetWall:"assets/Production/Environment/RainAlley/ENV_RainAlley_WetWallB.png",
    gameplayRainRoofCap:"assets/Production/Environment/GameplayIntegration/ENV_Gameplay_RainRoofCap.png",
    gameplayOperaPlatform:"assets/Production/Environment/GameplayIntegration/ENV_Gameplay_OperaPlatform.png",
    gameplayOperaRail:"assets/Production/Environment/GameplayIntegration/ENV_Gameplay_OperaRail.png",
    // Opera house
    operaFloorA:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_StagePlatformA.png",
    operaFloorB:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_StagePlatformB.png",
    operaPillar:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_PillarLampA.png",
    operaBeam:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_BeamB.png",
    operaStairA:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_StairsA.png",
    operaStairB:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_StairsB.png",
    operaCurtain:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_MaskCurtainA.png",
    operaCurtainSet:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_CurtainSetA.png",
    operaMasks:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_MaskRackA.png",
    operaGong:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_GongRigA.png",
    operaDrum:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_DrumA.png",
    operaTrap:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_TrapdoorA.png",
    operaPlatformSmall:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_StagePlatformSmall.png",
    operaRail:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_RailSetA.png",
    operaShrine:"assets/Production/Environment/OperaHouse/ENV_OperaHouse_MaskShrineA.png",
    // Bamboo temple
    bambooRoof:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_RoofA.png",
    bambooTemple:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_TempleSetA.png",
    bambooBellTower:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_BellTowerA.png",
    bambooRig:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_BambooScaffoldA.png",
    bambooLadder:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_BambooLadderA.png",
    bambooHead:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_BuddhaHeadA.png",
    bambooShrine:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_TempleShrineA.png",
    bambooPlatformA:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_StonePlatformA.png",
    bambooPlatformB:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_StonePlatformB.png",
    bambooSpireA:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_StoneSpireA.png",
    bambooSpireB:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_StoneSpireB.png",
    bambooBell:"assets/Production/Environment/BambooTemple/ENV_BambooTemple_BellA.png",
    // Reverse ferry
    ferryDockA:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_DockA.png",
    ferryDockB:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_DockB.png",
    ferryDockC:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_DockC.png",
    ferryRopeDock:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_RopeDockA.png",
    ferryLamp:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_LanternPostPairA.png",
    ferryBoat:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_BoatLargeA.png",
    ferryBoatLong:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_BoatLongA.png",
    ferryWall:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_StoneWallA.png",
    ferryBridge:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_BridgeA.png",
    ferryPier:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_PierA.png",
    ferryCrates:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_CratesA.png",
    ferryCrateStack:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_CrateStackA.png",
    ferryCrateRubble:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_CrateRubbleA.png",
    ferryWater:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_WaterSetA.png",
    ferryReed:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_ReedA.png",
    ferryRock:"assets/Production/Environment/ReverseFerry/ENV_ReverseFerry_RockMossA.png",
    // Paper city
    cityGate:"assets/Production/Environment/PaperCity/ENV_PaperCity_GateA.png",
    cityRuneGate:"assets/Production/Environment/PaperCity/ENV_PaperCity_GateRuneA.png",
    cityHouseA:"assets/Production/Environment/PaperCity/ENV_PaperCity_WallHouseA.png",
    cityHouseB:"assets/Production/Environment/PaperCity/ENV_PaperCity_WallHouseB.png",
    cityWindow:"assets/Production/Environment/PaperCity/ENV_PaperCity_WallWindowA.png",
    cityDoor:"assets/Production/Environment/PaperCity/ENV_PaperCity_WallDoorA.png",
    cityArch:"assets/Production/Environment/PaperCity/ENV_PaperCity_ArchDoorA.png",
    cityRoundDoor:"assets/Production/Environment/PaperCity/ENV_PaperCity_RoundDoorA.png",
    cityBridge:"assets/Production/Environment/PaperCity/ENV_PaperCity_StairBridgeA.png",
    cityStairs:"assets/Production/Environment/PaperCity/ENV_PaperCity_StairsA.png",
    cityWallBroken:"assets/Production/Environment/PaperCity/ENV_PaperCity_WallBrokenA.png",
    cityDebris:"assets/Production/Environment/PaperCity/ENV_PaperCity_DebrisSetA.png",
    cityLantern:"assets/Production/Environment/PaperCity/ENV_PaperCity_LanternA.png",
    cityRitualGate:"assets/Production/Environment/PaperCity/ENV_PaperCity_RitualGateA.png",
    cityLampPair:"assets/Production/Environment/PaperCity/ENV_PaperCity_LanternPairA.png",
    cityAltar:"assets/Production/Environment/PaperCity/ENV_PaperCity_AltarA.png",
    cityTower:"assets/Production/Environment/PaperCity/ENV_PaperCity_TowerPillarsA.png",
    cityFinalGate:"assets/Production/Environment/PaperCity/ENV_PaperCity_FinalGateA.png",
    cityFinalAltar:"assets/Production/Environment/PaperCity/ENV_PaperCity_FinalAltarSetA.png",
    // Final arena
    arenaCircle:"assets/Production/Environment/FinalArena/ENV_FinalArena_ArenaCircle.png",
    arenaArcA:"assets/Production/Environment/FinalArena/ENV_FinalArena_ArenaArcA.png",
    arenaArcB:"assets/Production/Environment/FinalArena/ENV_FinalArena_ArenaArcB.png",
    arenaPillar:"assets/Production/Environment/FinalArena/ENV_FinalArena_ArenaPillarA.png",
    arenaStructure:"assets/Production/Environment/FinalArena/ENV_FinalArena_ArenaStructureA.png",
    // 2026-09-17 curated supplemental production imports. Only visually QA'd
    // isolated crops are registered here; source sheets and reference-only NPC/elite
    // boards are deliberately excluded from runtime.
    impInnCounter:"assets/Imported_20260917/APPROVED/Inn/ENV_Inn_Counter.png",
    impInnShelf:"assets/Imported_20260917/APPROVED/Inn/ENV_Inn_ShelfA.png",
    impInnScreen:"assets/Imported_20260917/APPROVED/Inn/ENV_Inn_ScreenA.png",
    impCourtyardLantern:"assets/Imported_20260917/APPROVED/Courtyard/ENV_Courtyard_StoneLantern.png",
    impCourtyardBridge:"assets/Imported_20260917/APPROVED/Courtyard/ENV_Courtyard_StoneBridge.png",
    impSewerDrain:"assets/Imported_20260917/APPROVED/Sewer/ENV_Sewer_RoundDrainWater.png",
    impSewerSplash:"assets/Imported_20260917/APPROVED/Sewer/ENV_Sewer_RainSplash.png",
    impClockBellFrame:"assets/Imported_20260917/APPROVED/Clocktower/ENV_Clocktower_BellFrame.png",
    impClockBellBeam:"assets/Imported_20260917/APPROVED/Clocktower/ENV_Clocktower_BellBeam.png",
    impClockLanternBeam:"assets/Imported_20260917/APPROVED/Clocktower/ENV_Clocktower_LanternBeam.png",
    impClockLadder:"assets/Imported_20260917/APPROVED/Clocktower/ENV_Clocktower_LadderA.png",
    impBambooFence:"assets/Imported_20260917/APPROVED/BambooShrine/ENV_BambooShrine_BambooFenceA.png",
    impBambooLanternTall:"assets/Imported_20260917/APPROVED/BambooShrine/ENV_BambooShrine_StoneLanternTall.png",
    impBambooLanternHang:"assets/Imported_20260917/APPROVED/BambooShrine/ENV_BambooShrine_HangingLantern.png",
    impBambooRock:"assets/Imported_20260917/APPROVED/BambooShrine/ENV_BambooShrine_RockPlatformA.png",
    impGraveGate:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_GateLarge.png",
    impGraveFence:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_FencePanel.png",
    impGraveLantern:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_PagodaLantern.png",
    impGraveShrine:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_ShrineOfferingSet.png",
    impGraveMarker:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_StoneMarkerLantern.png",
    impGravePlaque:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_HangingPlaque.png",
    impGraveIncense:"assets/Imported_20260917/APPROVED/Graveyard/ENV_Graveyard_IncenseOfferingSet.png",
    impPuzzleMirror:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_MirrorDormant.png",
    impPuzzleMirrorLitA:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_MirrorLitA.png",
    impPuzzleMirrorLitB:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_MirrorLitB.png",
    impPuzzleBeamMirror:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_BeamMirror.png",
    impPuzzleSeal:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_SealPillarLit.png",
    impPuzzleSealA:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_SealPillarA.png",
    impPuzzleCrystal:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_CrystalLit.png",
    impPuzzleCrystalA:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_CrystalA.png",
    impPuzzleDial:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_DialFull.png",
    impPuzzleDialA:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_DialA.png",
    impPuzzleDialB:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_DialB.png",
    impPuzzleDialC:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_DialC.png",
    impPuzzleDialD:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_DialD.png",
    impPuzzleBasin:"assets/Imported_20260917/APPROVED/Puzzles/INT_Puzzle_RitualBasin.png",
    impMechanismLift:"assets/Imported_20260917/APPROVED/Mechanisms/INT_Mechanism_LiftPlatform.png",
    impMechanismWinch:"assets/Imported_20260917/APPROVED/Mechanisms/INT_Mechanism_WinchLarge.png",
    npcShenPo:"assets/SeventhLantern/Characters/NPC/ShenPo/CHR_ShenPo_Idle.png",
    npcShenPoWalk:"assets/SeventhLantern/Characters/NPC/ShenPo/CHR_ShenPo_Walk.png",
    npcShenPoInteract:"assets/SeventhLantern/Characters/NPC/ShenPo/CHR_ShenPo_Interact.png",
    npcShenPoReaction:"assets/SeventhLantern/Characters/NPC/ShenPo/CHR_ShenPo_Interact.png", // torso-only reaction crop disabled; full-body interact pose is the safe reaction
    npcNameless:"assets/SeventhLantern/Characters/NPC/Nameless/CHR_Nameless_RaiseLantern.png", // incomplete idle/walk crops disabled; full-body raise-lantern pose is the grounded base
    npcNamelessWalk:"assets/SeventhLantern/Characters/NPC/Nameless/CHR_Nameless_Walk.png",
    npcNamelessRaise:"assets/SeventhLantern/Characters/NPC/Nameless/CHR_Nameless_RaiseLantern.png",
    npcNamelessFade:"assets/SeventhLantern/Characters/NPC/Nameless/CHR_Nameless_Fade.png",
    npcUmbrellaIdle:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Idle.png",
    npcUmbrellaWalk:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Walk.png",
    npcUmbrellaTalk:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Talk.png",
    npcUmbrellaPoint:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Point.png",
    npcUmbrellaBack:"assets/SeventhLantern/Characters/NPC/UmbrellaGuest/CHR_UmbrellaGuest_Back.png",
    npcOperaSingerIdle:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Idle.png",
    npcOperaSingerFan:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Fan.png",
    npcOperaSingerPoint:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Point.png",
    npcOperaSingerBack:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Back.png",
    npcOperaSingerWalk:"assets/SeventhLantern/Characters/NPC/OperaSinger/CHR_OperaSinger_Walk.png",
    npcLanternGirlIdle:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Idle.png",
    npcLanternGirlTalk:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Talk.png",
    npcLanternGirlReach:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Reach.png",
    npcLanternGirlTurn:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Turn.png",
    npcLanternGirlFireflies:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Fireflies.png",
    npcLanternGirlWalk:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_Walk.png",
    npcLanternGirlLookBack:"assets/SeventhLantern/Characters/NPC/LanternGirl/CHR_LanternGirl_LookBack.png"
  };

  const images = Object.create(null);
  let loaded=0, failed=0;
  const required = Object.keys(files);
  if(typeof Image!=="undefined"){
    // Decode in small batches. Loading more than two hundred PNGs at once made
    // some Canvas implementations reject otherwise valid images under memory
    // pressure, which looked like a random missing-asset bug.
    const queue=Object.entries(files);let cursor=0,active=0;
    const pump=()=>{
      while(active<8&&cursor<queue.length){
        const [id,src]=queue[cursor++],img=new Image();images[id]=img;active++;
        img.onload=()=>{loaded++;active--;pump();};
        img.onerror=()=>{failed++;active--;(window.__GAME_ERRORS__||(window.__GAME_ERRORS__=[])).push(`production-asset:${src}`);pump();};
        img.src=src;
      }
    };
    pump();
  }
  const ready=id=>!!images[id]?.complete&&images[id].naturalWidth>0;

  function draw(ctx,id,cx,bottom,maxHeight,flip=false,alpha=1){
    if(!ready(id))return false;const img=images[id];const s=maxHeight/img.naturalHeight,dw=img.naturalWidth*s,dh=maxHeight;
    ctx.save();ctx.globalAlpha*=alpha;
    if(flip){ctx.translate(cx,0);ctx.scale(-1,1);ctx.drawImage(img,-dw/2,bottom-dh,dw,dh);}else ctx.drawImage(img,cx-dw/2,bottom-dh,dw,dh);
    ctx.restore();return true;
  }
  function drawTopLeft(ctx,id,x,y,width=null,height=null,alpha=1){
    if(!ready(id))return false;const img=images[id];let w=width,h=height;
    if(w==null&&h==null){w=img.naturalWidth;h=img.naturalHeight;}else if(w==null){w=img.naturalWidth*(h/img.naturalHeight);}else if(h==null){h=img.naturalHeight*(w/img.naturalWidth);}
    ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,x,y,w,h);ctx.restore();return true;
  }
  function repeatFloor(ctx,id,startX,endX,bottom,height){
    if(!ready(id))return;const img=images[id],s=height/img.naturalHeight,w=img.naturalWidth*s;
    for(let x=startX;x<endX+w;x+=Math.max(36,w*.92))draw(ctx,id,x,bottom,height,false,1);
  }

  const palettes={
    opera:["#070b0d","#181318","#2c171c"],
    bamboo:["#07100f","#10211c","#243229"],
    ferry:["#061116","#10242c","#26363e"],
    city:["#070c10","#121c22","#2e2b2a"],
    final:["#08070a","#1d1115","#45201f"]
  };
  function gradientBackground(ctx,W,H,key){const p=palettes[key]||palettes.city;const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,p[0]);g.addColorStop(.58,p[1]);g.addColorStop(1,p[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}

  // These layouts are deliberately sparse and world-space. Every elevated gameplay
  // surface used by the full build has a corresponding visible module in game.js.
  const layouts={
    opera:[
      ["operaCurtainSet",220,255,250],["operaPillar",70,610,300],["operaPillar",520,610,300],["operaCurtain",840,340,260],
      ["operaFloorA",260,610,120],["operaFloorB",700,610,130],["operaStairA",1040,610,220],["operaMasks",1330,370,190],
      ["operaDrum",1870,610,190],["operaShrine",2140,610,210]
    ],
    bamboo:[
      ["bambooRoof",300,220,190],["bambooTemple",520,610,350],["bambooBellTower",1030,610,330],["bambooRig",1380,610,315],
      ["bambooLadder",1650,585,265],["bambooHead",1960,520,300],["bambooShrine",2230,610,250]
    ],
    ferry:[
      ["ferryLamp",220,610,220],["ferryBoat",620,575,190],["ferryBoatLong",1260,570,160],["ferryBridge",1760,610,160],
      ["ferryPier",2070,610,150],["ferryCrates",2260,610,150],["ferryReed",1040,610,110],["ferryRock",1510,610,105]
    ],
    city:[
      ["cityGate",260,610,300],["cityHouseA",620,610,275],["cityHouseB",920,610,275],["cityWindow",1210,610,260],
      ["cityDoor",1460,610,250],["cityArch",1730,610,255],["cityBridge",2000,610,190],["cityLantern",2250,430,160]
    ],
    final:[
      ["cityRitualGate",240,610,330],["cityLampPair",560,610,250],["cityTower",890,610,340],["cityFinalGate",1260,610,400],
      ["arenaPillar",1800,610,300],["arenaPillar",2180,610,300]
    ]
  };


  // Supplemental props use region-local world coordinates. They enrich the existing
  // confirmed maps without changing collision geometry or chapter boundaries.
  const supplementalLayouts={
    paperShop:[
      ["impInnCounter",420,600,128],["impInnShelf",725,598,150],["impInnScreen",900,600,145]
    ],
    alleyB:[
      ["impCourtyardLantern",420,610,118],["impCourtyardBridge",1080,610,130]
    ],
    alleyC:[
      ["impSewerDrain",310,602,120],["impSewerSplash",1080,610,72]
    ],
    opera:[
      ["impClockBellFrame",330,610,235],["impClockBellBeam",980,405,160],["impClockLanternBeam",1490,430,150],["impClockLadder",1970,610,210]
    ],
    bamboo:[
      ["impBambooFence",350,610,115],["impBambooLanternTall",930,610,155],["impBambooRock",1460,610,130],["impBambooLanternHang",2050,370,125]
    ],
    city:[
      ["impGraveGate",720,610,245],["impGraveFence",1130,610,125],["impGraveLantern",1530,610,150],["impGraveShrine",2050,610,155]
    ],
    // Final puzzle pieces are drawn by game.js because their visual state changes
    // with interaction. Keeping them out of this static layout prevents dormant
    // and activated variants from being double-rendered.
    final:[]
  };

  function drawWorld(ctx,regions,cameraX,W,H,gameTime){
    const productionIds=new Set(["opera","bamboo","ferry","city","final"]);
    const visible=regions.filter(r=>productionIds.has(r.id)&&r.end>cameraX&&r.start<cameraX+W);
    if(!visible.length)return false;
    ctx.save();ctx.translate(-cameraX,0);
    for(const region of visible){
      const key=region.id,start=region.start,end=region.end;
      const panoramaId={opera:"bgOpera",bamboo:"bgBamboo",ferry:"bgFerry",city:"bgCity",final:"bgFinal"}[key];
      if(ready(panoramaId))ctx.drawImage(images[panoramaId],start,0,end-start,H);
      // Scene-specific ambience.
      if(key==="ferry"){
        ctx.save();ctx.strokeStyle="#8ec5d322";ctx.lineWidth=1;for(let i=0;i<22;i++){const y=630+i*3+Math.sin(gameTime*2+i)*2;ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(end,y);ctx.stroke();}ctx.restore();
      }
      if(key==="bamboo"){ctx.save();ctx.globalAlpha=.10;ctx.fillStyle="#294437";for(let i=0;i<18;i++){const x=start+(i*137)%(end-start),h=90+(i%5)*28;ctx.fillRect(x,610-h,5,h);}ctx.restore();}
    }
    // Curated imported modules are drawn only when their region intersects the camera.
    // They never create collision on their own; collision remains authored by game.js.
    for(const region of regions){
      if(region.end<=cameraX||region.start>=cameraX+W)continue;
      const extra=supplementalLayouts[region.id];if(!extra)continue;
      for(const [id,localX,bottom,height] of extra)draw(ctx,id,region.start+localX,bottom,height,false,.94);
    }
    ctx.restore();
    return true;
  }

  function drawScene(ctx,region,cameraX,W,H,gameTime){
    if(!["opera","bamboo","ferry","city","final"].includes(region.id))return false;
    gradientBackground(ctx,W,H,region.id);
    return drawWorld(ctx,[region],cameraX,W,H,gameTime);
  }

  window.ProductionAssets={files,images,ready,draw,drawTopLeft,drawScene,drawWorld,supplementalLayouts,getStatus:()=>({loaded,total:required.length,failed,missing:required.filter(k=>!ready(k)),supplementalRegions:Object.keys(supplementalLayouts)})};
})();

// Phase 2 shortcut art intentionally reuses authored chapter modules already registered
// above (operaRail, bambooRig, ferryBridge, cityBridge). No synthetic/mismatched
// asset IDs are introduced; gameplay collision and these visible modules share world space.

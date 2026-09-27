/*
 * 第7盏灯 · Motion Layer
 * 只负责运动表现、镜头、接地反馈和视觉锚点，不接管原有玩法规则。
 */
(() => {
  const M = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  // Locomotion phase remains distance-driven. The renderer now samples six authored
  // poses across the same stride, so movement stays smooth without increasing world speed.
  // ~0.042 phase-steps per travelled pixel yields about 2.8-3.1 cycles/sec at full run speed.
  const PLAYER_PHASE_PER_PIXEL = 0.042;
  const PLAYER_TELEPORT_PHASE_CUTOFF = 80;
  const state = {
    coyote: 0,
    jumpBuffer: 0,
    landing: 0,
    landingStrength: 0,
    cameraVelocityX: 0,
    cameraY: 0,
    lookAheadX: 0,
    transition: 1,
    previousScene: null,
    currentScene: null,
    lanternAngle: 0,
    lanternVelocity: 0,
    lastFacing: 1,
    turn: 0,
    turnFrom: 1,
    turnTo: 1,
    prevPlayerX: 0,
    prevPlayerY: 0,
    prevVX: 0,
    locomotionBlend: 0,
    brakeBlend: 0,
    inputMove: 0,
    playerPhase: 0,
    playerLastX: null,
    moveMode: "idle",
    moveTimer: 0,
    gaitMode: "walk",
    enemyMotion: new WeakMap(),
    bossMotion: new WeakMap()
  };

  M.interacting = () => false;

  function samplePlayerTravelPhase(){
    const p=player||{};
    if(state.playerLastX==null){state.playerLastX=p.x||0;return 0;}
    const travelled=Math.abs((p.x||0)-state.playerLastX);
    // Teleports / respawns must resync the pivot without fast-forwarding the feet.
    if(travelled>0&&travelled<PLAYER_TELEPORT_PHASE_CUTOFF)state.playerPhase+=travelled*PLAYER_PHASE_PER_PIXEL;
    state.playerLastX=p.x||0;
    return travelled;
  }

  M.beforeUpdate = (dt) => {
    const p = player;
    state.landing = Math.max(0, state.landing - dt);
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
    if (p.grounded) state.coyote = 0.105;
    else state.coyote = Math.max(0, state.coyote - dt);
    if (pressed && pressed.has("k")) state.jumpBuffer = 0.12;

    if (p.facing !== state.lastFacing) {
      state.turn = 0.13;
      state.turnFrom = state.lastFacing;
      state.turnTo = p.facing || 1;
      state.lastFacing = p.facing || 1;
    }
    state.turn = Math.max(0, state.turn - dt);

    // Sample here for compatibility with debug/manual movement. During normal gameplay
    // afterCollision() samples again after this tick's real movement, so animation phase
    // stays synchronized with distance travelled instead of lagging one fixed step behind.
    samplePlayerTravelPhase();

    const targetLamp = (world?.lampAcquired&&world?.lamp?.focused) ? (world?.lamp?.angle || 0) : 0;
    const spring = targetLamp - state.lanternAngle;
    state.lanternVelocity += spring * 34 * dt;
    state.lanternVelocity *= Math.pow(0.001, dt);
    state.lanternAngle += state.lanternVelocity * dt;
    state.prevPlayerX = p.x;
    state.prevPlayerY = p.y;
  };

  M.PlayerController = {
    update(dt) {
      const p = player;
      if (!p || p.dead) return;
      const move = (keys.a ? -1 : 0) + (keys.d ? 1 : 0);
      const maxSpeed = (world?.lampAcquired&&world?.lamp?.focused) ? 175 : p.charging ? 78 : 220;
      const grounded = !!p.grounded;
      const approach=(v,target,amount)=>Math.abs(target-v)<=amount?target:v+Math.sign(target-v)*amount;
      const reversing = !!move && Math.abs(p.vx)>24 && Math.sign(p.vx)!==move;
      state.inputMove=move;

      if (move) {
        // Fast first step, softer cruise and a deliberate braking phase on reversal.
        // Facing only flips once the old momentum is nearly gone, removing the
        // instantaneous mirrored-sprite snap that made movement feel mechanical.
        const speedRatio=Math.min(1,Math.abs(p.vx)/Math.max(1,maxSpeed));
        const accel = !grounded ? 760 : reversing ? 2350 : (speedRatio<.28 ? 1900 : 1180);
        p.vx=approach(p.vx,move*maxSpeed,accel*dt);
        if(!reversing || Math.abs(p.vx)<42)p.facing=move;
      } else {
        const decel = grounded ? 1320 : 360;
        p.vx=approach(p.vx,0,decel*dt);
      }
      state.brakeBlend=lerp(state.brakeBlend,(reversing||(!move&&grounded&&Math.abs(p.vx)>34))?1:0,clamp(dt*12,0,1));
      state.locomotionBlend=lerp(state.locomotionBlend,Math.min(1,Math.abs(p.vx)/Math.max(1,maxSpeed)),clamp(dt*9,0,1));

      if (state.jumpBuffer > 0 && (grounded || state.coyote > 0)) {
        state.jumpBuffer = 0;
        state.coyote = 0;
        // Jumping must not silently drop the core lantern; the approved jump pose already carries it.
        p.vy = -520;
        p.grounded = false;
        if (sound?.jump) sound.jump();
      }

      if (p.dodging > 0) {
        const duration = 0.24;
        const progress = clamp(1 - p.dodging / duration, 0, 1);
        const direction = p.dodgeDirection || -p.facing || -1;
        // Velocity itself decays with an ease-out curve, so the dash starts
        // decisively and settles to zero instead of hitting a hard stop.
        const speed = 500 * Math.pow(1 - progress, 1.65);
        p.vx = direction * speed;
        p.invuln = Math.max(p.invuln, 0.08);
      }

      // Variable jump gravity: held jumps rise cleanly, releasing cuts height,
      // and the apex hangs for a few frames so platforming reads less rigidly.
      let gravity=1500;
      if(Math.abs(p.vy)<95)gravity=980;
      if(p.vy<0&&keys.k)gravity=1220;
      if(p.vy<0&&!keys.k)gravity=2550;
      p.vy += gravity * dt;
      p.vy = Math.min(p.vy, 760);
    },
    afterCollision(dt, wasGrounded, fallSpeed) {
      const p = player;
      if (!p) return;
      // Capture this fixed-step displacement immediately after wall/platform resolution.
      // This removes the one-tick visual lag between body translation and the walk cycle.
      samplePlayerTravelPhase();
      if (p.grounded && !wasGrounded) {
        const strength = clamp((fallSpeed - 120) / 620, 0, 1);
        state.landing = 0.12;
        state.landingStrength = strength;
        if (strength > 0.15 && typeof createBurst === "function") {
          createBurst(p.x + p.w / 2, p.y + p.h, p.x > 1100 ? "#9ab8b2" : "#b9a47d", 2 + Math.round(strength * 3));
        }
      }
    }
  };

  M.EnemyMotor = {
    afterMove(e, dt) {
      if (!e || !e.alive) return;
      const previous = state.enemyMotion.get(e) || { state: "IDLE", notice: 0, lastX: e.x, walkPhase: 0 };
      const travelled = Math.abs((e.x || 0) - (previous.lastX ?? e.x));
      // Match the player rule: animation phase comes from actual travelled distance,
      // so low frame rate cannot make a stationary enemy run in place.
      previous.walkPhase += travelled * 0.115;
      previous.lastX = e.x;
      const nextState=e.aiState||previous.state||"IDLE";
      if(nextState!==previous.state){previous.state=nextState;previous.animTime=0;}
      else previous.animTime=(previous.animTime||0)+dt;
      previous.notice = previous.state === "NOTICE" ? Math.max(previous.notice || 0, e.stateTimer || 0) : 0;
      state.enemyMotion.set(e, previous);
    }
  };
  M.resetEnemyMotion = (e) => {
    if (!e) return;
    state.enemyMotion.delete(e);
    state.enemyMotion.set(e,{state:e.aiState||"IDLE",notice:0,lastX:e.x||0,walkPhase:0,animTime:0});
  };

  M.afterUpdate = (dt) => {
    const p = player;
    const w = W || 1280;
    const worldState = world;
    if (p && worldState) {
      if(typeof updateCamera === "function") updateCamera(dt);
    }

    const zone = typeof sceneAssetForZone === "function" ? sceneAssetForZone((cameraX || 0) + w * 0.5) : null;
    if (zone && zone !== state.currentScene) {
      if (state.currentScene) state.previousScene = state.currentScene;
      state.currentScene = zone;
      state.transition = 0;
    }
    state.transition = clamp(state.transition + dt / 0.55, 0, 1);
  };

  M.getSceneTransition = () => ({
    currentKey: state.currentScene,
    previousKey: state.previousScene,
    alpha: state.transition
  });

  function playerMotionState(){
    const p=player||{};
    const phase=state.playerPhase||0;
    if(p.dead)return {mode:"dead",phase,airMode:null,gait:state.gaitMode};
    if((p.hurtTimer||0)>0)return {mode:"hurt",phase,airMode:null,gait:state.gaitMode};
    if(p.attack)return {mode:"attack",phase,airMode:null,gait:state.gaitMode};
    if(!p.grounded){
      const airMode=(p.vy||0)<-120?"rise":(p.vy||0)>120?"fall":"apex";
      return {mode:"air",phase,airMode,gait:state.gaitMode};
    }
    if((state.landing||0)>0)return {mode:"land",phase,airMode:null,gait:state.gaitMode};
    const speed=Math.abs(p.vx||0);
    if(state.gaitMode==="run"){if(speed<148)state.gaitMode="walk";}
    else if(speed>182)state.gaitMode="run";
    if((state.turn||0)>0&&speed>8)return {mode:"turn",phase,airMode:null,gait:state.gaitMode};
    // Keep the same speed thresholds for state selection and sprite selection.
    // Start/stop retain the distance-driven cycle, so feet decelerate with the body.
    if((state.inputMove||0)!==0&&speed>8&&state.locomotionBlend<.34)return {mode:"startMove",phase,airMode:null,gait:state.gaitMode};
    if((state.inputMove||0)===0&&speed>8)return {mode:"stopMove",phase,airMode:null,gait:state.gaitMode};
    if(speed>28)return {mode:"move",phase,airMode:null,gait:state.gaitMode};
    if(speed>8)return {mode:"stopMove",phase,airMode:null,gait:state.gaitMode};
    return {mode:"idle",phase,airMode:null,gait:state.gaitMode};
  }
  M.getPlayerMotionState=()=>({...playerMotionState(),landTimer:state.landing||0,turnTimer:state.turn||0});

  M.getPlayerVisual = () => {
    const p = player || {};
    const motion=playerMotionState();
    const moving = Math.abs(p.vx || 0);
    const inAir = !p.grounded;
    const turnT = state.turn > 0 ? 1 - state.turn / 0.13 : 1;
    const turnEase = turnT * turnT * (3 - 2 * turnT);
    const facingBlend = state.turn > 0 ? lerp(state.turnFrom, state.turnTo, turnEase) : (p.facing || 1);
    const landing = state.landing > 0 ? state.landingStrength * (state.landing / 0.12) : 0;
    const gaitActive=["startMove","move","stopMove","turn"].includes(motion.mode);
    const gait = gaitActive ? Math.sin(motion.phase * Math.PI * 2) * Math.min(1, moving / 220) : 0;
    const idleBreath=motion.mode==="idle"?Math.sin((typeof gameTime!=="undefined"?gameTime:0)*2.15):0;
    const startLean=(state.inputMove||0)*Math.max(0,1-state.locomotionBlend)*.016;
    const brakeLean=-(Math.sign(p.vx||state.lastFacing)||1)*state.brakeBlend*.022;
    let attackOffsetX=0, attackRotation=0, attackScaleX=0, attackScaleY=0;
    if (motion.mode==="attack"&&p.attack) {
      const ap=clamp((p.attack.time||0)/(p.attack.total||1),0,1), dir=p.facing||1;
      if(ap<0.30){const q=ap/0.30; attackOffsetX=-dir*1.4*q; attackRotation=-dir*0.016*q; attackScaleY=0.006*q;}
      else if(ap<0.65){const q=(ap-0.30)/0.35; attackOffsetX=dir*(1.8+2.2*Math.sin(q*Math.PI)); attackRotation=dir*(0.012+0.018*Math.sin(q*Math.PI)); attackScaleX=0.010*Math.sin(q*Math.PI); attackScaleY=-0.010*Math.sin(q*Math.PI);}
      else {const q=(ap-0.65)/0.35; attackOffsetX=dir*1.8*(1-q); attackRotation=dir*0.012*(1-q);}
    }
    const rotation=clamp(clamp((p.vx||0)*0.00042,-0.022,0.022)+startLean+brakeLean+(1-turnEase)*0.020*(state.turnTo-state.turnFrom)+attackRotation,-0.045,0.045);
    return {
      offsetX: gait * 0.8 + attackOffsetX - (state.inputMove||0)*Math.max(0,1-state.locomotionBlend)*0.7,
      offsetY: inAir ? clamp((p.vy || 0) * 0.0024, -1.0, 1.8) : landing * 1.6 + idleBreath*.42,
      rotation: rotation + idleBreath*.0025,
      scaleX: clamp(1 + landing * 0.012 + attackScaleX-idleBreath*.0015,0.985,1.018),
      scaleY: clamp(1 - landing * 0.022 + attackScaleY+idleBreath*.003,0.972,1.015),
      facingBlend
    };
  };

  M.getLanternVisual = () => ({
    angle: state.lanternAngle,
    sway: clamp((player?.vx || 0) * 0.0007 + state.lanternVelocity * 0.02, -0.12, 0.12),
    scale: world?.lamp?.stable < 0.55 ? 0.86 : 1
  });

  function enemyMotionState(e){
    const m=e?state.enemyMotion.get(e):null;
    const ai=e?.aiState||m?.state||"IDLE";
    let mode="idle",stageProgress=0,attackProgress=0;
    if((e?.hurt||0)>0||ai==="HIT")mode="hurt";
    else if(ai==="PREPARE_ATTACK"){
      mode="prepare";
      stageProgress=clamp(1-(e?.stateTimer||0)/Math.max(.001,e?.windupTotal||e?.windup||.4),0,1);
      attackProgress=stageProgress*.30;
    }else if(ai==="ATTACK_ACTIVE"){
      mode="active";
      stageProgress=clamp(1-(e?.stateTimer||0)/Math.max(.001,e?.attackActiveTotal||.12),0,1);
      attackProgress=.30+stageProgress*.42;
    }else if(ai==="RECOVERY"){
      mode="recovery";
      stageProgress=clamp(1-(e?.stateTimer||0)/Math.max(.001,e?.recoveryTotal||.28),0,1);
      attackProgress=.72+stageProgress*.28;
    }else if(["CHASE","PATROL"].includes(ai)&&Math.abs(e?.vx||0)>8)mode="move";
    else if(ai==="TURN"||ai==="BLOCKED")mode="turn";
    else if(ai==="NOTICE")mode="notice";
    return {mode,phase:m?.walkPhase||0,animTime:m?.animTime||0,stageProgress,attackProgress:clamp(attackProgress,0,1),ai};
  }
  M.getEnemyMotionState=(e)=>({...enemyMotionState(e)});

  M.getEnemyVisual = (e) => {
    const m = e ? state.enemyMotion.get(e) : null;
    const t = gameTime || 0;
    const ai = e?.aiState || m?.state || "IDLE";
    const notice = ai === "NOTICE";
    const prepare = ai === "PREPARE_ATTACK" || e?.windup > 0;
    const active = ai === "ATTACK_ACTIVE";
    const recovery = ai === "RECOVERY";
    const hurt = e?.hurt > 0;
    const grounded = e?.grounded !== false;
    const moving = grounded && ["CHASE","PATROL"].includes(ai) && Math.abs(e?.vx || 0) > 8;
    const phase = m?.walkPhase || 0;
    const stepLift = moving ? -Math.abs(Math.sin(phase)) * (e?.type === "paper" ? 0.9 : 0.65) : 0;
    const idleBob = grounded && !moving ? Math.sin(t * 3.2 + (e?.x || 0) * 0.01) * (notice ? 0.12 : 0.22) : 0;
    let rotation = clamp((e?.vx || 0) * 0.00065, -0.035, 0.035);
    let scaleX = 1, scaleY = 1;
    if (prepare) { rotation += (e?.desiredDir || 1) * -0.075; scaleX=0.97; scaleY=1.035; }
    if (active) { rotation += (e?.desiredDir || 1) * 0.105; scaleX=1.055; scaleY=0.965; }
    if (recovery) { rotation += (e?.desiredDir || 1) * 0.035; scaleX=1.015; scaleY=0.985; }
    if (hurt) rotation += (e?.desiredDir || 1) * -0.055;
    if (moving) { rotation += Math.sin(phase) * 0.018; scaleY -= Math.abs(Math.sin(phase))*0.018; scaleX += Math.abs(Math.sin(phase))*0.012; }
    return {
      offsetX: active ? (e?.desiredDir || 1) * 5 : 0,
      offsetY: stepLift + idleBob + (grounded ? 0 : clamp((e?.vy || 0) * 0.004, -2, 4)),
      rotation, scaleX, scaleY, notice, grounded
    };
  };

  M.getBossVisual = (b) => {
    const phase = b?.pendingPhase || b?.phase || 1;
    const t = gameTime || 0;
    const pulse = Math.sin(t * (phase === 3 ? 5.2 : 2.1));
    const total=b?.phaseTransitionTotal||.58;
    const transition = b?.phaseTransition>0 ? clamp(1-(b.phaseTransition/total),0,1) : 1;
    const transitionPunch = b?.pendingPhase ? Math.sin(transition*Math.PI) : 0;
    const dashProgress = b?.dash > 0 ? clamp(1-b.dash/(b.dashTotal||.48),0,1) : 0;
    if (phase === 1) return { offsetX: 0, offsetY: pulse * 1.2, rotation: pulse * 0.006, scaleX: 1, scaleY: 1 + pulse * 0.009 };
    if (phase === 2) return { offsetX: pulse * 2.2, offsetY: -transitionPunch*5 + Math.abs(pulse) * 1.0, rotation: pulse * 0.009, scaleX: 1 + transitionPunch*.06 + pulse * 0.012, scaleY: 1-transitionPunch*.03-pulse*.006 };
    return { offsetX: pulse * 4 + (b?.dashDir||-1)*Math.sin(dashProgress*Math.PI)*7, offsetY: transitionPunch*6 + Math.abs(pulse) * 1.4, rotation: clamp((b?.dashDir || -1) * (0.018+dashProgress*.025) + pulse * 0.012, -0.075, 0.075), scaleX: 1.02 + transitionPunch*.05 + pulse * 0.014, scaleY: 0.97-transitionPunch*.05-pulse*.012 };
  };

  M.drawWorldOverlay = () => {
    const layerCtx = ctx;
    const p = player;
    if (!layerCtx || !p) return;
    layerCtx.save();
    layerCtx.translate(-cameraX, 0);
    if (p.grounded && state.landing > 0) {
      const alpha = state.landing / 0.12;
      layerCtx.globalAlpha = alpha * 0.22;
      layerCtx.strokeStyle = p.x > 1100 ? "#b8d6d1" : "#d6bb84";
      layerCtx.lineWidth = 1.5;
      layerCtx.beginPath();
      layerCtx.ellipse(p.x + p.w / 2, p.y + p.h + 2, 25 + (1 - alpha) * 14, 5 + (1 - alpha) * 3, 0, 0, Math.PI * 2);
      layerCtx.stroke();
    }
    layerCtx.restore();
  };

  window.Motion = M;
})();

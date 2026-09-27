(()=>{
  const EVENTS={
    paper_shop_roomtone:"assets/audio/ambience/paper_city_rustle.wav",rain_alley:"assets/audio/ambience/rain_alley.wav",wind_opera:"assets/audio/ambience/opera_wind.wav",temple_wind:"assets/audio/ambience/temple_wind.wav",ferry_water:"assets/audio/ambience/ferry_water.wav",paper_city_rustle:"assets/audio/ambience/paper_city_rustle.wav",final_low_drone:"assets/audio/ambience/final_low_drone.wav",
    footstep_stone:"assets/audio/sfx/footstep_stone.wav",footstep_wood:"assets/audio/sfx/footstep_wood.wav",footstep_mud:"assets/audio/sfx/footstep_mud.wav",jump:"assets/audio/sfx/jump.wav",land:"assets/audio/sfx/land.wav",hurt:"assets/audio/sfx/hurt.wav",dodge:"assets/audio/sfx/dodge.wav",
    ruler_swing_1:"assets/audio/sfx/ruler_swing_1.wav",ruler_swing_2:"assets/audio/sfx/ruler_swing_2.wav",ruler_swing_3:"assets/audio/sfx/ruler_swing_3.wav",ruler_hit:"assets/audio/sfx/ruler_hit.wav",ruler_charge:"assets/audio/sfx/ruler_charge.wav",
    ritual_slash_1:"assets/audio/sfx/ritual_slash_1.wav",ritual_slash_2:"assets/audio/sfx/ritual_slash_2.wav",ritual_thrust:"assets/audio/sfx/ritual_thrust.wav",ritual_finish:"assets/audio/sfx/ritual_finish.wav",ritual_cut_paper:"assets/audio/sfx/ritual_cut_paper.wav",
    lantern_raise:"assets/audio/sfx/lantern_raise.wav",lantern_lower:"assets/audio/sfx/lantern_lower.wav",lantern_focus:"assets/audio/sfx/lantern_focus.wav",lantern_unstable:"assets/audio/sfx/lantern_unstable.wav",
    gong_low:"assets/audio/sfx/gong_low.wav",gong_mid:"assets/audio/sfx/gong_mid.wav",gong_high:"assets/audio/sfx/gong_high.wav",temple_bell_near:"assets/audio/sfx/temple_bell_near.wav",temple_bell_mid:"assets/audio/sfx/temple_bell_mid.wav",temple_bell_far:"assets/audio/sfx/temple_bell_far.wav",
    winch:"assets/audio/sfx/winch.wav",paper_pickup:"assets/audio/sfx/paper_pickup.wav",grave_lantern:"assets/audio/sfx/grave_lantern.wav",seal_open:"assets/audio/sfx/seal_open.wav",
    boss_voice_whisper:"assets/audio/sfx/boss_voice_whisper.wav",boss_phase_change:"assets/audio/sfx/boss_phase_change.wav",boss_mouth_reveal:"assets/audio/sfx/boss_mouth_reveal.wav",boss_hit:"assets/audio/sfx/boss_hit.wav",boss_death:"assets/audio/sfx/boss_death.wav",
    shadow_phase_through:"assets/audio/sfx/shadow_phase_through.wav",
    boss_attack_volley:"assets/audio/sfx/boss_mouth_reveal.wav",boss_attack_dash:"assets/audio/sfx/boss_hit.wav",boss_attack_ground:"assets/audio/sfx/gong_low.wav",
    player_death:"assets/audio/ambience/paper_city_rustle.wav",puzzle_wrong:"assets/audio/sfx/shadow_phase_through.wav",story_ghost:"assets/audio/sfx/boss_voice_whisper.wav",ui_select:"assets/audio/sfx/lantern_raise.wav",final_echo:"assets/audio/sfx/temple_bell_far.wav"
  };
  const active=new Map(),lastPlayed=new Map(),fadeTokens=new WeakMap();
  let env=null,ambienceOverlay=null,ambienceDuck=1,duckToken=0;
  let masterVolume=.88,sfxVolume=.86,ambienceVolume=.58;
  const AMBIENCE=new Set(["paper_shop_roomtone","rain_alley","wind_opera","temple_wind","ferry_water","paper_city_rustle","final_low_drone"]);
  const LAYERABLE_AMBIENCE=new Set(["paper_shop_roomtone","rain_alley","wind_opera","temple_wind","ferry_water","paper_city_rustle"]);
  const EVENT_COOLDOWNS={footstep_stone:.055,footstep_wood:.055,footstep_mud:.055,ruler_hit:.025,ritual_cut_paper:.025,boss_voice_whisper:.08,boss_hit:.05};

  function makeAudio(url){
    if(!url||typeof Audio==='undefined')return null;
    try{const el=new Audio(url);el.preload='auto';return el;}catch(_e){return null;}
  }
  function clamp01(v){return Math.max(0,Math.min(1,v));}
  function loopTarget(rec){
    if(!rec)return 0;
    const bus=rec.ambience?ambienceVolume:sfxVolume;
    const duck=rec.ambience?ambienceDuck:1;
    return clamp01(rec.baseVolume*bus*masterVolume*duck);
  }
  function fadeTo(el,target,ms=0,onDone){
    if(!el)return;
    const token=(fadeTokens.get(el)||0)+1;fadeTokens.set(el,token);
    const from=Number.isFinite(el.volume)?el.volume:0,targetV=clamp01(target);
    if(ms<=0){el.volume=targetV;onDone?.();return;}
    const started=performance.now();
    const step=now=>{
      if(fadeTokens.get(el)!==token)return;
      const p=clamp01((now-started)/ms),ease=p*p*(3-2*p);
      el.volume=clamp01(from+(targetV-from)*ease);
      if(p<1)requestAnimationFrame(step);else onDone?.();
    };
    requestAnimationFrame(step);
  }
  function stopElement(el){
    if(!el)return;
    try{el.pause();el.currentTime=0;}catch(_e){}
  }
  function play(name,{loop=false,volume=1,rate=1,cooldown}={}){
    const url=EVENTS[name];if(!url)return false;
    const now=performance.now()/1000,cd=Number.isFinite(cooldown)?cooldown:(EVENT_COOLDOWNS[name]||0);
    if(!loop&&cd>0&&now-(lastPlayed.get(name)||-999)<cd)return false;
    lastPlayed.set(name,now);
    if(loop)return startLoop(name,volume,rate,0);
    const el=makeAudio(url);if(!el)return false;
    el.loop=false;el.volume=clamp01(volume*sfxVolume*masterVolume);el.playbackRate=Math.max(.5,Math.min(2,rate));
    el.play().catch(()=>{});return true;
  }
  function startLoop(name,baseVolume=.38,rate=1,fadeMs=0){
    const url=EVENTS[name];if(!url)return false;
    if(active.has(name))return true;
    const el=makeAudio(url);if(!el)return false;
    const rec={el,name,baseVolume,ambience:AMBIENCE.has(name)};
    el.loop=true;el.playbackRate=Math.max(.5,Math.min(2,rate));el.volume=fadeMs?0:loopTarget(rec);
    active.set(name,rec);el.play().catch(()=>{});
    if(fadeMs)fadeTo(el,loopTarget(rec),fadeMs);
    return true;
  }
  function stop(name,fadeMs=0){
    const rec=active.get(name);if(!rec)return false;
    active.delete(name);
    if(fadeMs>0)fadeTo(rec.el,0,fadeMs,()=>stopElement(rec.el));else stopElement(rec.el);
    return true;
  }
  function stopOverlay(fadeMs=0){
    const rec=ambienceOverlay;if(!rec)return;
    ambienceOverlay=null;
    if(fadeMs>0)fadeTo(rec.el,0,fadeMs,()=>stopElement(rec.el));else stopElement(rec.el);
  }
  function refreshLoopVolumes(ms=0){
    for(const rec of active.values())fadeTo(rec.el,loopTarget(rec),ms);
    if(ambienceOverlay)fadeTo(ambienceOverlay.el,loopTarget(ambienceOverlay),ms);
  }
  function stopAll(){for(const name of [...active.keys()])stop(name);stopOverlay();env=null;}
  function setEnvironment(region){
    const map={
      paperShop:'paper_shop_roomtone',alleyA:'rain_alley',alleyB:'rain_alley',alleyC:'rain_alley',bossArena:'rain_alley',
      opera:'wind_opera',bamboo:'temple_wind',ferry:'ferry_water',city:'paper_city_rustle',final:'final_low_drone',epilogue:'rain_alley'
    };
    const next=map[region]??null;if(next===env)return;
    const old=env;if(old)stop(old,460);stopOverlay(430);env=next;
    if(!env)return;
    startLoop(env,.38,1,620);
    if(LAYERABLE_AMBIENCE.has(env)){
      const overlay=makeAudio(EVENTS[env]);
      if(overlay){
        const rec={el:overlay,name:env+":overlay",baseVolume:.105,ambience:true};
        ambienceOverlay=rec;overlay.loop=true;overlay.playbackRate=.985+Math.random()*.03;overlay.volume=0;
        overlay.addEventListener?.('loadedmetadata',()=>{try{if(Number.isFinite(overlay.duration)&&overlay.duration>1)overlay.currentTime=overlay.duration*(.27+Math.random()*.46);}catch(_e){}},{once:true});
        overlay.play().catch(()=>{});fadeTo(overlay,loopTarget(rec),780);
      }
    }
  }
  function duckAmbience(amount=.55,hold=.16,release=.52){
    const token=++duckToken;ambienceDuck=clamp01(amount);refreshLoopVolumes(70);
    setTimeout(()=>{if(token!==duckToken)return;ambienceDuck=1;refreshLoopVolumes(Math.max(80,release*1000));},Math.max(0,hold*1000));
  }
  function stopEnvironment(){if(env)stop(env,260);stopOverlay(260);env=null;}
  function setVolumes({master,sfx,ambience}={}){
    if(Number.isFinite(master))masterVolume=clamp01(master);
    if(Number.isFinite(sfx))sfxVolume=clamp01(sfx);
    if(Number.isFinite(ambience))ambienceVolume=clamp01(ambience);
    refreshLoopVolumes(80);return {masterVolume,sfxVolume,ambienceVolume};
  }
  function getVolumes(){return {masterVolume,sfxVolume,ambienceVolume};}
  function setEventSource(name,url){if(!(name in EVENTS))return false;EVENTS[name]=url||null;return true;}
  window.AudioManager={EVENTS,play,stop,stopAll,setEnvironment,stopEnvironment,duckAmbience,setEventSource,setVolumes,getVolumes};
})();
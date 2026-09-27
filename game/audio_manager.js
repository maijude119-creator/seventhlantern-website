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
    player_death:"assets/audio/ambience/paper_city_rustle.wav",puzzle_wrong:"assets/audio/sfx/shadow_phase_through.wav",story_ghost:"assets/audio/sfx/boss_voice_whisper.wav",ui_select:"assets/audio/sfx/lantern_raise.wav",boss_attack:"assets/audio/sfx/boss_phase_change.wav",final_echo:"assets/audio/sfx/temple_bell_far.wav"
  };
  const active=new Map();
  let env=null,ambienceOverlay=null;
  let masterVolume=.88,sfxVolume=.86,ambienceVolume=.58;
  const AMBIENCE=new Set(["paper_shop_roomtone","rain_alley","wind_opera","temple_wind","ferry_water","paper_city_rustle","final_low_drone"]);
  const LAYERABLE_AMBIENCE=new Set(["paper_shop_roomtone","rain_alley","wind_opera","temple_wind","ferry_water","paper_city_rustle"]);
  function makeAudio(url){
    if(!url||typeof Audio==='undefined')return null;
    try{const el=new Audio(url);el.preload='auto';return el;}catch(_e){return null;}
  }
  function play(name,{loop=false,volume=1,rate=1}={}){
    const url=EVENTS[name];
    if(!url)return false;
    const el=makeAudio(url);if(!el)return false;
    el.loop=!!loop;const bus=AMBIENCE.has(name)?ambienceVolume:sfxVolume;el.volume=Math.max(0,Math.min(1,volume*bus*masterVolume));el.playbackRate=Math.max(.5,Math.min(2,rate));
    el.play().catch(()=>{});
    if(loop)active.set(name,el);
    return true;
  }
  function stop(name){
    const el=active.get(name);if(!el)return false;
    try{el.pause();el.currentTime=0;}catch(_e){}
    active.delete(name);return true;
  }
  function stopOverlay(){
    if(!ambienceOverlay)return;
    try{ambienceOverlay.pause();ambienceOverlay.currentTime=0;}catch(_e){}
    ambienceOverlay=null;
  }
  function stopAll(){for(const name of [...active.keys()])stop(name);stopOverlay();}
  function setEnvironment(region){
    const map={
      paperShop:'paper_shop_roomtone',alleyA:'rain_alley',alleyB:'rain_alley',alleyC:'rain_alley',bossArena:'rain_alley',
      opera:'wind_opera',bamboo:'temple_wind',ferry:'ferry_water',city:'paper_city_rustle',final:'final_low_drone',epilogue:'rain_alley'
    };
    const next=map[region]??null;
    if(next===env)return;
    if(env)stop(env);stopOverlay();
    env=next;
    if(env){
      play(env,{loop:true,volume:.38});
      // Natural ambience files are intentionally layered very softly with a detuned,
      // time-offset copy. This masks the obvious 8-second seam without changing the authored sound.
      if(LAYERABLE_AMBIENCE.has(env)){
        const overlay=makeAudio(EVENTS[env]);
        if(overlay){
          ambienceOverlay=overlay;overlay.loop=true;overlay.playbackRate=.985+Math.random()*.03;
          overlay.volume=Math.max(0,Math.min(1,.11*ambienceVolume*masterVolume));
          overlay.addEventListener?.('loadedmetadata',()=>{
            try{if(Number.isFinite(overlay.duration)&&overlay.duration>1)overlay.currentTime=overlay.duration*(.27+Math.random()*.46);}catch(_e){}
          },{once:true});
          overlay.play().catch(()=>{});
        }
      }
    }
  }
  function stopEnvironment(){if(env)stop(env);stopOverlay();env=null;}
  function setVolumes({master,sfx,ambience}={}){
    if(Number.isFinite(master))masterVolume=Math.max(0,Math.min(1,master));
    if(Number.isFinite(sfx))sfxVolume=Math.max(0,Math.min(1,sfx));
    if(Number.isFinite(ambience))ambienceVolume=Math.max(0,Math.min(1,ambience));
    for(const [name,el] of active){const bus=AMBIENCE.has(name)?ambienceVolume:sfxVolume;el.volume=Math.max(0,Math.min(1,bus*masterVolume*.72));}
    if(ambienceOverlay)ambienceOverlay.volume=Math.max(0,Math.min(1,.11*ambienceVolume*masterVolume));
    return {masterVolume,sfxVolume,ambienceVolume};
  }
  function getVolumes(){return {masterVolume,sfxVolume,ambienceVolume};}
  function setEventSource(name,url){if(!(name in EVENTS))return false;EVENTS[name]=url||null;return true;}
  window.AudioManager={EVENTS,play,stop,stopAll,setEnvironment,stopEnvironment,setEventSource,setVolumes,getVolumes};
})();

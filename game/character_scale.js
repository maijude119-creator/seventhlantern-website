(()=>{
  const BASE_HEIGHT=174;
  const ROLES={
    ayan:{scale:1.00,footOffset:0},
    shenpo:{scale:.98,footOffset:0},
    nameless:{scale:1.02,footOffset:0},
    umbrella:{scale:.99,footOffset:0},
    operaSinger:{scale:1.00,footOffset:0},
    lanternGirl:{scale:.84,footOffset:0}
  };
  const get=(role)=>{
    const cfg=ROLES[role]||ROLES.ayan;
    return {...cfg,height:Math.round(BASE_HEIGHT*cfg.scale)};
  };
  const assertRole=(role,height)=>Math.abs(height-get(role).height)<=11;
  window.CharacterScale={BASE_HEIGHT,ROLES,get,assertRole};
})();

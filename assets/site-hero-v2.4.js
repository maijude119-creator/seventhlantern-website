(() => {
  const hero=document.querySelector('.hero');
  if(!hero||hero.querySelector('.lantern-trigger'))return;

  const light=document.createElement('div');
  light.className='hero-interactive-light';
  light.setAttribute('aria-hidden','true');
  hero.appendChild(light);

  const trigger=document.createElement('button');
  trigger.type='button';
  trigger.className='lantern-trigger';
  trigger.setAttribute('aria-label','点亮第七盏灯');
  trigger.setAttribute('aria-expanded','false');
  trigger.innerHTML='<span class="lantern-ring" aria-hidden="true"></span><span class="lantern-hint"><kbd>E</kbd><span>点亮第七盏灯</span></span>';
  hero.appendChild(trigger);

  const status=document.createElement('span');
  status.className='hero-lantern-status';
  status.textContent='灯火可交互';
  hero.appendChild(status);

  const panel=document.createElement('aside');
  panel.className='hero-lantern-panel';
  panel.setAttribute('aria-label','第七盏灯入口');
  panel.innerHTML='<div class="panel-top"><div><p class="panel-kicker">THE SEVENTH LANTERN</p><h3>第七盏灯已经亮起</h3></div><button type="button" class="panel-close" aria-label="收起点灯菜单">×</button></div><p>灯火照亮的不是出口，而是继续往前的选择。你可以直接进入无阴镇，也可以先看完故事与版本信息。</p><div class="hero-lantern-actions"><a href="/play">进入无阴镇</a><a href="#story">先看故事</a><a href="/download">下载游戏</a></div>';
  hero.appendChild(panel);

  const stamp=hero.querySelector('.hero-stamp span');
  const hint=trigger.querySelector('.lantern-hint span');
  let awake=false;

  const setAwake=(value)=>{
    awake=!!value;
    hero.classList.toggle('lantern-awake',awake);
    trigger.setAttribute('aria-expanded',String(awake));
    trigger.setAttribute('aria-label',awake?'收起第七盏灯入口':'点亮第七盏灯');
    if(hint)hint.textContent=awake?'灯已点亮':'点亮第七盏灯';
    if(stamp)stamp.textContent=awake?'灯已亮':'灯未灭';
    status.textContent=awake?'第七盏灯 · 已点亮':'灯火可交互';
  };
  trigger.addEventListener('click',()=>setAwake(!awake));
  panel.querySelector('.panel-close')?.addEventListener('click',()=>setAwake(false));
  panel.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>setAwake(false)));

  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  hero.addEventListener('pointermove',e=>{
    if(reduce.matches||innerWidth<760)return;
    const r=hero.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));
    const y=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));
    hero.style.setProperty('--hero-x',x+'%');
    hero.style.setProperty('--hero-y',y+'%');
    const sx=((x-72)/72)*8,sy=((y-42)/58)*7;
    hero.style.setProperty('--lamp-shift-x',sx.toFixed(1)+'px');
    hero.style.setProperty('--lamp-shift-y',sy.toFixed(1)+'px');
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{
    hero.style.setProperty('--hero-x','72%');hero.style.setProperty('--hero-y','42%');
    hero.style.setProperty('--lamp-shift-x','0px');hero.style.setProperty('--lamp-shift-y','0px');
  },{passive:true});

  addEventListener('keydown',e=>{
    if(e.key.toLowerCase()!=='e'||e.repeat)return;
    const r=hero.getBoundingClientRect();
    const visible=r.bottom>90&&r.top<innerHeight*.82;
    const target=e.target;
    const typing=target&&(/INPUT|TEXTAREA|SELECT/.test(target.tagName)||target.isContentEditable);
    if(visible&&!typing){e.preventDefault();setAwake(!awake);if(awake)trigger.focus({preventScroll:true});}
  });

  setAwake(false);
})();
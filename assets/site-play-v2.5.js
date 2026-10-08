(() => {
  if(document.body?.dataset.page!=='play')return;
  const shell=document.querySelector('.game-shell');
  const frame=document.getElementById('gameFrame');
  if(!shell||!frame||shell.querySelector('.play-launch'))return;

  const launch=document.createElement('section');
  launch.className='play-launch';
  launch.setAttribute('aria-label','进入无阴镇');
  const webVersion=window.SEVENTH_LANTERN_CONFIG?.webGameVersion||'v5.4.2';
  launch.innerHTML='<div class="play-launch-bg" aria-hidden="true"></div><div class="play-launch-fog" aria-hidden="true"></div><div class="play-launch-card"><span class="launch-lantern" aria-hidden="true"></span><div class="play-launch-copy"><p class="launch-kicker">ONLINE PLAY · WUYIN TOWN</p><h1>灯亮了。<br><span>要进去吗？</span></h1><p class="launch-desc">网页版会在当前页面直接运行。游戏资源已经在后台准备，进入后可使用全屏、声音控制与本地存档。</p></div><div class="launch-status"><div><small>GAME BUILD</small><strong data-web-version>'+webVersion+'</strong></div><div><small>SAVE</small><strong>浏览器本地存档</strong></div><div><small>RECOMMENDED</small><strong>PC · Chrome / Edge</strong></div></div><div class="launch-actions"><button class="launch-enter" type="button">点灯进入无阴镇</button><button class="launch-guide" type="button">先看操作</button><a href="/">返回官网</a></div><div class="launch-foot"><i></i><span>第一次进入建议打开声音 · ESC 可暂停</span></div></div>';
  shell.prepend(launch);

  const session=document.createElement('div');
  session.className='play-session';
  session.innerHTML='<i></i><b>WUYIN ONLINE</b><span>·</span><span>本地存档已启用</span>';
  shell.appendChild(session);

  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='play-controls-toggle';toggle.textContent='按键 / 帮助';
  shell.appendChild(toggle);

  const panel=document.createElement('aside');
  panel.className='play-controls-panel';
  panel.innerHTML='<h3>无阴镇操作</h3><div class="play-controls-grid"><div class="play-control-item"><kbd>A D</kbd><span>移动</span></div><div class="play-control-item"><kbd>K</kbd><span>跳跃</span></div><div class="play-control-item"><kbd>J</kbd><span>攻击</span></div><div class="play-control-item"><kbd>L</kbd><span>后撤 / 闪避</span></div><div class="play-control-item"><kbd>E</kbd><span>互动</span></div><div class="play-control-item"><kbd>Q</kbd><span>举灯</span></div></div><p class="play-control-note">如果键盘没有响应，先点击一次游戏画面让浏览器把输入焦点交给游戏。全屏游玩时按 ESC 可退出全屏或暂停。</p>';
  shell.appendChild(panel);

  const welcome=document.getElementById('playWelcome');
  const enter=document.getElementById('enterGame');
  const launchEnter=launch.querySelector('.launch-enter');
  const launchGuide=launch.querySelector('.launch-guide');
  const hideLaunch=()=>{
    launch.classList.add('hidden');
    try{sessionStorage.setItem('seventh-play-launch-seen','1')}catch(_){}
    setTimeout(()=>{try{frame.contentWindow?.focus()}catch(_){}},120);
  };
  launchEnter?.addEventListener('click',hideLaunch);
  launchGuide?.addEventListener('click',()=>{
    hideLaunch();
    if(welcome){welcome.classList.remove('hidden');try{localStorage.removeItem('seventh-play-welcome')}catch(_){}}
  });
  enter?.addEventListener('click',()=>setTimeout(()=>{try{frame.contentWindow?.focus()}catch(_){}},100));

  toggle.addEventListener('click',()=>{
    const open=shell.classList.toggle('controls-open');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent=open?'收起帮助':'按键 / 帮助';
  });
  document.addEventListener('pointerdown',e=>{
    if(!shell.classList.contains('controls-open'))return;
    if(panel.contains(e.target)||toggle.contains(e.target))return;
    shell.classList.remove('controls-open');toggle.setAttribute('aria-expanded','false');toggle.textContent='按键 / 帮助';
  });

  document.addEventListener('fullscreenchange',()=>{
    const btn=document.getElementById('fullscreenFrame');
    if(btn)btn.innerHTML=document.fullscreenElement?'<span>⛶</span> 退出全屏':'<span>⛶</span> 全屏';
  });

  frame.addEventListener('load',()=>{shell.classList.add('game-frame-loaded')});
})();

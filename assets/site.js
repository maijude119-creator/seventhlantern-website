(() => {
  const cfg=window.SEVENTH_LANTERN_CONFIG||{};
  document.querySelectorAll('[data-version]').forEach(el=>el.textContent=cfg.version||'v1.0.0');
  const header=document.querySelector('.site-header');
  if(header) addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>36),{passive:true});

  const intro=document.getElementById('intro');
  if(intro){
    const close=()=>{intro.classList.add('hide');sessionStorage.setItem('seventh-intro','1')};
    document.getElementById('skipIntro')?.addEventListener('click',close);
    if(sessionStorage.getItem('seventh-intro')) intro.classList.add('hide'); else setTimeout(close,3200);
  }

  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  const worldTrack=document.getElementById('worldTrack'),dots=document.getElementById('worldDots');
  if(worldTrack&&dots){
    const cards=[...worldTrack.children];cards.forEach((_,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`场景 ${i+1}`);b.onclick=()=>cards[i].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});dots.appendChild(b)});
  }

  const socials=document.getElementById('socialRow');
  if(socials){
    const labels={douyin:'抖音',bilibili:'B站',xiaohongshu:'小红书',github:'GitHub'};
    Object.entries(labels).forEach(([k,label])=>{const a=document.createElement(cfg.socials?.[k]?'a':'span');a.className='social-pill'+(cfg.socials?.[k]?' enabled':'');a.textContent=label+(cfg.socials?.[k]?'':' · 待填写');if(cfg.socials?.[k]){a.href=cfg.socials[k];a.target='_blank';a.rel='noopener'}socials.appendChild(a)});
  }

  const feedback=document.getElementById('feedbackForm');
  if(feedback) feedback.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(feedback));const all=JSON.parse(localStorage.getItem('seventh-feedback')||'[]');all.unshift({...data,at:new Date().toISOString()});localStorage.setItem('seventh-feedback',JSON.stringify(all));feedback.reset();const n=document.getElementById('feedbackNote');n.textContent='已保存到当前浏览器。接入线上数据库后，这里会直接发送给买橘的。';n.style.color='#cda06c'});

  const guest=document.getElementById('guestbookForm'),messages=document.getElementById('messages');
  const seed=[{name:'过路人',message:'灯还亮着，就继续往前。',at:'2026-09-24'},{name:'无名纸签',message:'最喜欢雨巷和古渡的氛围。',at:'2026-09-24'}];
  const renderMessages=()=>{if(!messages)return;const all=JSON.parse(localStorage.getItem('seventh-guestbook')||'null')||seed;messages.innerHTML='';all.slice(0,12).forEach(m=>{const el=document.createElement('article');el.className='message';el.innerHTML=`<b>${escapeHtml(m.name||'无名客')}</b><time>${escapeHtml((m.at||'').slice(0,10))}</time><p>${escapeHtml(m.message||'')}</p>`;messages.appendChild(el)})};
  if(guest){renderMessages();guest.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(guest));const all=JSON.parse(localStorage.getItem('seventh-guestbook')||'null')||seed;all.unshift({name:(d.name||'无名客').trim()||'无名客',message:(d.message||'').trim(),at:new Date().toISOString()});localStorage.setItem('seventh-guestbook',JSON.stringify(all.slice(0,30)));guest.reset();renderMessages()})}
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  async function loadRelease(){
    const btn=document.getElementById('releaseDownload');
    const direct=cfg.download||{};
    if(btn&&direct.url){
      btn.href=direct.url;btn.textContent='下载 Windows 完整版';btn.classList.remove('disabled');btn.removeAttribute('aria-disabled');btn.setAttribute('download','');
      if(direct.sizeBytes)document.getElementById('releaseSize').textContent=formatBytes(direct.sizeBytes);
    }
    const {owner,repo}=cfg.github||{};if(!btn||!owner||!repo)return;
    try{const r=await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`);if(!r.ok)throw new Error('release');const releases=await r.json();const latest=releases.find(x=>!x.draft&&!x.prerelease)||releases[0];if(!latest)return;const asset=latest.assets?.find(a=>/\.zip$/i.test(a.name))||latest.assets?.[0];if(asset){btn.href=asset.browser_download_url;btn.textContent='下载 Windows 完整版';btn.classList.remove('disabled');btn.removeAttribute('aria-disabled');document.getElementById('releaseSize').textContent=formatBytes(asset.size)}const total=releases.flatMap(x=>x.assets||[]).reduce((s,a)=>s+(a.download_count||0),0);document.getElementById('downloadCount').textContent=total.toLocaleString();document.querySelectorAll('[data-version]').forEach(el=>el.textContent=latest.tag_name||cfg.version)}catch(e){console.warn('GitHub Release unavailable',e)}}
  function formatBytes(n){if(!n)return'--';const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return`${n.toFixed(i>1?1:0)} ${u[i]}`}
  loadRelease();

  const welcome=document.getElementById('playWelcome');
  if(welcome){
    if(localStorage.getItem('seventh-play-welcome')==='1') welcome.classList.add('hidden');
    document.getElementById('enterGame')?.addEventListener('click',()=>{localStorage.setItem('seventh-play-welcome','1');welcome.classList.add('hidden');try{document.getElementById('gameFrame')?.contentWindow?.focus()}catch(_){}});
  }

  const frame=document.getElementById('gameFrame');
  function monitorGameLoader(){
    const loader=document.getElementById('gameLoader');if(!loader||!frame)return;
    const bar=document.getElementById('loaderBar'),pct=document.getElementById('loaderPercent'),count=document.getElementById('loaderCount'),title=document.getElementById('loaderTitle'),desc=document.getElementById('loaderText'),retry=document.getElementById('retryGame');
    let started=Date.now(),lastProgress=0,lastChange=Date.now(),done=false;
    const fail=(message)=>{if(done)return;title.textContent='载入没有完成';desc.textContent=message;loader.classList.add('error');if(retry)retry.hidden=false;};
    const poll=()=>{if(done)return;try{
      const w=frame.contentWindow,st=w?.GameAssetStatus?.();
      if(st&&st.total){
        const progress=Math.max(0,Math.min(100,Math.round(st.loaded/st.total*100)));
        if(bar)bar.style.width=progress+'%';
        if(pct)pct.textContent=progress+'%';
        if(count)count.textContent=st.loaded+' / '+st.total+' 项资源';
        if(progress!==lastProgress){lastProgress=progress;lastChange=Date.now();}
        if(st.failed>0){fail('有 '+st.failed+' 项资源加载失败。可以重新载入，或改用 Windows 完整版。');return;}
        if(st.ready){done=true;if(bar)bar.style.width='100%';if(pct)pct.textContent='100%';if(count)count.textContent='资源准备完成';setTimeout(()=>loader.classList.add('hidden'),320);return;}
      }else if(Date.now()-started>3500){if(count)count.textContent='正在等待游戏资源清单…';}
      if(Date.now()-lastChange>25000){fail('网络似乎停住了。点击“重新载入”会重新请求游戏资源。');return;}
    }catch(e){if(Date.now()-started>12000){fail('游戏页面没有正常回应。可能是浏览器缓存或网络问题。');return;}}
    setTimeout(poll,180);};
    frame.addEventListener('load',()=>{started=Date.now();lastChange=Date.now();setTimeout(poll,120)},{once:true});
    setTimeout(poll,600);
    retry?.addEventListener('click',()=>{retry.hidden=true;loader.classList.remove('error','hidden');title.textContent='重新载入无阴镇';desc.textContent='正在重新请求游戏脚本与美术资源……';if(bar)bar.style.width='0%';if(pct)pct.textContent='0%';if(count)count.textContent='重新连接中';started=Date.now();lastChange=Date.now();lastProgress=0;done=false;frame.src='/game/?reload='+Date.now();setTimeout(poll,800);});
  }
  monitorGameLoader();
  document.getElementById('fullscreenFrame')?.addEventListener('click',()=>{const el=document.querySelector('.game-shell');if(document.fullscreenElement)document.exitFullscreen();else el?.requestFullscreen?.()});
  let muted=false;document.getElementById('muteFrame')?.addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent=muted?'取消静音':'静音';try{const w=frame.contentWindow;w?.AudioManager?.setMuted?.(muted);w?.eval?.(`if(window.AudioManager)AudioManager.setMuted?.(${muted})`)}catch(_){}});
})();

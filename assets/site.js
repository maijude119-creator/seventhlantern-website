(() => {
  const cfg=window.SEVENTH_LANTERN_CONFIG||{};
  document.querySelectorAll('[data-version]').forEach(el=>el.textContent=cfg.version||'v1.0.0');
  const header=document.querySelector('.site-header');
  const progressBar=document.getElementById('pageProgressBar');
  const hero=document.querySelector('.hero');
  const heroBg=document.querySelector('.hero-bg');
  const heroFog=document.querySelector('.hero-fog');
  const onScroll=()=>{
    if(header)header.classList.toggle('scrolled',scrollY>36);
    if(progressBar){const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);progressBar.style.transform='scaleX('+Math.min(1,scrollY/max)+')';}
    if(hero&&heroBg&&scrollY<innerHeight*1.25&&matchMedia('(prefers-reduced-motion: no-preference)').matches){
      const y=Math.min(34,scrollY*.035);heroBg.style.transform='scale(1.035) translate3d(0,'+y+'px,0)';if(heroFog)heroFog.style.transform='translate3d(0,'+(y*.45)+'px,0)';
    }
  };
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  document.querySelectorAll('[data-site-build]').forEach(el=>el.textContent=cfg.siteBuild||'v1.6');
  const menuToggle=document.getElementById('menuToggle');
  const mainNav=document.getElementById('mainNav');
  if(menuToggle&&mainNav){
    const closeMenu=()=>{mainNav.classList.remove('open');menuToggle.classList.remove('open');menuToggle.setAttribute('aria-expanded','false')};
    menuToggle.addEventListener('click',()=>{const open=!mainNav.classList.contains('open');mainNav.classList.toggle('open',open);menuToggle.classList.toggle('open',open);menuToggle.setAttribute('aria-expanded',String(open))});
    mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  }

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

  const lightbox=document.getElementById('mediaLightbox');
  const lightboxImage=document.getElementById('lightboxImage');
  const lightboxCaption=document.getElementById('lightboxCaption');
  const closeLightbox=()=>{if(!lightbox)return;lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open')};
  document.querySelectorAll('.media-shot').forEach(btn=>btn.addEventListener('click',()=>{if(!lightbox||!lightboxImage)return;lightboxImage.src=btn.dataset.full||btn.querySelector('img')?.src||'';lightboxImage.alt=btn.querySelector('img')?.alt||'游戏画面';if(lightboxCaption)lightboxCaption.textContent=btn.dataset.caption||'';lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')}));
  document.getElementById('lightboxClose')?.addEventListener('click',closeLightbox);
  document.getElementById('lightboxBackdrop')?.addEventListener('click',closeLightbox);
  addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox()});

  const socials=document.getElementById('socialRow');
  if(socials){
    const labels={douyin:'抖音',bilibili:'B站',xiaohongshu:'小红书',github:'GitHub'};
    Object.entries(labels).forEach(([k,label])=>{if(!cfg.socials?.[k])return;const a=document.createElement('a');a.className='social-pill enabled';a.textContent=label;a.href=cfg.socials[k];a.target='_blank';a.rel='noopener';socials.appendChild(a)});
  }

  const sb=cfg.supabase||{};
  const sbHeaders=()=>({
    'Content-Type':'application/json',
    'apikey':sb.key||'',
    'Authorization':'Bearer '+(sb.key||'')
  });

  const feedback=document.getElementById('feedbackForm');
  if(feedback) feedback.addEventListener('submit',async e=>{
    e.preventDefault();
    const note=document.getElementById('feedbackNote');
    const btn=feedback.querySelector('button[type="submit"]');
    const data=Object.fromEntries(new FormData(feedback));
    const message=(data.message||'').trim();
    if(!message)return;
    if(!sb.url||!sb.key){if(note)note.textContent='反馈后台暂时不可用，请使用公开 Bug 入口。';return;}
    try{
      if(btn){btn.disabled=true;btn.textContent='提交中…';}
      const r=await fetch(sb.url+'/rest/v1/feedback',{
        method:'POST',
        headers:{...sbHeaders(),'Prefer':'return=minimal'},
        body:JSON.stringify({type:(data.type||'其他建议').slice(0,40),message:message.slice(0,2000),contact:(data.contact||'').trim().slice(0,200)||null,page:location.href.slice(0,300)})
      });
      if(!r.ok)throw new Error('feedback '+r.status);
      feedback.reset();
      if(note){note.textContent='已私密提交给买橘的。感谢反馈。';note.style.color='#cda06c';}
    }catch(err){
      if(note){note.textContent='提交失败，请稍后再试，或使用“公开 Bug”。';note.style.color='#c56e61';}
    }finally{
      if(btn){btn.disabled=false;btn.textContent='私密提交';}
    }
  });

  const guest=document.getElementById('guestbookForm');
  const messages=document.getElementById('messages');
  const guestbookStatus=document.getElementById('guestbookStatus');
  async function loadGuestbook(){
    if(!messages)return;
    messages.innerHTML='<article class="message"><p>正在读取无阴镇的线上纸签……</p></article>';
    if(!sb.url||!sb.key){messages.innerHTML='<article class="message"><b>留言墙暂时不可用</b><p>后台连接尚未完成。</p></article>';return;}
    try{
      const r=await fetch(sb.url+'/rest/v1/guestbook?select=name,message,created_at&approved=eq.true&order=created_at.desc&limit=12',{headers:sbHeaders()});
      if(!r.ok)throw new Error('guestbook '+r.status);
      const rows=await r.json();
      messages.innerHTML='';
      if(!rows.length){
        messages.innerHTML='<article class="message"><b>第一张纸签还没出现</b><p>你可以成为第一个在这里留下话的人。</p></article>';
      }else{
        rows.forEach(m=>{
          const el=document.createElement('article');el.className='message';
          el.innerHTML='<b>'+escapeHtml(m.name||'无名客')+'</b><time>'+escapeHtml((m.created_at||'').slice(0,10))+'</time><p>'+escapeHtml(m.message||'')+'</p>';
          messages.appendChild(el);
        });
      }
      if(guestbookStatus)guestbookStatus.textContent='已公开纸签 · '+rows.length+' 张';
    }catch(err){
      messages.innerHTML='<article class="message"><b>纸签读取失败</b><p>后台暂时没有回应，可以稍后刷新。</p></article>';
      if(guestbookStatus)guestbookStatus.textContent='线上留言暂时读取失败';
    }
  }
  loadGuestbook();

  if(guest) guest.addEventListener('submit',async e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(guest));
    const name=((data.name||'').trim()||'无名客').slice(0,32);
    const message=(data.message||'').trim().slice(0,300);
    const btn=guest.querySelector('button[type="submit"]');
    if(!message)return;
    if(!sb.url||!sb.key){if(guestbookStatus)guestbookStatus.textContent='留言后台暂时不可用';return;}
    try{
      if(btn){btn.disabled=true;btn.textContent='提交中…';}
      const r=await fetch(sb.url+'/rest/v1/guestbook',{
        method:'POST',
        headers:{...sbHeaders(),'Prefer':'return=minimal'},
        body:JSON.stringify({name,message,approved:false,source:'website'})
      });
      if(!r.ok)throw new Error('guest '+r.status);
      guest.reset();
      if(guestbookStatus)guestbookStatus.textContent='纸签已提交，审核通过后会公开显示';
    }catch(err){
      if(guestbookStatus)guestbookStatus.textContent='提交失败，请稍后再试';
    }finally{
      if(btn){btn.disabled=false;btn.textContent='留下纸签';}
    }
  });

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

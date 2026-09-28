(() => {
  const shots=[...document.querySelectorAll('.media-shot')];
  const lightbox=document.getElementById('mediaLightbox');
  const image=document.getElementById('lightboxImage');
  const caption=document.getElementById('lightboxCaption');
  if(!shots.length||!lightbox||!image)return;

  let current=0;
  const sync=(i)=>{
    current=(i+shots.length)%shots.length;
    const shot=shots[current],img=shot.querySelector('img');
    image.src=shot.dataset.full||img?.src||'';
    image.alt=img?.alt||'游戏画面';
    if(caption)caption.textContent=shot.dataset.caption||img?.alt||'';
    const counter=lightbox.querySelector('.lightbox-counter');
    if(counter)counter.textContent=String(current+1).padStart(2,'0')+' / '+String(shots.length).padStart(2,'0');
  };

  shots.forEach((shot,i)=>{
    shot.dataset.interactive='true';
    shot.addEventListener('click',()=>{current=i;setTimeout(()=>sync(i),0)});
  });

  const fig=lightbox.querySelector('figure');
  if(fig&&!fig.querySelector('.interactive-lightbox-controls')){
    const controls=document.createElement('div');
    controls.className='interactive-lightbox-controls';
    controls.innerHTML='<button type="button" data-gallery-prev aria-label="上一张">← 上一张</button><span class="lightbox-counter">01 / '+String(shots.length).padStart(2,'0')+'</span><button type="button" data-gallery-next aria-label="下一张">下一张 →</button><a href="/play">▶ 进入试玩</a>';
    fig.appendChild(controls);
    controls.querySelector('[data-gallery-prev]').addEventListener('click',e=>{e.stopPropagation();sync(current-1)});
    controls.querySelector('[data-gallery-next]').addEventListener('click',e=>{e.stopPropagation();sync(current+1)});
  }

  addEventListener('keydown',e=>{
    if(!lightbox.classList.contains('open'))return;
    if(e.key==='ArrowLeft'){e.preventDefault();sync(current-1)}
    if(e.key==='ArrowRight'){e.preventDefault();sync(current+1)}
  });

  document.querySelectorAll('.world-card').forEach(card=>{
    card.addEventListener('pointerenter',()=>card.setAttribute('aria-description','点击切换场景，继续浏览无阴镇'));
  });
})();

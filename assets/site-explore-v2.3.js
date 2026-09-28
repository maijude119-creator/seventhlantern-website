(() => {
  const lightboxOpen=(src,caption,alt)=>{
    const box=document.getElementById('mediaLightbox'),img=document.getElementById('lightboxImage'),cap=document.getElementById('lightboxCaption');
    if(!box||!img||!src)return;img.src=src;img.alt=alt||caption||'游戏画面';if(cap)cap.textContent=caption||'';box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open');
  };

  const world=document.getElementById('worldTrack');
  if(world&&!document.querySelector('.chapter-explorer')){
    const cards=[...world.querySelectorAll('.world-card')];
    const copy=[
      ['无面戏楼','第一幕 · 旧声','锣声、戏单与没有脸的旧角色。这里更强调对话、线索与“谁在说真话”的不安感。','戏楼不是单纯的背景，它是阿砚第一次真正意识到：无阴镇里的怪谈彼此相连。',['对话','线索','戏台异象'],['剧情推进更强','角色信息开始互相印证','适合从实机画面继续深入']],
      ['倒悬竹寺','第二幕 · 灯印','钟声倒置，水面记住另一个方向。提灯在这里从氛围道具变成真正的解谜规则。','玩家需要观察灯印、机关与空间关系，不是一路清怪。',['机关','灯印','环境谜题'],['玩法差异最明显','强调观察与顺序','能体现“灯就是规则”']],
      ['逆流古渡','第三幕 · 溯行','名签泡在水里，倒影先于名字开口。这里把探索从“看见”推进到“判断怎么走”。','古渡承担的是旅程感：玩家在行进和选择中逐渐逼近自己的来处。',['探索','路径判断','残片追索'],['节奏更安静','强调方向与痕迹','承接中段剧情']],
      ['幽都纸城','第四幕 · 归位','墓灯与纸拓替失去名字的人归位。战斗压力和叙事信息在这一幕同时升高。','纸城更危险，但重点不是单纯加难度，而是让世界开始逼近核心秘密。',['战斗','追索','纸城叙事'],['视觉强度提升','敌人与角色线索交织','衔接终章']],
      ['第七灯域','终幕 · 照见','影、声、名、位最终落向同一个人。这里是官网场景区的压轴，也是故事真正收束的位置。','它应该让玩家明确感受到：继续往前就会碰到真相、Boss 与最终选择。',['终章','真相','Boss 对决'],['终章压轴','最高叙事密度','最直接通向试玩']]
    ];
    const data=cards.map((c,i)=>{const img=c.querySelector('img');const d=copy[i]||copy[copy.length-1];return{name:c.dataset.name||d[0],stage:d[1],summary:d[2],detail:d[3],tags:d[4],points:d[5],src:img?.src||'',alt:img?.alt||d[0]}});
    if(data.length){
      world.classList.add('explorer-source');document.getElementById('worldDots')?.setAttribute('hidden','');
      const root=document.createElement('div');root.className='chapter-explorer';
      root.innerHTML='<aside class="explorer-nav"><div class="explorer-head"><div><small>CHAPTER SELECT</small><strong>章节探索</strong></div><span>'+data.length+' SCENES</span></div><div class="explorer-list" role="tablist"></div></aside><article class="explorer-stage"><div class="explorer-visual"><img alt=""><div class="explorer-overlay"><div class="explorer-top"><span class="explorer-code"></span><span class="explorer-interact" aria-hidden="true"></span></div><div class="explorer-title"><small>THE JOURNEY</small><h3></h3></div></div></div><div class="explorer-body"><div class="explorer-story"><p class="summary"></p><p class="detail"></p><div class="explorer-actions"><a class="primary" href="/play">进入在线试玩</a><button type="button" class="show-shot">查看这一幕</button><a href="#media">继续看实机</a></div></div><aside class="explorer-meta"><section><h4>玩法标签</h4><div class="explorer-tags"></div></section><section><h4>这一幕能看到什么</h4><ul></ul></section></aside></div></article>';
      world.after(root);
      const list=root.querySelector('.explorer-list'),stage=root.querySelector('.explorer-stage'),image=root.querySelector('.explorer-visual img'),title=root.querySelector('h3'),code=root.querySelector('.explorer-code'),summary=root.querySelector('.summary'),detail=root.querySelector('.detail'),tags=root.querySelector('.explorer-tags'),points=root.querySelector('.explorer-meta ul');
      let active=0;
      const render=i=>{active=(i+data.length)%data.length;const d=data[active];stage.classList.add('switching');[...list.children].forEach((b,n)=>{b.classList.toggle('active',n===active);b.setAttribute('aria-selected',String(n===active))});setTimeout(()=>{image.src=d.src;image.alt=d.alt;title.textContent=d.name;code.textContent=(active===data.length-1?'FINAL':'CH '+String(active+1).padStart(2,'0'))+' · '+d.stage;summary.textContent=d.summary;detail.textContent=d.detail;tags.innerHTML=d.tags.map(x=>'<span>'+x+'</span>').join('');points.innerHTML=d.points.map(x=>'<li>'+x+'</li>').join('');stage.classList.remove('switching')},90)};
      data.forEach((d,i)=>{const b=document.createElement('button');b.type='button';b.className='explorer-tab';b.setAttribute('role','tab');b.innerHTML='<small>'+d.stage+'</small><b>'+d.name+'</b><span>'+d.tags.join(' · ')+'</span>';b.onclick=()=>render(i);list.appendChild(b)});
      const show=()=>{const d=data[active];lightboxOpen(d.src,d.name+' · '+d.stage,d.alt)};root.querySelector('.show-shot').onclick=show;root.querySelector('.explorer-visual').onclick=show;render(0);
    }
  }

  const castGrid=document.querySelector('.cast-grid');
  if(castGrid&&!document.querySelector('.cast-explorer')){
    const cards=[...castGrid.querySelectorAll('.cast-card')];
    const extra={
      '阿砚':{label:'主角 · 纸身提灯',desc:'纸扎铺学徒，也是玩家真正跟随的人。第七盏灯维持着他的存在，却也一步步把他带向自己不愿面对的来处。',quote:'“如果灯灭了，我还算是我吗？”',tags:['主角','纸身','提灯','裁魂尺'],points:['探索、解谜与战斗都围绕他的处境展开','二周目会出现额外回响','玩家最终要面对他的身份真相']},
      '沈婆':{label:'NPC · 知情者',desc:'把阿砚养大的人。她看似一直在保护阿砚，却比任何人都更早知道第七盏灯为何不该亮。',quote:'“有些话不是不说，是说了，你就回不了头了。”',tags:['NPC','旧事','守秘人'],points:['承担关键剧情信息','与阿砚的过去直接相关','不同进度下对话含义会变化']},
      '无名客':{label:'NPC · 被剥离的影',desc:'他像一个被世界删掉名字的人，也像阿砚一路上不断追赶的另一部分自己。',quote:'“你一直在找我，可你真的想知道我是谁吗？”',tags:['NPC','影','身份线索'],points:['会在不同区域留下痕迹','与“影、声、名、位”有关','二周目会出现额外回应']},
      '纸扎怪':{label:'敌人 · 怨念纸身',desc:'纸身被怨念和残留执念牵动的怪物。攻击前会留下可以被读懂的动作与视觉预兆。',quote:'“它们不是突然扑过来——你其实一直有机会看懂。”',tags:['敌人','战斗','攻击预兆'],points:['强调可读性而非无提示伤害','不同状态有明显动作前摇','承担基础与组合战斗压力']},
      '百口灯妖':{label:'BOSS · 灯域异变',desc:'灯火、口舌与被遗忘的名字缠成的巨大怪物。它不是单纯的终点怪物，而是终章规则被彻底扭曲后的结果。',quote:'“每一张嘴都在叫一个名字，可没有一个是在叫它自己。”',tags:['BOSS','终章','多阶段','回响相'],points:['拥有多阶段战斗变化','二周目可进入专属“回响相”','与终章选择和隐藏内容直接相连']}
    };
    const data=cards.map((c,i)=>{const img=c.querySelector('img'),name=c.querySelector('h3')?.textContent?.trim()||('角色 '+(i+1)),base=c.querySelector('p')?.textContent?.trim()||'',small=c.querySelector('small')?.textContent?.trim()||'';return{name,src:img?.src||'',alt:img?.alt||name,base,small,...(extra[name]||{label:small,desc:base,quote:'',tags:[small],points:['角色资料持续补充中']})}});
    if(data.length){
      castGrid.classList.add('explorer-source');
      const root=document.createElement('div');root.className='cast-explorer';
      root.innerHTML='<aside class="cast-nav"><div class="explorer-head"><div><small>CHARACTER FILE</small><strong>无阴镇人物档案</strong></div><span>'+data.length+' FILES</span></div><div class="cast-list" role="tablist"></div></aside><article class="cast-stage"><div class="cast-visual"><img alt=""><div class="cast-overlay"><div class="cast-top"><span class="cast-code"></span></div><div class="cast-title"><small>WHO YOU MEET</small><h3></h3><div class="cast-roleline"></div></div></div></div><div class="cast-body"><div class="cast-story"><p class="cast-desc"></p><div class="cast-quote"></div><div class="cast-signature"><i></i><span>第7盏灯 · 人物档案</span></div><div class="cast-actions"><button type="button" class="primary show-character">查看角色画面</button><a href="/play">在游戏中遇见</a><a href="#world">返回章节</a></div></div><aside class="cast-meta"><section><h4>角色关键词</h4><div class="cast-tags"></div></section><section><h4>与你的旅程有什么关系</h4><ul></ul></section></aside></div></article>';
      castGrid.after(root);
      const list=root.querySelector('.cast-list'),stage=root.querySelector('.cast-stage'),image=root.querySelector('.cast-visual img'),title=root.querySelector('.cast-title h3'),code=root.querySelector('.cast-code'),desc=root.querySelector('.cast-desc'),quote=root.querySelector('.cast-quote'),roleline=root.querySelector('.cast-roleline'),tags=root.querySelector('.cast-tags'),points=root.querySelector('.cast-meta ul');
      let active=0;
      const render=i=>{active=(i+data.length)%data.length;const d=data[active];stage.classList.add('switching');[...list.children].forEach((b,n)=>{b.classList.toggle('active',n===active);b.setAttribute('aria-selected',String(n===active))});setTimeout(()=>{image.src=d.src;image.alt=d.alt;title.textContent=d.name;code.textContent='FILE '+String(active+1).padStart(2,'0')+' · '+d.label;desc.textContent=d.desc;quote.textContent=d.quote;roleline.innerHTML=d.tags.slice(0,3).map(x=>'<span>'+x+'</span>').join('');tags.innerHTML=d.tags.map(x=>'<span>'+x+'</span>').join('');points.innerHTML=d.points.map(x=>'<li>'+x+'</li>').join('');stage.classList.remove('switching')},90)};
      data.forEach((d,i)=>{const b=document.createElement('button');b.type='button';b.className='cast-tab';b.setAttribute('role','tab');b.innerHTML='<small>'+d.label+'</small><b>'+d.name+'</b><span>'+d.base+'</span>';b.onclick=()=>render(i);list.appendChild(b)});
      root.querySelector('.show-character').onclick=()=>{const d=data[active];lightboxOpen(d.src,d.name+' · '+d.label,d.alt)};root.querySelector('.cast-visual').onclick=()=>{const d=data[active];lightboxOpen(d.src,d.name+' · '+d.label,d.alt)};render(0);
    }
  }
})();
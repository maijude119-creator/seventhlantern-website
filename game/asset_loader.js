"use strict";
(() => {
  function create({
    files,
    startupKeys,
    concurrency=4,
    deferredConcurrency=2,
    deferredDelay=2500,
    images=Object.create(null),
    onError=()=>{}
  }){
    const startupSet=new Set(startupKeys||Object.keys(files));
    const startupQueue=[],deferredQueue=[];
    for(const entry of Object.entries(files)){
      (startupSet.has(entry[0])?startupQueue:deferredQueue).push(entry);
    }
    let loaded=0,failed=0,startupLoaded=0,startupFailed=0;
    let startupActive=0,deferredActive=0,deferredScheduled=false;

    const idle=fn=>{
      if(typeof requestIdleCallback==="function")requestIdleCallback(fn,{timeout:1200});
      else setTimeout(fn,40);
    };
    const scheduleDeferred=()=>{
      if(deferredScheduled||!deferredQueue.length)return;
      deferredScheduled=true;
      setTimeout(pumpDeferred,deferredDelay);
    };
    const load=(entry,startup,settled)=>{
      const [id,src]=entry,img=new Image();images[id]=img;
      const finish=ok=>{
        if(ok){loaded++;if(startup)startupLoaded++;}
        else{failed++;if(startup)startupFailed++;onError(src);}
        settled();
      };
      img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;
    };
    const pumpStartup=()=>{
      while(startupActive<concurrency&&startupQueue.length){
        startupActive++;
        load(startupQueue.shift(),true,()=>{
          startupActive--;pumpStartup();
          if(!startupQueue.length&&!startupActive)scheduleDeferred();
        });
      }
      if(!startupQueue.length&&!startupActive)scheduleDeferred();
    };
    function pumpDeferred(){
      while(deferredActive<deferredConcurrency&&deferredQueue.length){
        deferredActive++;
        load(deferredQueue.shift(),false,()=>{
          deferredActive--;
          if(deferredQueue.length)idle(pumpDeferred);
        });
      }
    }
    const ready=id=>!!images[id]?.complete&&images[id].naturalWidth>0;
    const getStatus=()=>({
      loaded,total:Object.keys(files).length,failed,
      startupLoaded,startupTotal:startupSet.size,startupFailed,
      ready:startupLoaded>=startupSet.size&&startupFailed===0,
      allReady:loaded>=Object.keys(files).length&&failed===0,
      missing:[...startupSet].filter(key=>!ready(key))
    });
    if(typeof Image!=="undefined")pumpStartup();
    return{images,ready,getStatus};
  }
  window.GameAssetLoader={create};
})();

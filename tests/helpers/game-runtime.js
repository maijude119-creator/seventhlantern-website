const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const CombatFX=require('../../game/combat_fx');
// Only browser I/O is stubbed; the complete production game runs unchanged.
module.exports=function runtime(options={}){
 const noop=()=>{};
 const ctx=new Proxy({measureText:()=>({width:80}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
 const nodes=new Map();
 const element=()=>({classList:{add:noop,remove:noop,toggle:noop},style:{},dataset:{},addEventListener:noop,getContext:()=>ctx,appendChild:noop,setAttribute:noop});
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},querySelectorAll:()=>[],createElement:element,body:element(),addEventListener:noop};
 const storage=new Map();
 const window={document,CombatFX:options.CombatFX===undefined?CombatFX:options.CombatFX,innerWidth:1280,innerHeight:720,location:{search:''},addEventListener:noop,matchMedia:()=>({matches:!!options.reducedMotion,addEventListener:noop})};
 const sandbox={window,document,console,URLSearchParams,performance:{now:()=>0},requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 vm.createContext(sandbox);
 vm.runInContext(options.source || fs.readFileSync(path.join(__dirname,'../../game/game.js'),'utf8'),sandbox,{filename:'game.js'});
 return {run:code=>vm.runInContext(code,sandbox),window,ctx,storage};
};

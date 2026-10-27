const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../entrance.js'),'utf8');
const scene=require('../entrance-scene.js');
function setup(reduced=false,width=1280,height=800){
  let cb;const timers=new Map();let timer=0;const events={};
  const classes=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)}};
  const document={activeElement:null,addEventListener:(k,f)=>events[k]=f};
  const el=()=>({hidden:false,inert:false,classList:classes(),events:{},addEventListener(k,f){this.events[k]=f},focus(){document.activeElement=this}});
  const overlay=el(),shell=el(),skip=el(),replay=el(),body=el();overlay.hidden=true;document.body=body;document.activeElement=body;
  overlay.contains=x=>x===overlay;
  let draws=0;
  const ctx=new Proxy({measureText:s=>({width:s.length*5})},{get:(o,k)=>o[k]||(()=>{draws++}),set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx};
  document.querySelector=s=>({'.entrance':overlay,'.entrance-canvas':canvas,'.shell':shell,'.entrance-skip':skip,'.entrance-replay':replay}[s]);
  const media={matches:reduced,addEventListener:(k,f)=>media.change=f};
  const sandbox={document,matchMedia:()=>media,innerWidth:width,innerHeight:height,devicePixelRatio:2,performance:{now:()=>0},scrollTo(){},addEventListener:(k,f)=>events[k]=f,requestAnimationFrame:f=>(cb=f,1),cancelAnimationFrame:()=>{cb=null},setTimeout:(f,ms)=>(timers.set(++timer,{f,ms}),timer),clearTimeout:id=>timers.delete(id)};
  sandbox.window={PortfolioEntrance:scene};vm.runInNewContext(source,sandbox);
  return {overlay,shell,skip,replay,body,media,events,frame:ms=>cb?.(ms),timers,draws:()=>draws};
}
for(const size of [[1280,800],[390,844],[844,390]]){
  const t=setup(false,...size);assert(!t.overlay.hidden&&t.shell.inert);
  for(let beat=0;beat<86;beat+=.25)t.frame(beat*scene.BEAT_MS);
  assert(t.draws()>100);assert(t.shell.inert);t.frame(scene.durationMs+1);assert(!t.shell.inert);assert(!t.body.classList.contains('is-entering'));
  for(const v of [...t.timers.values()])if(v.ms===680)v.f();assert(t.overlay.hidden);
  t.replay.events.click();assert(t.shell.inert);assert(!t.events.keydown);t.frame(scene.durationMs+1);assert(!t.shell.inert);
}
const r=setup(true);assert(r.overlay.hidden&&!r.shell.inert);r.replay.events.click();assert(r.shell.inert);r.media.change();assert(!r.shell.inert&&r.overlay.hidden);
const w=setup();[...w.timers.values()].find(t=>t.ms===scene.durationMs+3000).f();assert(w.overlay.hidden&&!w.shell.inert);
// Boundary assertions are based on the requested choreography, not render calls.
const state=scene.stateAt,cell=(f,r,c)=>state(f).cells.find(x=>x.r===r&&x.c===c).reveal;
assert(cell(15.5,0,0)>0&&cell(15.5,0,1)===0&&cell(15.5,2,2)===0);
assert(state(20).cells.every(c=>c.reveal===1));
for(let i=0;i<5;i++)assert.deepStrictEqual(state(24+i).cells.filter(c=>c.r===2&&c.reveal===0).map(c=>c.c),Array.from({length:i+1},(_,j)=>j));
assert(cell(29,0,4)===0&&cell(29,0,2)===1&&cell(29,4,4)===1);
assert(cell(30,0,0)===0&&cell(30,0,1)===1);
assert(cell(31.5,4,0)===0&&cell(31.5,4,3)===1);
assert(state(28).corners.length===0);assert(state(35).railReveal===1);
assert(state(39.99).passwordCount===0&&state(40).passwordCount===1);
assert(state(42.5).passwordCount===2&&state(43.49).passwordCount===2&&state(43.5).passwordCount===3);
assert(state(47).passwordBlue&&state(47).passwordVisible&&!state(47.5).passwordVisible&&state(48).passwordVisible&&!state(48.5).passwordVisible);
assert.deepStrictEqual(state(47).rolling,[true,true,false,true,true]);
assert.deepStrictEqual(state(48).rolling,[false,true,true,false,true]);
assert.deepStrictEqual(state(49).rolling,[true,false,true,true,false]);
assert(state(58).greenCount===0&&state(59).greenCount===1&&state(61).greenCount===3&&state(63).greenCount===5);
assert(state(67).railErase===1&&state(67).fan[4].height===155);
assert(state(64.25).fan[4].height>0&&state(64.25).fan[3].height===0);
assert(!state(69).guides&&state(70).fan[4].height===0&&state(72).fan.every(c=>c.height===0));
assert(state(81.99).welcome==='white'&&state(82).welcome==='inverse'&&state(83).welcome==='white'&&state(84).welcome==='green'&&state(85).welcome==='none');
assert(state(0).progress===0&&state(20).progress>.3);
for(const f of [40,42,45.99])assert(state(f).progress===.6);
for(const f of [67,70,72.99])assert(state(f).progress===.9);
assert(state(82).progress===1&&state(84.99).progress===1);
for(let f=.25;f<=85;f+=.25)assert(state(f).progress>=state(f-.25).progress);
console.log('PASS: all stages at desktop/mobile/landscape; completion; replay; reduced motion; timeout recovery; nonlinear progress with 60/90 holds and visible 100.');
console.log('PASS: corner wave; atomic tile removal; text order; password pauses and flashes; rolling masks; GREEN timing; staggered columns; ending beats.');

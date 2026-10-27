const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../entrance.js'),'utf8');
const scene=require('../entrance-scene.js');
function setup(reduced=false,width=1280,height=800){
  let cb;const timers=new Map();let timer=0;const events={};
  const classes=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)}};
  const document={activeElement:null,addEventListener:(k,f)=>events[k]=f};
  const el=()=>({hidden:false,inert:false,classList:classes(),events:{},addEventListener(k,f){this.events[k]=f},focus(){document.activeElement=this}});
  const overlay=el(),shell=el(),main=el(),body=el();overlay.hidden=true;document.body=body;document.activeElement=body;
  overlay.contains=x=>x===overlay;
  let draws=0;
  const ctx=new Proxy({measureText:s=>({width:s.length*5})},{get:(o,k)=>o[k]||(()=>{draws++}),set:(o,k,v)=>(o[k]=v,true)});
  const canvas={getContext:()=>ctx};
  document.querySelector=s=>({'.entrance':overlay,'.entrance-canvas':canvas,'.shell':shell,'#main':main}[s]);
  const media={matches:reduced,addEventListener:(k,f)=>media.change=f};
  const sandbox={document,matchMedia:()=>media,innerWidth:width,innerHeight:height,devicePixelRatio:2,performance:{now:()=>0},scrollTo(){},addEventListener:(k,f)=>events[k]=f,requestAnimationFrame:f=>(cb=f,1),cancelAnimationFrame:()=>{cb=null},setTimeout:(f,ms)=>(timers.set(++timer,{f,ms}),timer),clearTimeout:id=>timers.delete(id)};
  sandbox.window={PortfolioEntrance:scene};vm.runInNewContext(source,sandbox);
  return {overlay,shell,main,body,media,events,frame:ms=>cb?.(ms),timers,draws:()=>draws};
}
for(const size of [[1280,800],[390,844],[844,390]]){
  const t=setup(false,...size);assert(!t.overlay.hidden&&t.shell.inert);
  for(let beat=0;beat<scene.T.end;beat+=.25)t.frame(beat*scene.BEAT_MS);
  assert(t.draws()>100);assert(t.shell.inert);t.frame(scene.durationMs+1);assert(!t.shell.inert);assert(!t.body.classList.contains('is-entering'));
  for(const v of [...t.timers.values()])if(v.ms===680)v.f();assert(t.overlay.hidden);
  t.events.pageshow({persisted:true});assert(t.shell.inert);assert(!t.events.keydown);t.frame(scene.durationMs+1);assert(!t.shell.inert);
}
// Every fresh document (including reload) starts even with reduced motion set.
for(const reduced of [false,true])for(let load=0;load<2;load++){
  const r=setup(reduced);assert(!r.overlay.hidden&&r.shell.inert);
  r.frame(scene.durationMs+1);assert(!r.shell.inert);
  r.events.pageshow({persisted:true});assert(!r.overlay.hidden&&r.shell.inert);
  r.frame(scene.durationMs+1);assert(!r.shell.inert);
  r.events.pageshow({persisted:true});assert(r.shell.inert);
}
const w=setup();[...w.timers.values()].find(t=>t.ms===scene.durationMs+3000).f();assert(w.overlay.hidden&&!w.shell.inert);
// Boundary assertions are based on the requested choreography, not render calls.
const state=scene.stateAt,cell=(f,r,c)=>state(f).cells.find(x=>x.r===r&&x.c===c).reveal;
assert(cell(15.5,0,0)>0&&cell(15.5,0,1)===0&&cell(15.5,2,2)===0);
assert(state(20).cells.every(c=>c.reveal===1));
for(let i=0;i<5;i++)assert.deepStrictEqual(state(24+i*.5).cells.filter(c=>c.r===2&&c.reveal===0).map(c=>c.c),Array.from({length:i+1},(_,j)=>j));
assert(cell(26.5,0,4)===0&&cell(26.5,0,2)===1&&cell(26.5,4,4)===1);
assert(cell(27,0,0)===0&&cell(27,0,1)===1);
assert(cell(27.75,4,0)===0&&cell(27.75,4,3)===1);
assert(state(26).corners.length===0);assert(state(31).railReveal===1);
assert(state(35.99).passwordCount===0&&state(36).passwordCount===1);
assert(state(38.5).passwordCount===2&&state(39.49).passwordCount===2&&state(39.5).passwordCount===3);
assert(state(43).passwordBlue&&state(43).passwordVisible&&!state(43.5).passwordVisible&&state(44).passwordVisible&&!state(44.5).passwordVisible);
assert.deepStrictEqual(state(43).rolling,[true,true,false,true,true]);
assert.deepStrictEqual(state(43.5).rolling,[false,true,true,false,true]);
assert.deepStrictEqual(state(44).rolling,[true,false,true,true,false]);
assert(state(54).greenCount===0&&state(55).greenCount===1&&state(57).greenCount===3&&state(59).greenCount===5);
assert(state(63).railErase===1&&state(63).fan[4].height===155);
assert(state(60.25).fan[4].height>0&&state(60.25).fan[3].height===0);
assert(!state(65).guides&&state(65.5).guides&&!state(66).guides);
assert(!state(66).checks&&state(66.5).checks&&!state(67).checks);
assert(state(66).fan[4].height===0&&state(68).fan.every(c=>c.height===0));
assert(state(77.99).welcome==='white'&&state(78).welcome==='inverse'&&state(78.49).welcome==='inverse'&&state(78.5).welcome==='white'&&state(78.99).welcome==='white'&&state(79).welcome==='green'&&state(79.49).welcome==='green'&&state(79.5).welcome==='none');
assert(state(0).progress===0&&state(20).progress>.3);
for(const f of [36,38,41.99])assert(state(f).progress===.6);
for(const f of [63,66,68.99])assert(state(f).progress===.9);
assert(state(78).progress===1&&state(79.49).progress===1);
for(let f=.25;f<=85;f+=.25)assert(state(f).progress>=state(f-.25).progress);
function welcomeBackground(beat){
  const rectangles=[];
  const ctx=new Proxy({measureText:s=>({width:s.length*6}),fillRect(...box){rectangles.push({box,color:this.fillStyle});}},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  scene.render(ctx,1280,800,beat);
  return rectangles.find(r=>r.box[1]===-9&&r.box[3]===18);
}
const white=welcomeBackground(78),green=welcomeBackground(79);
assert.deepStrictEqual(white.box,green.box);assert(white.color!==green.color);
assert(!source.includes('entrance-replay'));
console.log('PASS: all stages at desktop/mobile/landscape; completion; automatic playback; reduced motion; timeout recovery; nonlinear progress with 60/90 holds and visible 100.');
console.log('PASS: corner wave; atomic tile removal; text order; password pauses and flashes; rolling masks; GREEN timing; staggered columns; ending beats.');

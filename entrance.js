/* Original canvas choreography inspired by the supplied reference.
   No video, third-party libraries, or network resources are loaded. */
(() => {
  'use strict';
  const overlay = document.querySelector('.entrance');
  const canvas = document.querySelector('.entrance-canvas');
  const shell = document.querySelector('.shell');
  const skip = document.querySelector('.entrance-skip');
  const replay = document.querySelector('.entrance-replay');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const WHITE = '#f3f3ed', BLACK = '#101010', BLUE = '#182bff', GREEN = '#a3ff77';
  let width = 0, height = 0, start = 0, raf = 0, watchdog = 0, exitTimer = 0;
  let running = false, lastFocus = null, elapsed = 0;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function rect(x, y, w, h, color = WHITE) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function line(x, y, X, Y, color = WHITE, weight = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X, Y); ctx.stroke();
  }
  function text(value, x, y, size = 9, color = WHITE, align = 'center') {
    ctx.fillStyle = color; ctx.font = `500 ${size}px "Courier New", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y);
  }
  function hud(t) {
    const margin = width < 600 ? 24 : 48;
    text('CA / PERSONAL ARCHIVE', margin, 32, 9, '#777', 'left');
    text('INTRO SEQUENCE', width - margin, 32, 9, '#777', 'right');
    const count = 28, unit = Math.min(10, (width - 80) / count), x = width / 2 - count * unit / 2;
    const y = height - (width < 600 ? 110 : 72);
    for (let i = 0; i < count; i++) {
      ctx.strokeStyle = '#2e2e2e'; ctx.lineWidth = .6; ctx.strokeRect(x + i * unit, y, unit, 17);
      if (i < t / 8.2 * count) rect(x + i * unit + 3, y + 6, 2, 5, i % 4 === 0 ? WHITE : '#666');
    }
    text(String(Math.floor(clamp(t / 8.2) * 100)).padStart(3, '0'), x, y - 12, 8, '#9b9b9b', 'left');
    text('PORTFOLIO / 001', x + count * unit, y - 12, 8, '#777', 'right');
  }
  function logo(t) {
    ctx.globalAlpha = ease(t / .28);
    ctx.save(); ctx.rotate(-.09); text('CA', 0, -8, 48); ctx.restore();
    text('CAICAIZI', 0, 30, 10); text('PERSONAL PORTFOLIO', 0, 44, 5, '#888');
    if (t > .55) {
      const p = ease((t - .55) / .45), d = 42 + p * 36;
      for (const x of [-d, d]) { rect(x - 4, -80 * p, 8, 17); rect(x - 4, 80 * p - 17, 8, 17); line(x, -63 * p, x, 63 * p, '#777'); }
      for (let i = -1; i <= 1; i++) line(i * 28, -80 * p, i * 28, -50 * p, '#aaa');
    }
    ctx.globalAlpha = 1;
  }
  function grid(t) {
    const cell = 31, size = cell * 5;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const stagger = ease((t - (r + c) * .035) / .35);
      const x = (c - 2.5) * cell, y = (r - 2.5) * cell;
      rect(x + (1 - stagger) * 12, y, (cell - 1) * stagger, cell - 1);
    }
    if (t > .48) { text('C', -62, -62, 10, BLACK); text('A', 62, -62, 10, BLACK); text('0', -62, 62, 10, BLACK); text('1', 62, 62, 10, BLACK); }
    if (t > .85) {
      const cut = ease((t - .85) / .4); rect(-size / 2 - 1, -15.5, (size + 2) * cut, 31, BLACK);
      if (cut > .9) text('P O R T F O L I O', 0, 0, 7);
    }
  }
  function system(t) {
    const cell = 31;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (r === 2 || ((r === 0 || r === 4) && c % 2 === 0)) continue;
      rect((c - 2.5) * cell, (r - 2.5) * cell, 30, 30);
    }
    ['S','Y','S'].forEach((v,i)=>text(v,(i-1)*62,-62,10));
    ['T','E','M'].forEach((v,i)=>text(v,(i-1)*62,62,10));
    text('P O R T F O L I O',0,0,7);
    for (const x of [-92,92]) {
      rect(x-5,-77,10,155);
      ctx.save();ctx.translate(x,0);ctx.rotate(-Math.PI/2);text('CAICAIZI / CREATIVE ARCHIVE',0,0,6,BLACK);ctx.restore();
    }
    text('IDEAS BECOME REAL',0,108,5,'#777');
    const n = Math.min(5,Math.floor(t/.16));
    for(let i=0;i<n;i++) text('*',(i-2)*31,32,24,BLACK);
    if(t>.8) {
      const p=ease((t-.8)/.45);rect(-77,48,155,30*p,BLUE);
      ['C','A'].forEach((v,i)=>{rect(-69+i*111,-48,27,27,BLACK);text(v,-55+i*111,-34,23);});
    }
  }
  function mosaic(t) {
    const size=76;
    for (let q=0;q<4;q++) {
      const x=q%2?4:-80,y=q<2?-80:4;
      rect(x,y,size,size,BLUE);
      ctx.save();ctx.translate(x+size/2,y+size/2);ctx.rotate(Math.floor(t*5+q)*Math.PI/2);
      if(q===1) text(t>.45?'+':'/',0,0,46);
      else for(let j=0;j<4;j++) {ctx.beginPath();ctx.arc((j%2?1:-1)*19,(j<2?-1:1)*19,18,0,Math.PI*2);ctx.fillStyle=WHITE;ctx.fill();}
      ctx.restore();
    }
    rect(-80,-8,160,16,BLACK);text('C A I C A I Z I',0,0,7);
    for(const x of [-92,92]) {rect(x-4,-80,8,160);ctx.save();ctx.translate(x,0);ctx.rotate(-Math.PI/2);text('PERSONAL PORTFOLIO / 001',0,0,5,BLACK);ctx.restore();}
  }
  function fan(t) {
    const p=clamp(t/1.15), turn=Math.cos(p*Math.PI*2);
    for(let i=0;i<5;i++) {
      const h=85+(turn>0?i:4-i)*29, x=(i-2.5)*40;
      rect(x,-h/2,39,h);
    }
    for(let i=0;i<5;i++) {text('CHECK '+String(i+1).padStart(2,'0'),-127,-34+i*16,5,'#aaa','right');text('READY',-120,-34+i*16,5,GREEN,'left');}
    line(0,-height/2,0,-150,WHITE);line(0,150,0,height/2,WHITE);
    text('+',0,-144,15,GREEN);text('+',0,144,15,GREEN);
  }
  function wire(t) {
    ctx.strokeStyle='#363a35';ctx.lineWidth=.7;
    const p=ease(t), drift=p*width*.25;
    for(let k=0;k<16;k++) {
      ctx.beginPath();
      for(let j=0;j<=6;j++) {
        const angle=j*Math.PI/3+k*.025, radius=85+k*20;
        const x=-width*.53+Math.cos(angle)*radius+drift;
        const y=Math.sin(angle)*radius*.7+50;
        j?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }ctx.stroke();
    }
  }
  function draw(t) {
    ctx.globalAlpha=1;rect(0,0,width,height,BLACK);hud(t);
    ctx.save();ctx.translate(width/2,height*.47);
    const scale=Math.min(1.2,Math.max(.75,width/1100),height/620);ctx.scale(scale,scale);
    if(t<1) logo(t);
    else if(t<2.5) grid(t-1);
    else if(t<4) system(t-2.5);
    else if(t<5.2) mosaic(t-4);
    else if(t<6.4) fan(t-5.2);
    else if(t<7.35) {ctx.globalAlpha=Math.min(ease((t-6.4)/.2),clamp((7.35-t)/.2));text('Welcome to my world.',0,-10,15);text('CAICAIZI',0,17,9,'#999');}
    else wire(t-7.35);
    ctx.restore();ctx.globalAlpha=1;
  }
  function finish(immediate=false) {
    if(!running)return;
    running=false;cancelAnimationFrame(raf);clearTimeout(watchdog);
    shell.inert=false;document.body.classList.remove('is-entering');overlay.classList.add('is-leaving');
    if(overlay.contains(document.activeElement)) (lastFocus && lastFocus !== document.body ? lastFocus : replay).focus({preventScroll:true});
    const hide=()=>{overlay.hidden=true;overlay.classList.remove('is-leaving');};
    if(immediate||reduce.matches)hide();else exitTimer=setTimeout(hide,680);
  }
  function frame(now) {
    if(!running)return;
    elapsed=(now-start)/1000;
    try {draw(elapsed);if(elapsed>=8.2)finish();else raf=requestAnimationFrame(frame);}catch {finish(true);}
  }
  function begin(manual=false) {
    if(running)return;
    clearTimeout(exitTimer);
    if(reduce.matches && !manual)return;
    lastFocus=document.activeElement;resize();overlay.hidden=false;overlay.classList.remove('is-leaving');
    shell.inert=true;document.body.classList.add('is-entering');running=true;elapsed=0;
    scrollTo({top:0,behavior:'instant'});draw(0);start=performance.now();
    skip.focus({preventScroll:true});raf=requestAnimationFrame(frame);watchdog=setTimeout(()=>finish(true),11000);
  }
  skip.addEventListener('click',()=>finish());replay.addEventListener('click',()=>begin(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&running)finish();});
  addEventListener('resize',()=>{if(running){resize();draw(elapsed);}});
  reduce.addEventListener('change',()=>{if(reduce.matches)finish(true);});
  replay.hidden=false;
  begin();
})();

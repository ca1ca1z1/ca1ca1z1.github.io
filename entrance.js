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
  const scene = window.PortfolioEntrance;
  if (!scene) return;
  let width = 0, height = 0, start = 0, raf = 0, watchdog = 0, exitTimer = 0;
  let running = false, lastFocus = null, elapsed = 0;
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(seconds) {
    scene.render(ctx, width, height, seconds * 1000 / scene.BEAT_MS);
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
    try {draw(elapsed);if(elapsed*1000>=scene.durationMs)finish();else raf=requestAnimationFrame(frame);}catch {finish(true);}
  }
  function begin(manual=false) {
    if(running)return;
    clearTimeout(exitTimer);
    if(reduce.matches && !manual)return;
    lastFocus=document.activeElement;resize();overlay.hidden=false;overlay.classList.remove('is-leaving');
    shell.inert=true;document.body.classList.add('is-entering');running=true;elapsed=0;
    scrollTo({top:0,behavior:'instant'});draw(0);start=performance.now();
    skip.focus({preventScroll:true});raf=requestAnimationFrame(frame);watchdog=setTimeout(()=>finish(true),scene.durationMs + 3000);
  }
  skip.addEventListener('click',()=>finish());replay.addEventListener('click',()=>begin(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&running)finish();});
  addEventListener('resize',()=>{if(running){resize();draw(elapsed);}});
  reduce.addEventListener('change',()=>{if(reduce.matches)finish(true);});
  replay.hidden=false;
  begin();
})();

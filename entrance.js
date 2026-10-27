/* Original canvas choreography inspired by the supplied reference.
   No video, third-party libraries, or network resources are loaded. */
(() => {
  'use strict';
  // A visit lasts for this tab's session. Mark it before playback so that
  // refreshing or leaving during the animation cannot start it again.
  const visitKey = 'caicaizi:entrance-seen';
  let seen = false, internal = false;
  try {
    seen = sessionStorage.getItem(visitKey) === '1';
    sessionStorage.setItem(visitKey, '1');
  } catch { /* Navigation metadata still prevents replay if storage is blocked. */ }
  try { internal = new URL(document.referrer).origin === location.origin; } catch {}
  const navigation = performance.getEntriesByType?.('navigation')[0]?.type;
  if (seen || internal || navigation === 'reload' || navigation === 'back_forward') return;
  const overlay = document.querySelector('.entrance');
  const canvas = document.querySelector('.entrance-canvas');
  const shell = document.querySelector('.shell');
  const main = document.querySelector('#main');
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
    if(overlay.contains(document.activeElement)) (lastFocus && lastFocus !== document.body && lastFocus !== overlay ? lastFocus : main).focus({preventScroll:true});
    const hide=()=>{overlay.hidden=true;overlay.classList.remove('is-leaving');};
    if(immediate||reduce.matches)hide();else exitTimer=setTimeout(hide,680);
  }
  function frame(now) {
    if(!running)return;
    elapsed=(now-start)/1000;
    try {draw(elapsed);if(elapsed*1000>=scene.durationMs)finish();else raf=requestAnimationFrame(frame);}catch {finish(true);}
  }
  function begin() {
    if(running)return;
    clearTimeout(exitTimer);
    lastFocus=document.activeElement;resize();overlay.hidden=false;overlay.classList.remove('is-leaving');
    shell.inert=true;document.body.classList.add('is-entering');running=true;elapsed=0;
    scrollTo({top:0,behavior:'instant'});draw(0);start=performance.now();
    overlay.focus({preventScroll:true});raf=requestAnimationFrame(frame);watchdog=setTimeout(()=>finish(true),scene.durationMs + 3000);
  }
  addEventListener('resize',()=>{if(running){resize();draw(elapsed);}});
  // Restoring a cached page must never resume or restart the entrance.
  const dismiss = () => {
    finish(true);clearTimeout(exitTimer);overlay.hidden=true;
    overlay.classList.remove('is-leaving');
  };
  addEventListener('pagehide',dismiss);
  addEventListener('pageshow',event=>{if(event.persisted)dismiss();});
  begin();
})();

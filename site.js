/* Page behaviour after the entrance: scroll meter, section tracking and
   evidence links that open their target entry. No dependencies. */
(() => {
  'use strict';
  const CELLS = 28;
  const sections = [...document.querySelectorAll('main > section[id]')];
  const navLinks = new Map([...document.querySelectorAll('.hud-nav a')].map(a => [a.hash.slice(1), a]));
  const cells = document.querySelector('.meter-cells');
  const value = document.querySelector('.meter-value');
  const label = document.querySelector('.meter-label');
  cells.append(...Array.from({length: CELLS}, () => document.createElement('i')));
  const marks = [...cells.children];

  let frame = 0;
  function update() {
    frame = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
    marks.forEach((m, i) => m.classList.toggle('on', i < Math.round(p * CELLS)));
    value.textContent = String(Math.round(p * 100)).padStart(3, '0');
    // Active section: the last one whose top has crossed 40% of the viewport.
    let index = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) index = i; });
    const current = sections[index];
    label.textContent = (current.dataset.label || 'Portfolio').toUpperCase() + ' / ' + String(index).padStart(3, '0');
    navLinks.forEach((a, id) => a.toggleAttribute('aria-current', id === current.id));
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  update();

  // Evidence codes (#P-01, #E-02 …) open and flash their entry.
  function reveal(id) {
    const row = id && document.getElementById(id);
    if (!row || !row.matches('details.row')) return;
    row.open = true;
    row.classList.remove('is-hit'); void row.offsetWidth; row.classList.add('is-hit');
    row.querySelector('summary').focus({preventScroll: true});
  }
  addEventListener('hashchange', () => reveal(decodeURIComponent(location.hash.slice(1))));
  // Re-clicking the current hash fires no hashchange; handle it directly.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && a.hash === location.hash) reveal(decodeURIComponent(a.hash.slice(1)));
  });
  reveal(decodeURIComponent(location.hash.slice(1)));
})();

# Portfolio maintenance rules

Static GitHub Pages site, published from the repository root. No build step, no dependencies, no network resources.

## Identity: animation in pure code
The site's signature, set by the entrance, is front-end animation written entirely in code.
- Build motion with Canvas 2D, CSS and plain JavaScript only. No video, GIF, Lottie, animation or WebGL libraries, and no pre-rendered frames.
- Prefer **interactive** animation. Backgrounds may respond to what the visitor does: pointer movement, click/tap, wheel, scroll, keyboard focus. Each input should produce a distinct, legible response.
- Keep it in the entrance's language: the 31px cell grid, tiles opening from their vertical centreline, waves stepping by Manhattan distance, whole-cell jumps, flashes on a beat.
- Selection is hover or *visible* keyboard focus (`:focus-visible`, `:has(:focus-visible)`), never `:focus-within`: a mouse click focuses a focusable plate, and that must not keep it selected (or hide pointer feedback) after the pointer leaves.
- Animation never costs readability or access:
  - motion behind text stays low-contrast; text sits on solid or near-solid surfaces;
  - two tiers under `prefers-reduced-motion`. Many office, VDI and VM machines report `reduce` by default, so do not simply switch everything off:
    - **full** (no preference): everything;
    - **reduced** (`reduce`): keep only small feedback that answers the pointer or keyboard directly (highlights, readouts, selection markers, state changes), placed instantly with no easing or travel. Drop autonomous motion (idle loops, intro fades), large or travelling motion (waves, trails, rolls, sweeps) and CSS transitions;
  - keyboard input gets the same feedback as pointer input; touch works like mouse;
  - never block navigation, scrolling or clicks (`pointer-events:none`, passive listeners).
- Performance: drive time from `requestAnimationFrame` timestamps, stop the loop when nothing moves, pause when the tab is hidden, cap device pixel ratio at 2, bound particle/pulse counts. Also:
  - one `requestAnimationFrame` per frame for all inputs (inputs only mark what changed); redraw a layer only when its inputs changed (e.g. a scroll-only background never redraws on pointer moves);
  - the pointer marker follows the pointer exactly — no easing on the cursor itself;
  - no `background-attachment: fixed` (put fixed backgrounds on a `position:fixed` layer); no CSS `filter: blur()` that changes per frame, and no canvas `filter` per frame — blur once into a sprite or a composited layer and only move it;
  - in scroll handlers, read all layout first, then write (never interleave reads and writes).
- Keep animation logic testable: export pure geometry/timing functions (UMD pattern as in `entrance-scene.js`, `field.js`) and cover them in `tests/`.

## Palette
`#101010` black · `#f3f3ed` off-white · `#182bff` blue · `#a3ff77` green · `#ff5a1f` orange (interaction: pointer/click feedback, focus, selection). Pages may add their own colours; these five are the site's signature.

## Structure
- `index.html` + `home.css` — home. Its only job: a short description and links to the pages. Keep the entrance hooks (`.entrance`, `.entrance-canvas`, `.shell`, `#main`).
- `field.js` — home background: interactive cell lattice (pointer lens, selection rails, click, wheel, focus, idle). Starts after the entrance ends. Implements both motion tiers. A short home opening (≤1.7 s, full tier) plays on every visit — straight away, or right after the long entrance when that plays: the lattice spreads from the centre as a Manhattan diamond with a ring wave, while `home.css` (`.is-opening`) opens the name and intro line from their centrelines and runs each index tile's strips once. `entrance.js` clears `.is-opening` while it plays; `field.js` sets it again when the entrance ends.
- `tools/stamp.cjs` — writes content-hash `?v=` versions onto asset references.
- `work/`, `experience/`, `capability/`, `record/` — one page each, each with its **own visual style** in its own stylesheet. Do not unify them.
  - Work: evidence board after an event PV — cold grey-white haze, giant blurred ghost grotesk, an acrostic index (titles on a red spine whose letters spell `data-word`, condensed high-contrast serif; keep rows equal to card titles, `tests/work.test.cjs` checks. **When a project is added or removed, choose a new word with exactly one letter per project — each letter must occur in its title, ideally near the middle (`spine()` in `work/work.js` picks it) — then update `data-word` and every row, ordered like the cards. Score candidates for balance as the original MADE was chosen.**), project cards pinned at slight angles, signal red (`#b5121b`); tracking reticle with a thread to the nearest card, click slashes; on scroll the acrostic dissolves (titles in arrival order, red letters last) and the cards sway — straight at the viewport centre, tilting away from it; on wide screens a parallax wall of board debris (scraps, targets, hexes, red slashes, the word's letters) fills the side margins only. Experience: blueprint plate after an event PV — grey-blue drafting paper with a 62px dot grid, cobalt (`#1d44c8`) construction lines, didone display serif with mirrored capitals, numbered plates on a rig line; pointer compass, cobalt flood with echo frames, halo that breaks into shards, datamosh tear opening. Capability: green instrument readout on graph paper. Record: operator file after an event PV — letterboxed black bands, warm paper, tight bold grotesk, black slabs with reversed type, acid-yellow (`#c8d63a`) trajectory arcs, altitude ruler.
- A page may have its own opening and background script (e.g. `record/record.js`, `experience/experience.js`, `work/work.js`). Openings stay under 2 s, play only in the full motion tier, never hide content when scripts fail, and follow the same tier, performance and testing rules as `field.js`.
- `assets/base.css` — shared structure only (reset, page bar, focus, skip link). No page colours here; pages set `--bg`, `--fg`, `--focus`, `--edge`.
- `entrance.js`, `entrance-scene.js`, `entrance.css` — opening animation; plays on the home page only. Do not change its choreography unless asked.
- `404.html` — standalone; keep as is.

## Content rules
- Visitor-facing text is English. Audience is recruiters and professionals: no taglines, no instructional copy, no filler labels.
- Work entries use ids `P-01, P-02, …`; experience uses `E-01, …`. Sequential and unique.
- Capability evidence links point to `../work/#P-xx` or `../experience/#E-xx` and must exist. No self-ratings; empty evidence is intentional.
- When entries are added or removed, update the count on the home index (`class="c"`).

## Readability
- No text below 14px; body copy 17px. Keep text/background contrast at WCAG AA or better.
- Pages work at 375px width without horizontal scrolling.

## Caching
GitHub Pages caches assets for 10 minutes. Every local `.css`/`.js` reference in a page carries `?v=<content hash>`; never edit these by hand. After changing any asset run `node tools/stamp.cjs`. `tests/site.test.cjs` fails if a version is stale.

## Checks
Run before committing:

```
node tools/stamp.cjs
node tests/entrance.test.cjs
node tests/field.test.cjs
node tests/record.test.cjs
node tests/experience.test.cjs
node tests/work.test.cjs
node tests/site.test.cjs
```

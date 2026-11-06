# Portfolio maintenance rules

Static GitHub Pages site, published from the repository root. No build step, no dependencies, no network resources.

## Structure
- `index.html` + `home.css` — home. Its only job: a short description and links to the pages. Keep the entrance hooks (`.entrance`, `.entrance-canvas`, `.shell`, `#main`).
- `work/`, `experience/`, `capability/`, `record/` — one page each, each with its **own visual style** in its own stylesheet. Do not unify them.
  - Work: exhibition catalogue (paper, serif). Experience: signal-blue timeline. Capability: green instrument readout on graph paper. Record: typewriter document on archival paper.
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

## Checks
Run before committing:

```
node tests/entrance.test.cjs
node tests/site.test.cjs
```

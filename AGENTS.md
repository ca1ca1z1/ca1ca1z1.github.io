# Portfolio maintenance rules

Static GitHub Pages site, published from the repository root. No build step, no dependencies, no network resources.

## Files
- `index.html` — the whole site. Content is edited here directly.
- `site.css`, `site.js` — page styling and behaviour (scroll meter, section tracking, evidence links).
- `entrance.js`, `entrance-scene.js`, `entrance.css` — opening animation. Do not change its choreography unless asked; `tests/entrance.test.cjs` pins its timing.
- `404.html` — standalone; keep as is.

## Content rules
- Visitor-facing text is English. Audience is recruiters and professionals: no taglines, no instructional copy, no filler labels.
- Work entries use codes `P-01, P-02, …`; experience uses `E-01, …`. Codes are sequential, unique and match the element `id`.
- Capability rows list only evidence codes that exist. Never add self-ratings. An empty evidence cell is intentional and renders as `—`.
- Keep the design tokens in `site.css` in sync with the entrance colours (`#101010`, `#f3f3ed`, `#182bff`, `#a3ff77`).

## Checks
Run before committing:

```
node tests/entrance.test.cjs
node tests/site.test.cjs
```

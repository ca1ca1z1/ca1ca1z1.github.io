// Structural checks across all pages: links, evidence codes, index counts and the type-size floor.
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const PAGES = ['index.html', 'work/index.html', 'experience/index.html', 'capability/index.html', 'record/index.html'];
const MIN_PX = 14;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

// Entrance hooks live on the home page only.
const home = read('index.html');
for (const hook of ['class="entrance"', 'class="entrance-canvas"', 'class="shell"', 'id="main"'])
  assert(home.includes(hook), 'missing entrance hook ' + hook);

for (const page of PAGES) {
  const html = read(page);
  assert(/<html lang="en">/.test(html), page + ': lang');
  assert(/name="viewport"/.test(html), page + ': viewport');
  assert(/<title>[^<]+<\/title>/.test(html), page + ': title');
  assert(/<main id="main"/.test(html), page + ': main landmark');

  // Every local href and stylesheet resolves to a file, and every #fragment to an id.
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(ref)) continue;
    const [target, hash] = ref.split('#'), clean = target.split('?')[0];
    let file = clean ? path.posix.normalize(path.posix.join(path.posix.dirname(page), clean)) : page;
    if (file.endsWith('/') || file === '.') file = (file === '.' ? '' : file) + 'index.html';
    assert(fs.existsSync(path.join(root, file)), page + ': missing ' + ref);
    if (hash) assert(idsOf(read(file)).has(hash), page + ': no #' + hash + ' in ' + file);
  }

  // Each stylesheet referenced by the page respects the readability floor.
  for (const [, href] of html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)) {
    const css = path.posix.join(path.posix.dirname(page), href);
    if (css.endsWith('entrance.css')) continue;
    for (const [, decl] of read(css).matchAll(/font(?:-size)?:([^;}]+)/g)) {
      const px = decl.match(/(\d+(?:\.\d+)?)px/);
      if (px) assert(Number(px[1]) >= MIN_PX, css + ': font below ' + MIN_PX + 'px → ' + decl.trim());
    }
  }
}

// Cache-busting: every local CSS/JS reference carries ?v=<content hash> (run `node tools/stamp.cjs`).
const stamper = require('../tools/stamp.cjs');
for (const page of stamper.PAGES) {
  if (!fs.existsSync(path.join(root, page))) continue;
  const html = read(page);
  assert.strictEqual(stamper.stamp(page, html), html, page + ': stale ?v= on an asset — run `node tools/stamp.cjs`');
}

// Evidence codes: sequential, unique.
function codes(file, prefix) {
  const list = [...read(file).matchAll(new RegExp('id="(' + prefix + '-(\\d\\d))"', 'g'))].map(m => Number(m[2]));
  list.forEach((n, i) => assert.strictEqual(n, i + 1, file + ': ' + prefix + ' codes must run 01, 02, …'));
  return list.length;
}
const work = codes('work/index.html', 'P'), exp = codes('experience/index.html', 'E');
const skills = [...read('capability/index.html').matchAll(/<tr><(?:th scope="row"[^>]*>[^<]*<\/th><)?td>/g)].length;
const records = [...read('record/index.html').matchAll(/<li[\s>]/g)].length;

// Home index counts match the pages they describe.
const count = slug => Number(home.match(new RegExp('href="\\./' + slug + '/"[\\s\\S]*?class="c">(\\d+)'))[1]);
assert.strictEqual(count('work'), work, 'home: Work count');
assert.strictEqual(count('experience'), exp, 'home: Experience count');
assert.strictEqual(count('capability'), skills, 'home: Capability count');
assert.strictEqual(count('record'), records, 'home: Record count');

console.log(`PASS: ${PAGES.length} pages — links, evidence codes (P ${work}, E ${exp}), index counts, type floor ${MIN_PX}px.`);

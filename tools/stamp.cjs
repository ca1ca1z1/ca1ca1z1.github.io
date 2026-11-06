// Cache-busting: set ?v=<content hash> on every local .css/.js reference in every page.
// GitHub Pages caches assets for 10 minutes; a changed file must change its URL.
// Usage: node tools/stamp.cjs        (rewrites pages in place)
//        require('./tools/stamp.cjs') (exports helpers for tests)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const PAGES = ['index.html', 'work/index.html', 'experience/index.html', 'capability/index.html', 'record/index.html', '404.html'];
const REF = /(href|src)="((?!https?:|mailto:|\/\/)[^"?#]+\.(?:css|js))(?:\?v=[^"]*)?"/g;

// Line endings are normalised so Windows (CRLF) and Linux (LF) checkouts agree on the hash.
const hash = file => crypto.createHash('sha1').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
const resolve = (page, ref) => path.join(root, path.dirname(page), ref);

function stamp(page, html) {
  return html.replace(REF, (_, attr, ref) => `${attr}="${ref}?v=${hash(resolve(page, ref))}"`);
}

if (require.main === module) {
  let changed = 0;
  for (const page of PAGES) {
    const file = path.join(root, page);
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, 'utf8'), after = stamp(page, before);
    if (after !== before) { fs.writeFileSync(file, after); changed++; console.log('stamped ' + page); }
  }
  console.log(changed ? `${changed} page(s) updated.` : 'All asset versions current.');
}
module.exports = {PAGES, REF, hash, resolve, stamp};

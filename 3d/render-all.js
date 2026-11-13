// Re-render every product image the site uses into 3d/png/, then run: python3 3d/convert.py
// Setup (once, in this folder): npm i three@0.160.0 playwright
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'png');
const THREEJS = require.resolve('three/build/three.min.js');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const local = async page => page.route('**/three@0.160.0/**', r => r.fulfill({ path: THREEJS, contentType: 'text/javascript' }));
  const site = await b.newPage(); await local(site);
  await site.goto('file://' + path.join(ROOT, 'index.html'));
  const only = process.argv.slice(2);
  const list = (await site.evaluate(() => window.neededRenders())).filter(x => !only.length || only.includes(x.file));
  const p = await b.newPage(); await local(p);
  await p.goto('file://' + path.join(__dirname, 'render.html')); await p.evaluate(() => window.ready);
  for (const it of list) {
    const url = await p.evaluate(it => renderOne(it.type, it.key, it.opts, it.w, it.h, it.elev), it);
    fs.writeFileSync(path.join(OUT, it.file + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('rendered', list.length); await b.close();
})();

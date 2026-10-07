// Draw the site icons from icons/icon.svg (a first-grade sum, 1 + 2 = ?):
//   favicon.ico (16, 32 and 48 px, for browser tabs), icons/apple-touch-icon.png (180 px, iPhone home screen),
//   icons/icon-192.png and icons/icon-512.png (Android, app install), icons/icon-maskable-512.png (Android round icons).
// Usage: NODE_PATH=$(npm root -g) node tools/make_icons.js   (needs the playwright package)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
// iPhone and Android round off the corners themselves: the green fills the whole square, and for the round icons the
// sum shrinks into the circle that is always shown
const square = svg.replace(/<rect id="tile"[^>]*\/>/, '<rect width="64" height="64" fill="url(#bg)"/>');
const maskable = square.replace('<g id="art"', '<g id="art" transform="translate(32 32) scale(.72) translate(-32 -32)"');
// 16 px tab icon: only "1+2", bigger and in the middle, so it still reads
const small = svg.replace(/<g id="answer">[\s\S]*?<\/g>/, '').replace('<g id="sum">', '<g id="sum" transform="translate(32 32) scale(1.12) translate(-31.4 -18.5)" stroke-width="5.6">');

async function render(page, size, art = svg){
  await page.setViewportSize({width: size, height: size});
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;background:transparent">
    <div style="width:${size}px;height:${size}px">${art.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  return page.screenshot({omitBackground: true, clip: {x: 0, y: 0, width: size, height: size}});
}

// An .ico file holding PNG images (supported by every current browser)
function ico(pngs){
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(([size, png], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p[1])]);
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || undefined});
  const page = await browser.newPage({deviceScaleFactor: 1});
  const out = (name, buf) => { fs.writeFileSync(path.join(ROOT, name), buf); console.log(`${name}: ${buf.length} bytes`); };
  const tab = [];
  for (const s of [16, 32, 48]) tab.push([s, await render(page, s, s <= 16 ? small : svg)]);
  out('favicon.ico', ico(tab));
  out('icons/apple-touch-icon.png', await render(page, 180, square));
  out('icons/icon-192.png', await render(page, 192));
  out('icons/icon-512.png', await render(page, 512));
  out('icons/icon-maskable-512.png', await render(page, 512, maskable));
  await browser.close();
})();

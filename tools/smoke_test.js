// Open every lesson and every game in a headless browser, at phone and tablet sizes and in both languages, and
// report page errors. With an out-dir, it also saves a screenshot of every screen it opens.
// Usage: python3 -m http.server 8765 &   then   NODE_PATH=$(npm root -g) node tools/smoke_test.js [http://localhost:8765/] [out-dir]
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8765/';
const OUT = process.argv[3] || null;

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || undefined});
  const errors = [];
  for (const lang of ['zh', 'en']) for (const vp of [{width: 390, height: 844, name: 'phone'}, {width: 1180, height: 820, name: 'tablet'}, {width: 844, height: 390, name: 'sideways'}]){
    const tag = `${lang}-${vp.name}`;
    const page = await browser.newPage({viewport: {width: vp.width, height: vp.height}, deviceScaleFactor: 1});
    page.on('pageerror', e => errors.push(`[${tag}] pageerror ${page.url()}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`[${tag}] console ${page.url()}: ${m.text()}`); });
    await page.goto(BASE + '?lang=' + lang + '#/', {waitUntil: 'load'});
    if (OUT) await page.screenshot({path: `${OUT}/${tag}-start.png`});
    await page.click('.splash .btn.green');
    await page.waitForTimeout(300);
    if (OUT) await page.screenshot({path: `${OUT}/${tag}-home.png`, fullPage: true});
    const n = await page.evaluate(() => document.querySelectorAll('.lesson-btn').length);
    for (let l = 1; l <= n; l++){
      await page.evaluate(h => { location.hash = h; }, `#/lesson/${l}`);
      await page.waitForTimeout(120);
      if (OUT && vp.name === 'phone' && l % 6 === 1) await page.screenshot({path: `${OUT}/${tag}-lesson${l}.png`, fullPage: true});
      const acts = await page.evaluate(() => [...document.querySelectorAll('.act-card')].length);
      for (let k = 0; k < acts; k++){
        await page.evaluate(k => { document.querySelectorAll('.act-card')[k].click(); }, k);
        await page.waitForTimeout(350);
        // past a learning part, so the first question shows too
        await page.evaluate(() => { document.querySelectorAll('.learn').forEach(c => c.click()); });
        await page.waitForTimeout(150);
        await page.evaluate(() => { const b = document.querySelector('[data-v="__start"]'); if (b && !b.hidden) b.click(); });
        await page.waitForTimeout(300);
        const hash = await page.evaluate(() => location.hash);
        if (OUT) await page.screenshot({path: `${OUT}/${tag}-${hash.replace(/[#/]+/g, '-').replace(/^-/, '')}.png`});
        // nothing may stick out sideways
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (wide > 2) errors.push(`[${tag}] ${hash}: the page is ${wide}px wider than the screen`);
        await page.evaluate(h => { location.hash = h; }, `#/lesson/${l}`);
        await page.waitForTimeout(80);
      }
    }
    for (const h of ['#/stickers', '#/parents']){
      await page.evaluate(h => { location.hash = h; }, h);
      await page.waitForTimeout(200);
      if (OUT) await page.screenshot({path: `${OUT}/${tag}-${h.slice(2)}.png`, fullPage: true});
    }
    // parents page: every setting, a few ticks, then clearing the progress (answering the grown-up sum)
    const segs = await page.evaluate(() => document.querySelectorAll('.seg:not(.lang-seg) button').length);
    for (let k = 0; k < segs; k++){
      await page.evaluate(k => document.querySelectorAll('.seg:not(.lang-seg) button')[k].click(), k);
      await page.waitForTimeout(60);
    }
    for (let k = 0; k < 3; k++){ await page.evaluate(() => document.querySelector('.check-btn').click()); await page.waitForTimeout(60); }
    await page.evaluate(() => [...document.querySelectorAll('.btn.red')].pop().click());
    await page.waitForTimeout(150);
    const prod = await page.evaluate(() => document.querySelector('.gate label').textContent.match(/(\d+) × (\d+)/).slice(1).map(Number).reduce((a, b) => a * b));
    await page.fill('.gate input', '1');
    await page.evaluate(() => document.querySelector('.overlay .btn.red').click());
    await page.waitForTimeout(100);
    await page.fill('.gate input', String(prod));
    await page.evaluate(() => document.querySelector('.overlay .btn.red').click());
    await page.waitForTimeout(200);
    const cleared = await page.evaluate(() => !!document.querySelector('.overlay .big-star') && document.querySelector('.overlay h1').textContent);
    if (!cleared || !/清除|cleared/.test(cleared)) errors.push(`[${tag}] reset did not finish: ${cleared}`);
    await page.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no errors');
  process.exit(errors.length ? 1 : 0);
})();

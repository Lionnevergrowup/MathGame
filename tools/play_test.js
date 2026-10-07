// Play every game of every lesson to the end in a headless browser, answering like a child who knows the answers:
// cards are tapped, shows are watched, answers are found through the page's test hook (window.__quiz), digits are
// traced along their strokes (window.__traceGuide), and pictures are drawn and labelled. Reports page errors,
// games that did not finish, and lines 乐乐 / Leo says without a recorded clip.
// Usage: python3 -m http.server 8765 &   then
//   NODE_PATH=$(npm root -g) node tools/play_test.js [base-url] [lessons, e.g. 1-30] [zh|en|both]
// WRONG=1: before each right answer, tap a wrong one (checks the "try again" paths and the hints)
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8765/';
const [from, to] = (process.argv[3] || '1-30').split('-').map(Number);
const LANGS = (process.argv[4] || 'both') === 'both' ? ['zh', 'en'] : [process.argv[4]];
const WRONG = !!process.env.WRONG;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sel = v => `.stage [data-v="${String(v).replace(/"/g, '\\"')}"]:not(.used):not(.fade)`;

async function tapWrong(page, right){
  const wrong = await page.evaluate(right => [...document.querySelectorAll('.stage [data-v]:not(.used)')].map(b => b.dataset.v).filter(v => !v.startsWith('__') && !right.includes(v)), right);
  if (wrong.length){ await page.click(sel(wrong[0]), {timeout:3000, force:true}).catch(() => {}); await sleep(450); }
}
// trace the current digit along its strokes, as a finger would
async function traceDigit(page){
  for (let guard = 0; guard < 8; guard++){
    const g = await page.evaluate(() => {
      const t = window.__traceGuide, c = document.querySelector('.trace-wrap canvas[aria-label]');
      if (!t || !c) return null;
      const r = c.getBoundingClientRect();
      return {k:t.k, n:t.strokes.length, pts:t.strokes[t.k] ? t.strokes[t.k].pts.map(([x, y]) => [x + r.left, y + r.top]) : null, won:!!document.querySelector('.trace-wrap.win')};
    });
    if (!g || g.won || !g.pts) return !!(g && g.won);
    await page.mouse.move(g.pts[0][0], g.pts[0][1]);
    await page.mouse.down();
    for (let i = 1; i < g.pts.length; i++) await page.mouse.move(g.pts[i][0], g.pts[i][1], {steps:2});
    await page.mouse.up();
    await sleep(120);
  }
  return page.evaluate(() => !!document.querySelector('.trace-wrap.win'));
}

async function playActivity(page, l, key, stats){
  let lastQ = await page.evaluate(() => window.__quiz && window.__quiz.n || 0);
  await page.evaluate(h => { location.hash = h; }, `#/lesson/${l}/${key}`);
  await sleep(250);
  let drawn = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 150000){
    const s = await page.evaluate(() => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      return {
        done: !!document.querySelector('.overlay .big-star'),
        cards: [...document.querySelectorAll('.learn:not(.seen)')].filter(vis).length,
        start: vis(document.querySelector('[data-v="__start"]')),
        q: window.__quiz && window.__quiz.n || 0,
        draw: !!document.querySelector('.draw-wrap'),
      };
    });
    if (s.done) return true;
    if (s.draw && !drawn){
      const r = await page.evaluate(() => { const b = document.querySelector('.draw-wrap canvas').getBoundingClientRect(); return {x:b.left, y:b.top, w:b.width, h:b.height}; });
      await page.mouse.move(r.x + r.w * 0.3, r.y + r.h * 0.4); await page.mouse.down();
      await page.mouse.move(r.x + r.w * 0.6, r.y + r.h * 0.5, {steps:8}); await page.mouse.up();
      await page.click('.word-bank .wchip');
      await sleep(100);
      await page.click('[data-v="__done"]');
      drawn = true; await sleep(400); continue;
    }
    if (s.q > lastQ){
      lastQ = s.q;
      await sleep(420);   // a new question ignores taps for a moment
      const q = await page.evaluate(() => window.__quiz);
      if (q.type === 'trace'){
        if (await traceDigit(page)) stats.traced++;
        else { stats.hooked++; await page.evaluate(() => window.__pass && window.__pass()); }
      } else if (q.taps){
        if (WRONG && q.type === 'order') await tapWrong(page, q.taps);   // a wrong tap changes nothing there; elsewhere it would select something
        for (const t of q.taps){
          try { await page.click(sel(t), {timeout:3000, force:true}); }
          catch (e){ console.log(`  lesson ${l} ${key}: could not tap ${t} for ${JSON.stringify(q)}`); return false; }
          await sleep(70);
        }
      } else {
        if (WRONG) await tapWrong(page, [q.answer]);
        try { await page.click(sel(q.answer), {timeout:3000, force:true}); }
        catch (e){
          const have = await page.evaluate(() => [...document.querySelectorAll('.stage [data-v]')].map(x => x.dataset.v));
          console.log(`  lesson ${l} ${key}: no button for ${JSON.stringify(q)}; buttons: ${JSON.stringify(have)}`);
          return false;
        }
      }
      await sleep(250);
      continue;
    }
    if (s.cards){
      for (let k = 0; k < s.cards; k++){
        await page.evaluate(() => { const el = document.querySelector('.learn:not(.seen)'); if (el) el.click(); });
        await sleep(100);
      }
      await sleep(200);
      continue;
    }
    if (s.start){ await page.click('[data-v="__start"]'); await sleep(300); continue; }
    await sleep(150);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM || undefined});
  let failedAll = 0, errorsAll = 0;
  for (const lang of LANGS){
    const page = await browser.newPage({viewport:{width:1024, height:900}});
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror ${page.url()}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console ${page.url()}: ${m.text()}`); });
    await page.addInitScript(() => { window.__quiz = {}; window.__fastSpeech = true; window.__clipMiss = []; });
    await page.goto(BASE + '?lang=' + lang + '#/', {waitUntil:'load'});
    await page.click('.splash .btn.green');
    await sleep(200);
    const failed = [], stats = {traced:0, hooked:0};
    let acts = 0;
    for (let l = from; l <= to; l++){
      await page.evaluate(h => { location.hash = h; }, `#/lesson/${l}`);
      await sleep(150);
      const list = await page.evaluate(l => window.__mgActs(l), l);
      for (const key of list){
        const ok = await playActivity(page, l, key, stats);
        acts++;
        if (!ok) failed.push(`lesson ${l} ${key}`);
      }
      const done = await page.evaluate(l => (JSON.parse(localStorage.getItem('shuxue-leyuan-v1')).done[l] || {}), l);
      process.stdout.write(`[${lang}] lesson ${l}: ${Object.keys(done).length}/${list.length} done\n`);
    }
    const miss = await page.evaluate(() => [...new Set(window.__clipMiss)]);
    console.log(`[${lang}] ${acts} games played, ${failed.length} did not finish${failed.length ? ': ' + failed.join(', ') : ''}`);
    console.log(`[${lang}] digits traced along their strokes: ${stats.traced}, finished by the test hook: ${stats.hooked}`);
    console.log(`[${lang}] lines without a clip: ${miss.length}${miss.length ? '\n  ' + miss.slice(0, 30).join('\n  ') : ''}`);
    console.log(errors.length ? errors.slice(0, 30).join('\n') : `[${lang}] no page errors`);
    failedAll += failed.length; errorsAll += errors.length;
    await page.close();
  }
  await browser.close();
  process.exit(failedAll || errorsAll ? 1 : 0);
})();

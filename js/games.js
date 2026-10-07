'use strict';
/* =====================================================================
   GAMES (1/4) — shared pieces for questions, then: 数一数 count,
   摆一摆 place, 画一画 draw, 写数字 write.
   Every game is GAMES[type](ctx); PHRASES[type](lesson, act) lists every
   line it can say (tools/build_audio.py records them).
   ===================================================================== */
const GAMES = {}, PHRASES = {};

/* ---------- shared pieces for questions ---------- */
// test hook: the current question and its answer (taps: what to tap, in order)
let quizN = 0;
function quizHook(type, answer, taps){ markShown(); if (window.__quiz) window.__quiz = {n: ++quizN, type, answer:String(answer), taps}; }
// A new question ignores taps for a moment, and only counts a tap that started on the same button, so a quick
// tap meant for the last question (the new answers appear under the finger) is never marked wrong.
let shownAt = 0, downEl = null;
const markShown = () => { shownAt = Date.now(); };
['pointerdown', 'touchstart', 'mousedown'].forEach(t => document.addEventListener(t, e => { downEl = e.target; }, {capture:true, passive:true}));
function tapOK(e){
  if (!e || e.detail === 0) return true;   // keyboard
  return Date.now() - shownAt > 350 && (!downEl || e.currentTarget.contains(downEl));
}
// once a question is answered, the other choices fade out
const fadeOthers = (all, keep) => all.forEach(x => { if (x !== keep && !x.classList.contains('used')) x.classList.add('fade'); });
// The first two rounds are easier (3 choices, far apart); later rounds have 4 choices, close together.
const hard = r => r >= 2;
const rounds = (normal, short = 3) => isShort() ? short : normal;
// Question types take turns: the first round is the easiest type, then the type used least so far (never twice in a row).
function typePlan(n, types, R){
  const used = Object.fromEntries(types.map(t => [t, 0])), plan = [];
  for (let r = 0; r < n; r++){
    const free = types.filter(t => t !== plan[r - 1]);
    const min = Math.min(...free.map(t => used[t]));
    const t = r === 0 ? types[0] : (free.length ? pick(free.filter(x => used[x] === min), R) : types[0]);
    plan.push(t); used[t]++;
  }
  return plan;
}
// A shuffled list of n items with no back-to-back repeats.
function roundList(items, n, R){
  let list = [];
  while (list.length < n) list.push(...shuffle(items, R));
  list = list.slice(0, n);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (let i = 1; i < list.length; i++){
    if (same(list[i], list[i - 1]) && items.length > 1){
      const j = list.findIndex((x, k) => k > i && !same(x, list[i]) && !same(list[k - 1], list[i]));
      if (j > 0) [list[i], list[j]] = [list[j], list[i]];
    }
  }
  return list;
}
// Number choices: the answer and numbers near it (later rounds: right next to it), all between lo and hi.
function numChoices(ans, r, lo = 0, hi = 20){
  const n = hard(r) ? 4 : 3;
  const near = hard(r) ? [1, -1, 2, -2, 3, -3] : [2, -2, 3, -3, 1, -1, 4, -4];
  const out = [ans];
  for (const d of shuffle(near.slice(0, 4)).concat(near.slice(4))){
    const v = ans + d;
    if (v >= lo && v <= hi && !out.includes(v)) out.push(v);
    if (out.length === n) break;
  }
  for (let v = lo; out.length < n && v <= hi; v++) if (!out.includes(v)) out.push(v);
  return shuffle(out);
}
const BALLOON_COLORS = ['var(--pink)', 'var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--teal)'];
// One question with balloons (or cards) to choose from.
// opts: the choices · answer · label(o): what a choice shows · cls · top: what is shown above (picture, sum)
// prompt(): asks the question · right(praise): what 乐乐 says when it is right · wrong(o): …when o was tapped
function choiceRound(ctx, {opts, answer, label, cls = '', top, prompt, right, wrong, r, total, next, cards = false, onRight}){
  let solved = false, misses = 0;
  const btns = opts.map((o, i) => {
    const bc = BALLOON_COLORS[(i + r) % BALLOON_COLORS.length];
    const content = label ? label(o) : String(o);
    const text = typeof content === 'string' ? content : '';
    const b = h('button', {class:(cards ? 'choice' : 'balloon') + (cls ? ' ' + cls : '') + (!cards && text.length > 2 ? ' long' : '') + (!cards && LIGHT_BG.has(bc) ? ' ink' : ''),
      'aria-label':(cards ? '' : U.balloon) + (text || o), 'data-v':String(o), style:cards ? null : {'--c':bc, animationDelay:(i * 0.4) + 's'}, onclick:e => {
      if (solved || !tapOK(e)) return;
      if (String(o) === String(answer)){
        solved = true; Sfx.good(); if (cards) b.classList.add('right'); else { Sfx.pop(); b.classList.add('pop'); }
        burst(b); fadeOthers(btns, b);
        if (onRight) onRight(b);
        ctx.progress((r + 1) / total);
        const pr = pick(praises());
        afterSay(say(pr, right(pr)), 1100, next);
      } else {
        misses++; Sfx.bad(); wiggle(b);
        say(pick(tries()), wrong(o, misses));
        if (misses >= 2){ const a = btns[opts.findIndex(x => String(x) === String(answer))]; if (a) a.classList.add('hint'); }
      }
    }}, content);
    return b;
  });
  ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt), top || null), h('div', {class:cards ? 'choices' : 'balloons'}, btns));
  ctx.replay = prompt; prompt();
  return btns;
}
// Cards to tap and hear before the questions start; "开始" appears when every card has been heard.
function learnCards(ctx, cards, {cls = '', intro, onStart, top = null}){
  const seen = new Set();
  const playBtn = h('button', {class:'btn green big', hidden:true, 'data-v':'__start', onclick:() => { Sfx.tap(); onStart(); }}, U.go);
  const els = cards.map((c, i) => {
    const el = h('button', {class:'learn' + (c.cls ? ' ' + c.cls : ''), 'aria-label':c.label, onclick:() => {
      Sfx.tap(); bounce(el); el.classList.add('seen'); seen.add(i);
      c.say();
      if (seen.size === cards.length) reveal(playBtn);
    }}, c.body);
    return el;
  });
  ctx.stage.replaceChildren(...[top, h('div', {class:'cards' + (cls ? ' ' + cls : '') + (cards.length > 5 ? ' many' : '')}, els), playBtn].filter(Boolean));
  ctx.progress(0);
  ctx.replay = intro; intro();
}
// A short show before the questions (乐乐 explains with a picture); "开始" appears when it has been watched once.
function learnShow(ctx, {body, play, onStart, againLabel}){
  const playBtn = h('button', {class:'btn green big', hidden:true, 'data-v':'__start', onclick:() => { Sfx.tap(); onStart(); }}, U.go);
  const againBtn = h('button', {class:'btn white', 'data-v':'__again', onclick:() => { Sfx.tap(); run(); }}, againLabel || U.watchAgain);
  let busy = false;
  const run = async () => {
    if (busy) return; busy = true;
    const id = navId;
    try { await play(); } finally { busy = false; }
    if (id === navId) reveal(playBtn);
  };
  ctx.stage.replaceChildren(body, h('div', {class:'row'}, againBtn, playBtn));
  ctx.progress(0);
  ctx.replay = run;
  run();
}
// The game starts at round r0 (carried on after a reload) or with its learning part.
const startAt = ctx => ctx.saved ? (ctx.saved.r || 0) : -1;
// a number with its word: 5 → "5 五" / "5 five"
const digitWord = n => LANG === 'zh' ? TEXT.zh.NUMW[n] : TEXT.en.NUMW[n];

/* =====================================================================
   1 · 数一数 count: tap the number cards, then count things and pop the balloon
   ===================================================================== */
// a number card: the digit, that many things, and the number's name
function numCard(n, o){
  return [
    h('span', {class:'big-digit'}, String(n)),
    n === 0 ? h('span', {class:'empty-plate', 'aria-hidden':'true'}, '🍽️') : objGroup(n, o.e, {cls:'mini'}),
    h('span', {class:'num-word'}, LANG === 'zh' ? rubyNum(n) : digitWord(n)),
  ];
}
// 五 with its pinyin over it (hidden when pinyin is switched off)
function rubyNum(n){ return h('span', {class:'rb'}, h('span', {class:'p'}, TEXT.zh.NUMPY[n]), h('span', {class:'c'}, TEXT.zh.NUMW[n])); }
const sayNumCard = (n, o) => n === 0 ? [P.n(0), T.zeroCard] : [P.n(n), P.count(n, o)];
function countPlan(a, R, n){
  const nums = range(a.min, a.max);
  const pool = a.focus ? [...a.focus, ...a.focus, ...nums.filter(x => !a.focus.includes(x))] : nums;
  const order = roundList(pool, n, R);
  const types = a.scene ? ['how', 'find', 'scene'] : ['how', 'find'];
  const plan = typePlan(n, types, R);
  return order.map((x, i) => {
    let t = plan[i];
    if (x === 0 && t !== 'find') t = 'how';
    return {n:x, t, o:pick(a.objs, R), other:shuffle(a.objs.filter(k => k !== 'star'), R).slice(0, 2)};
  });
}
GAMES.count = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(a.learn && a.learn.length > 6 ? 5 : 6);
  const plan = countPlan(a, R, n);
  const total = plan.length, lo = Math.max(0, a.min - 1), hi = Math.min(20, a.max + 2);
  const learnObj = OBJ[a.objs[0]];
  const begin = r0 => round(r0);
  const r0 = startAt(ctx);
  if (r0 >= 0 || !a.learn) begin(Math.max(0, r0));
  else learnCards(ctx, a.learn.map(x => ({label:String(x), cls:'num-card', body:numCard(x, learnObj), say:() => say(SHOW.sayWithMe, sayNumCard(x, learnObj))})),
    {intro:() => say(SHOW.tapEachCard, T.tapEachCard), onStart:() => begin(0)});

  function round(r){
    if (r >= total){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / total);
    const q = plan[r], o = OBJ[q.o];
    const askHow = () => say(P.howManyShow(o), P.howMany(o));
    if (q.t === 'find'){
      // which group has n things?
      const counts = numChoices(q.n, r, Math.max(0, lo), hi).slice(0, hard(r) ? 4 : 3);
      const prompt = () => say(P.findShow(q.n, o), P.find(q.n, o));
      quizHook('find', q.n);
      choiceRound(ctx, {opts:counts, answer:q.n, r, total, cards:true, cls:'group-card',
        label:k => k === 0 ? h('span', {class:'empty-plate'}, '🍽️') : objGroup(k, o.e, {cls:'mini', scatter:hard(r), rng:Math.random}),
        prompt, right:pr => [pr, P.count(q.n, o)], wrong:() => [T.countAgain, P.find(q.n, o)], next:() => round(r + 1)});
      return;
    }
    // how many? (scene: some other things are mixed in)
    let picture;
    if (q.t === 'scene'){
      const others = q.other.filter(k => k !== q.o).slice(0, 2);
      const mix = [];
      for (let k = 0; k < q.n; k++) mix.push(q.o);
      for (const k of others) for (let m = 0; m < 2 + Math.floor(Math.random() * 3); m++) mix.push(k);
      picture = objGroup(mix.length, '', {scatter:true});
      const cells = shuffle(mix);
      picture.items.forEach((it, k) => { it.textContent = OBJ[cells[k]].e; it.dataset.o = cells[k]; });
    } else picture = q.n === 0 ? h('div', {class:'empty-plate big'}, '🍽️') : objGroup(q.n, o.e, {scatter:hard(r) && q.n > 3});
    if (picture.items){
      const counter = countByTap(picture.items);
      picture.items.forEach(it => it.addEventListener('click', () => {
        if (it.dataset.o && it.dataset.o !== q.o){ wiggle(it); return; }
        counter(it);
      }));
    }
    quizHook(q.t, q.n);
    choiceRound(ctx, {opts:numChoices(q.n, r, lo, hi), answer:q.n, r, total, top:picture,
      prompt:askHow, right:pr => [pr, q.n === 0 ? T.zeroCard : P.count(q.n, o)], wrong:(k, m) => m >= 2 ? [T.countAgain, T.tapToCount] : [T.countAgain],
      next:() => round(r + 1)});
  }
};
PHRASES.count = (l, a) => {
  const out = [T.tapEachCard, T.countAgain, T.tapToCount, T.zeroCard];
  for (const k of a.objs){
    const o = OBJ[k];
    out.push(P.howMany(o));
    for (let x = a.min; x <= a.max; x++) out.push(P.count(x, o), P.find(x, o));
  }
  if (a.learn) for (const x of a.learn) out.push(...sayNumCard(x, OBJ[a.objs[0]]));
  return out;
};

/* =====================================================================
   2 · 摆一摆 place: put that many things on the plate (or make a teen number with sticks)
   ===================================================================== */
GAMES.place = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(5);
  const plan = roundList(range(a.min, a.max), n, R).map(x => ({n:x, o:a.sticks ? null : pick(a.objs, R)}));
  const total = plan.length;
  round(Math.max(0, startAt(ctx)));

  function round(r){
    if (r >= total){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / total);
    const q = plan[r];
    if (a.sticks) return sticksRound(r, q);
    const o = OBJ[q.o];
    let put = 0, solved = false, misses = 0;
    const plate = h('div', {class:'plate', 'aria-label':U.plate});
    const slots = range(1, 10).map(() => h('span', {class:'pslot'}));
    plate.append(h('div', {class:'pgrid'}, slots));
    const countEl = h('span', {class:'put-count'}, '0');
    const redraw = () => {
      slots.forEach((s, k) => s.replaceChildren(k < put ? h('button', {class:'pitem', 'aria-label':o.e, onclick:() => take(k)}, o.e) : ''));
      countEl.textContent = String(put);
    };
    const add = () => {
      if (solved) return;
      if (put >= 10){ Sfx.bad(); wiggle(plate); return; }
      put++; redraw(); Sfx.tick(put); Speech.speak(P.n(put));
    };
    const take = () => { if (solved || !put) return; put--; redraw(); Sfx.pop(); Speech.speak(P.n(put)); };
    const source = h('button', {class:'source', 'data-v':'__add', 'aria-label':U.addOne, onclick:() => { Sfx.tap(); add(); }}, h('span', {class:'src-e'}, o.e), h('span', {class:'src-plus'}, '+1'));
    const doneBtn = h('button', {class:'btn green big', 'data-v':'__done', onclick:() => {
      if (solved) return;
      if (put === q.n){
        solved = true; Sfx.good(); plate.classList.add('win'); burst(plate);
        ctx.progress((r + 1) / total);
        const pr = pick(praises());
        afterSay(say(pr, [pr, P.count(q.n, o)]), 1200, () => round(r + 1));
      } else {
        misses++; Sfx.bad(); wiggle(plate);
        say(put > q.n ? SHOW.tooMany : SHOW.tooFew, put > q.n ? T.tooMany : T.tooFew);
      }
    }}, U.doneCheck);
    const prompt = () => say(P.placeShow(q.n, o), [P.place(q.n, o), ...(r === 0 ? [T.tapToTake] : [])]);
    ctx.stage.replaceChildren(
      h('div', {class:'q-top'}, listenBtn(prompt), h('div', {class:'target'}, h('span', {class:'big-digit'}, String(q.n)), h('span', {class:'target-e'}, o.e))),
      h('div', {class:'place-row'}, source, plate, h('div', {class:'put-box'}, countEl)), doneBtn);
    redraw();
    quizHook('place', q.n, [...range(1, q.n).map(() => '__add'), '__done']);
    ctx.replay = prompt; prompt();
  }
  // teen numbers: bundles of ten and single sticks
  function sticksRound(r, q){
    let tens = 0, ones = 0, solved = false;
    const pic = h('div', {class:'stick-plate'});
    const redraw = () => {
      pic.replaceChildren(
        h('button', {class:'stick-part', 'aria-label':U.takeBundle, onclick:() => { if (!solved && tens){ tens--; Sfx.pop(); redraw(); say(String(val()), P.n(val())); } }}, tens ? sticksSvg(tens, 0) : h('span', {class:'stick-empty'}, U.tensShort)),
        h('button', {class:'stick-part', 'aria-label':U.takeStick, onclick:() => { if (!solved && ones){ ones--; Sfx.pop(); redraw(); say(String(val()), P.n(val())); } }}, ones ? sticksSvg(0, ones) : h('span', {class:'stick-empty'}, U.onesShort)));
    };
    const val = () => tens * 10 + ones;
    const addB = h('button', {class:'source', 'data-v':'__bundle', 'aria-label':U.addBundle, onclick:() => { if (solved) return; Sfx.tap(); if (tens >= 2){ wiggle(addB); return; } tens++; redraw(); Speech.speak(P.n(val())); }}, sticksSvg(1, 0), h('span', {class:'src-plus'}, '+10'));
    const addS = h('button', {class:'source', 'data-v':'__stick', 'aria-label':U.addStick, onclick:() => { if (solved) return; Sfx.tap(); if (ones >= 10){ wiggle(addS); return; } ones++; redraw(); Speech.speak(P.n(val())); }}, sticksSvg(0, 1), h('span', {class:'src-plus'}, '+1'));
    const doneBtn = h('button', {class:'btn green big', 'data-v':'__done', onclick:() => {
      if (solved) return;
      if (val() === q.n && ones < 10){
        solved = true; Sfx.good(); pic.classList.add('win'); burst(pic);
        ctx.progress((r + 1) / total);
        const pr = pick(praises());
        afterSay(say(pr, [pr, P.teenA(q.n)]), 1200, () => round(r + 1));
      } else {
        Sfx.bad(); wiggle(pic);
        say(val() > q.n ? SHOW.tooMany : val() < q.n ? SHOW.tooFew : SHOW.bundleIt, val() > q.n ? T.tooMany : val() < q.n ? T.tooFew : T.bundleIt);
      }
    }}, U.doneCheck);
    const prompt = () => say(P.placeSticksShow(q.n), [P.placeSticks(q.n), ...(r === 0 ? [T.bundleIs10] : [])]);
    ctx.stage.replaceChildren(
      h('div', {class:'q-top'}, listenBtn(prompt), h('div', {class:'target'}, h('span', {class:'big-digit'}, String(q.n)))),
      h('div', {class:'place-row sticks-row'}, h('div', {class:'sources'}, addB, addS), pic), doneBtn);
    redraw();
    quizHook('place', q.n, [...range(1, Math.floor(q.n / 10)).map(() => '__bundle'), ...(q.n % 10 ? range(1, q.n % 10) : []).map(() => '__stick'), '__done']);
    ctx.replay = prompt; prompt();
  }
};
PHRASES.place = (l, a) => {
  const out = [T.tooMany, T.tooFew, T.tapToTake, T.bundleIs10, T.bundleIt];
  for (let x = 0; x <= Math.min(20, a.sticks ? 20 : 10); x++) out.push(P.n(x));
  for (let x = a.min; x <= a.max; x++){
    if (a.sticks) out.push(P.placeSticks(x), P.teenA(x));
    else for (const k of a.objs) out.push(P.place(x, OBJ[k]), P.count(x, OBJ[k]));
  }
  return out;
};

/* =====================================================================
   3 · 画一画 draw: draw some things, count them, and label the picture with their number
   ===================================================================== */
GAMES.draw = ctx => {
  const a = ctx.act;
  const colors = DRAW_COLORS.map(c => c[1]);
  let color = colors[1], size = 12, erasing = false, label = null, hasInk = false, drawing = false, last = null;
  const history = [];
  const wrap = h('div', {class:'draw-wrap'});
  const cv = h('canvas', {'aria-label':U.drawArea});
  wrap.append(cv);
  // the number label sits on the picture: drag it to move it, tap it to take it off
  const labelText = h('span', {}), labelEl = h('button', {class:'draw-label', hidden:true, title:U.labelTip,
    onclick:e => { if (e.detail === 0){ Sfx.tap(); setLabel(null); } }},   // keyboard; taps are handled below
    labelText, h('span', {class:'x', 'aria-hidden':'true'}, '✕'));
  let lpos = null;   // label centre as a share of the picture's width and height; null = bottom middle
  const pick1 = (list, el) => list.forEach(x => { x.classList.toggle('on', x === el); x.setAttribute('aria-pressed', String(x === el)); });
  const swatches = DRAW_COLORS.map(([name, c, light]) => h('button', {class:'swatch' + (light ? ' light' : '') + (c === color ? ' on' : ''), style:{background:c},
    'aria-label':P.colorName(name), title:P.colorName(name), 'aria-pressed':String(c === color), onclick:e => {
      Sfx.tap(); color = c; erasing = false; eraser.classList.remove('on'); eraser.setAttribute('aria-pressed', 'false');
      pick1(swatches, e.currentTarget);
      Speech.speak(P.colorName(name));
    }}));
  const sizes = [[U.thin, 6, 8], [U.mid, 12, 14], [U.thick, 24, 22]].map(([name, s, dot]) => h('button', {class:'tool' + (s === size ? ' on' : ''),
    'aria-label':name, title:name, 'aria-pressed':String(s === size), onclick:e => { Sfx.tap(); size = s; pick1(sizes, e.currentTarget); }},
    h('span', {class:'dot', style:{width:dot + 'px', height:dot + 'px'}})));
  const eraser = h('button', {class:'tool', 'aria-label':U.eraser, title:U.eraser, 'aria-pressed':'false', onclick:() => {
    Sfx.tap(); erasing = !erasing; eraser.classList.toggle('on', erasing); eraser.setAttribute('aria-pressed', String(erasing)); }}, '🧽');
  const undoBtn = h('button', {class:'tool', 'aria-label':U.undo, title:U.undo, onclick:() => {
    Sfx.tap(); const snap = history.pop();
    if (snap){ c2d.putImageData(snap.img, 0, 0); hasInk = snap.ink; setLabel(snap.label, snap.lpos); }
  }}, '↩️');
  const clearBtn = h('button', {class:'tool', 'aria-label':U.clearAll, title:U.clearAll, onclick:() => { Sfx.tap(); pushHistory(); paintWhite(); hasInk = false; setLabel(null, null); }}, '🗑️');
  const bankBtns = a.nums.map(x => h('button', {class:'wchip num', 'aria-pressed':'false', 'data-v':String(x), onclick:() => {
    Sfx.tap();
    if (label === x){ setLabel(null); return; }
    setLabel(x); Speech.speak(P.n(x));
  }}, String(x)));
  const bank = h('div', {class:'word-bank', role:'group', 'aria-label':U.pickNumber}, bankBtns);
  function setLabel(x, pos){
    label = x == null ? null : x;
    if (pos !== undefined) lpos = pos;
    labelText.textContent = label == null ? '' : String(label);
    labelEl.hidden = label == null;
    bankBtns.forEach((c, k) => { const on = a.nums[k] === label; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
    placeLabel();
  }
  function placeLabel(){
    if (label == null) return;
    const r = wrap.getBoundingClientRect(), lw = labelEl.offsetWidth, lh = labelEl.offsetHeight;
    if (!r.width || !r.height) return;
    let x = lpos ? lpos.fx * r.width : r.width / 2, y = lpos ? lpos.fy * r.height : r.height - 8 - lh / 2;
    x = lw + 14 >= r.width ? r.width / 2 : clamp(x, lw / 2 + 4, r.width - lw / 2 - 10);
    y = lh + 14 >= r.height ? r.height / 2 : clamp(y, lh / 2 + 10, r.height - lh / 2 - 4);
    labelEl.style.left = x + 'px'; labelEl.style.top = y + 'px';
    return {x, y};
  }
  let drag = null;
  onStrokes(labelEl, {
    down: p => { const c = placeLabel(); if (!c) return false; drag = {p, c, moved:false}; },
    move: p => {
      if (!drag) return;
      const dx = p.x - drag.p.x, dy = p.y - drag.p.y;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;   // a small wobble is still a tap
      if (!drag.moved){ drag.moved = true; labelEl.classList.add('dragging'); }
      const r = wrap.getBoundingClientRect();
      lpos = {fx:(drag.c.x + dx) / r.width, fy:(drag.c.y + dy) / r.height};
      const c = placeLabel();
      lpos = {fx:c.x / r.width, fy:c.y / r.height};
    },
    up: () => {
      if (!drag) return;
      const moved = drag.moved; drag = null; labelEl.classList.remove('dragging');
      Sfx.tap();
      if (!moved) setLabel(null);
    },
  }, wrap);
  const saveBtn = h('button', {class:'tool', 'aria-label':U.savePic, title:U.savePic, onclick:() => {
    if (!hasInk){ Sfx.bad(); wiggle(wrap); say(SHOW.drawFirst, T.drawFirst); return; }
    Sfx.tap(); savePicture();
  }}, '💾');
  const doneBtn = h('button', {class:'btn green big', 'data-v':'__done', onclick:() => {
    if (!hasInk){ Sfx.bad(); wiggle(wrap); say(SHOW.drawFirst, T.drawFirst); return; }
    if (label == null){ Sfx.bad(); replayAnim(bank, 'nudge'); say(SHOW.pickNumber, T.pickNumber); return; }
    say(P.drewShow(label), [P.drew(label), T.greatDrawing]).then(() => later(ctx.done, 200));
  }}, U.doneDraw);
  wrap.append(labelEl);
  ctx.stage.classList.add('compact');
  ctx.stage.replaceChildren(h('div', {class:'draw-tools'}, swatches, sizes, eraser, undoBtn, clearBtn, saveBtn), wrap, h('div', {class:'row'}, bank, doneBtn));
  ctx.progress(0);
  const intro = () => say(SHOW.drawIntro, T.drawIntro);
  ctx.replay = intro; intro();
  if (window.__quiz) window.__drawHook = true;   // test hook

  let c2d = null, W = 0, H = 0, dpr = 1;
  function paintWhite(){ c2d.save(); c2d.setTransform(1, 0, 0, 1, 0, 0); c2d.fillStyle = '#fff'; c2d.fillRect(0, 0, cv.width, cv.height); c2d.restore(); }
  function pushHistory(){ try { history.push({img:c2d.getImageData(0, 0, cv.width, cv.height), ink:hasInk, label, lpos}); if (history.length > 8) history.shift(); } catch (e) {} }
  function layout(){
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const old = c2d && cv.width ? (() => { const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; t.getContext('2d').drawImage(cv, 0, 0); return t; })() : null;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(r.width); H = Math.round(r.height);
    cv.width = W * dpr; cv.height = H * dpr;
    c2d = cv.getContext('2d');
    paintWhite();
    if (old) c2d.drawImage(old, 0, 0, cv.width, cv.height);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    history.length = 0;
    placeLabel();
  }
  function seg(p, q){
    c2d.strokeStyle = erasing ? '#fff' : color; c2d.lineWidth = erasing ? size * 2 : size;
    c2d.lineCap = 'round'; c2d.lineJoin = 'round';
    c2d.beginPath(); c2d.moveTo(p.x, p.y); c2d.lineTo(q.x, q.y); c2d.stroke();
  }
  onStrokes(cv, {
    down: p => { if (!c2d) return false; pushHistory(); drawing = true; last = p; seg(p, {x:p.x + 0.1, y:p.y}); if (!erasing) hasInk = true; },
    move: p => { if (!drawing) return; seg(last, p); last = p; },
    up: () => { drawing = false; },
  });
  function roundRect(o, x, y, w, ht, r){
    o.beginPath(); o.moveTo(x + r, y);
    o.arcTo(x + w, y, x + w, y + ht, r); o.arcTo(x + w, y + ht, x, y + ht, r);
    o.arcTo(x, y + ht, x, y, r); o.arcTo(x, y, x + w, y, r); o.closePath();
  }
  function savePicture(){
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const o = out.getContext('2d');
    o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(cv, 0, 0);
    const c = placeLabel();
    if (c){
      const r = wrap.getBoundingClientRect(), sx = cv.width / r.width, sy = cv.height / r.height;
      const lw = labelEl.offsetWidth * sx, lh = labelEl.offsetHeight * sy, x = c.x * sx, y = c.y * sy;
      o.fillStyle = 'rgba(255,255,255,.85)'; roundRect(o, x - lw / 2, y - lh / 2, lw, lh, 14 * sy); o.fill();
      const fs = parseFloat(getComputedStyle(labelText).fontSize) || 32;
      o.fillStyle = '#b72a23'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = `700 ${Math.round(fs * sy)}px Fredoka, sans-serif`;
      o.fillText(labelText.textContent, x, y);
    }
    out.toBlob(blob => {
      if (!blob) return;
      const link = h('a', {href:URL.createObjectURL(blob), download:`math-${ctx.lesson.n}-${label == null ? 'picture' : label}.png`});
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    }, 'image/png');
  }
  watchSize(wrap, () => { const r = wrap.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== H) layout(); });
  layout();
};
PHRASES.draw = (l, a) => [T.drawIntro, T.drawFirst, T.pickNumber, T.greatDrawing, ...a.nums.flatMap(x => [P.n(x), P.drew(x)]), ...DRAW_COLORS.map(c => P.colorName(c[0]))];

/* =====================================================================
   4 · 写数字 write: trace each digit stroke by stroke, from the green dot along the arrows
   ===================================================================== */
// Digits as they are written in first grade, in a box twice as tall as it is wide (y = 0 top, 1 middle line, 2 bottom).
// Strokes are separated by "|", parts of one stroke by ",":
//   l x y x y ...          straight lines through the points
//   c cx cy r a0 a1        part of a circle from angle a0 to a1 (degrees: 0 = right, 90 = down; a1 < a0 goes counterclockwise)
//   e cx cy rx ry a0 a1    the same for an oval
const DIGIT_STROKES = {
  '0':'e .5 1 .38 .8 -90 -450',
  '1':'l .6 .18 .4 1.82',
  '2':'c .5 .62 .38 195 385, l .1 1.82 .92 1.82',
  '3':'c .48 .6 .36 205 450, c .46 1.38 .42 270 510',
  '4':'l .52 .18 .08 1.3 .94 1.3 | l .72 .55 .72 1.84',
  '5':'l .22 .2 .17 .96, c .48 1.3 .42 228 512 | l .22 .2 .86 .2',
  '6':'e .92 1.34 .8 1.12 250 180, c .5 1.38 .41 180 -172',
  '7':'l .1 .2 .92 .2 .42 1.84',
  '8':'c .5 .58 .32 -30 -270, c .5 1.38 .42 -90 270, c .5 .58 .32 90 -30',
  '9':'c .48 .6 .37 -8 -360, l .82 1.84',
};
function digitStrokes(d){
  return DIGIT_STROKES[d].split('|').map(stroke => {
    const parts = stroke.split(',').map(p => p.trim().split(/\s+/));
    const pts = [];
    for (const [kind, ...v] of parts){
      const n = v.map(Number);
      if (kind === 'l') for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
      else {
        const [cx, cy, rx, ry, a0, a1] = kind === 'c' ? [n[0], n[1], n[2], n[2], n[3], n[4]] : n;
        const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
        for (let i = 0; i <= steps; i++){ const t = (a0 + (a1 - a0) * i / steps) * Math.PI / 180; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
      }
    }
    return {pts: pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6)};
  });
}
// a number written out digit after digit, each in its own box
function writeOut(text){
  const strokes = [], boxes = [];
  [...text].forEach((d, i) => {
    const x0 = i * 1.25;
    boxes.push(x0);
    for (const s of digitStrokes(d)) strokes.push({pts:s.pts.map(([x, y]) => [x + x0, y])});
  });
  return {strokes, boxes, width:text.length * 1.25 - 0.25};
}
if (window.__quiz) window.__writeOut = writeOut;   // test hook

GAMES.write = ctx => {
  const a = ctx.act, R = ctx.rng;
  const items = a.digits.slice(0, isShort() ? Math.min(3, a.count || 3) : (a.count || a.digits.length));
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = Math.max(0, startAt(ctx)), fails = 0, won = false, hue = 160;
  const wrap = h('div', {class:'trace-wrap'});
  // three layers: the digit (bottom), the child's ink, and the dots, numbers and arrows on top
  const guide = h('canvas', {'aria-hidden':'true'}), ink = h('canvas', {'aria-label':U.traceArea}), marks = h('canvas', {'aria-hidden':'true', class:'marks'});
  wrap.append(guide, ink, marks);
  const topPic = h('span', {class:'tp'}), topLabel = h('span', {class:'tl'}), counter = h('span', {class:'count'});
  const clearBtn = h('button', {class:'btn orange', onclick:() => { Sfx.tap(); restart(); }}, U.traceAgain);
  const showBtn = h('button', {class:'btn blue', onclick:() => { Sfx.tap(); demo(false); }}, U.showMe);
  ctx.stage.replaceChildren(h('div', {class:'trace-top'}, topPic, topLabel, counter), wrap, h('div', {class:'row'}, showBtn, clearBtn));

  let W = 0, H = 0, dpr = 1, gctx, ictx, mctx, u = 50, ox = 0, oy = 0;
  let shape = null, strokes = [];
  const cur = {k:0, prog:0};
  let mode = null, last = null, offRun = 0, wander = 0, moved = 0, went = 0, from = 0, chained = false, lastHint = 0, demoRun = 0, demoView = null;
  const tol = () => Math.max((fails >= 2 ? 0.5 : 0.36) * u, fails >= 2 ? 22 : 16);   // how far off the path still counts
  const near = () => Math.max((fails >= 2 ? 0.6 : 0.45) * u, fails >= 2 ? 28 : 22);   // how close to a dot a finger must start

  function layout(){
    const r = wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(r.width); H = Math.round(r.height);
    for (const c of [guide, ink, marks]){ c.width = W * dpr; c.height = H * dpr; }
    gctx = guide.getContext('2d'); ictx = ink.getContext('2d'); mctx = marks.getContext('2d');
    for (const c of [gctx, ictx, mctx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
    place(); draw();
  }
  // the digit boxes fill most of the height
  function place(){
    if (!shape || !W) return;
    u = Math.min(H * 0.88 / 2.2, W * 0.86 / (shape.width + 0.3));
    ox = (W - shape.width * u) / 2; oy = (H - 2 * u) / 2;
    strokes = shape.strokes.map(s => {
      const pts = s.pts.map(([x, y]) => [ox + x * u, oy + y * u]), cum = [0];
      for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      return {pts, cum, L:cum[cum.length - 1]};
    });
    if (window.__quiz) window.__traceGuide = {strokes: strokes.map(s => ({pts:s.pts})), u, k:cur.k};   // test hook
  }
  function at(st, s){
    s = clamp(s, 0, st.L);
    let j = 1; while (j < st.cum.length - 1 && st.cum[j] < s) j++;
    const p = st.pts[j - 1], q = st.pts[j] || p, seg = (st.cum[j] - st.cum[j - 1]) || 1, t = (s - st.cum[j - 1]) / seg;
    return {x:p[0] + (q[0] - p[0]) * t, y:p[1] + (q[1] - p[1]) * t, dx:(q[0] - p[0]) / seg, dy:(q[1] - p[1]) / seg};
  }
  function closest(st, p, s0, s1){
    let best = {d:Infinity, s:s0};
    for (let j = 1; j < st.pts.length; j++){
      if (st.cum[j] < s0 || st.cum[j - 1] > s1) continue;
      const A = st.pts[j - 1], B = st.pts[j], len = st.cum[j] - st.cum[j - 1];
      if (!len) continue;
      let t = ((p.x - A[0]) * (B[0] - A[0]) + (p.y - A[1]) * (B[1] - A[1])) / (len * len);
      t = Math.max((s0 - st.cum[j - 1]) / len, Math.min((s1 - st.cum[j - 1]) / len, clamp(t, 0, 1)));
      const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, d = Math.hypot(p.x - x, p.y - y);
      if (d < best.d) best = {d, s:st.cum[j - 1] + t * len};
    }
    return best;
  }
  function strokePath(c, st, s0 = 0, s1 = st.L){
    c.beginPath();
    const p = at(st, s0); c.moveTo(p.x, p.y);
    for (let j = 1; j < st.pts.length; j++) if (st.cum[j] > s0 && st.cum[j] < s1) c.lineTo(st.pts[j][0], st.pts[j][1]);
    const q = at(st, s1); c.lineTo(q.x, q.y);
  }
  function dotAt(c, x, y, r, fill){ c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
  function draw(){
    if (!gctx || !strokes.length) return;
    let c = gctx;
    const k = demoView ? demoView.k : cur.k, prog = demoView ? demoView.prog : cur.prog;
    c.clearRect(0, 0, W, H); mctx.clearRect(0, 0, W, H);
    // the writing boxes (日字格): a box with a dashed middle line for every digit
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const bx of shape.boxes){
      const x = ox + (bx - 0.08) * u, w = 1.16 * u;
      c.setLineDash([]); c.lineWidth = 3; c.strokeStyle = '#a6dcbc'; c.strokeRect(x, oy - 0.06 * u, w, 2.12 * u);
      c.setLineDash([10, 9]); c.lineWidth = 2; c.strokeStyle = '#c4ead3';
      c.beginPath(); c.moveTo(x, oy + u); c.lineTo(x + w, oy + u); c.stroke();
      c.beginPath(); c.moveTo(x + w / 2, oy - 0.06 * u); c.lineTo(x + w / 2, oy + 2.06 * u); c.stroke();
    }
    c.setLineDash([]);
    const body = 0.24 * u;
    strokes.forEach((st, j) => {
      const done = won || j < k;
      strokePath(c, st); c.lineWidth = body; c.strokeStyle = done ? '#22c07a' : j === k ? '#d9d1fb' : '#ebe7fc'; c.stroke();
    });
    if (won) return;
    const st = strokes[k];
    if (!st) return;
    if (prog > 0){ strokePath(c, st, 0, prog * st.L); c.lineWidth = body; c.strokeStyle = '#7fdcaa'; c.stroke(); }
    // arrows, numbers and dots go on the top layer, above the child's ink
    c = mctx; c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#7b61ff'; c.lineWidth = Math.max(2.5, u * 0.045);
    const step = Math.max(0.45 * u, 24), ar = Math.max(0.1 * u, 7);
    for (let s = prog * st.L + step * 0.7; s < st.L - step * 0.25; s += step){
      const p = at(st, s);
      c.beginPath(); c.moveTo(p.x - ar * (p.dx - p.dy * 0.8), p.y - ar * (p.dy + p.dx * 0.8)); c.lineTo(p.x, p.y);
      c.lineTo(p.x - ar * (p.dx + p.dy * 0.8), p.y - ar * (p.dy - p.dx * 0.8)); c.stroke();
    }
    const R0 = Math.max(0.15 * u, 12);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const [sx, sy] = st.pts[0];
    const resume = prog * st.L > R0 * 1.8;
    // the start of the next stroke (4 and 5 have two strokes)
    const nx = strokes[k + 1];
    if (nx){
      let [x, y] = nx.pts[0];
      for (let d = R0; Math.hypot(x - sx, y - sy) < R0 * 2 && d <= nx.L * 0.7; d += R0 * 0.5){ const q = at(nx, d); x = q.x; y = q.y; }
      dotAt(c, x, y, R0 * 0.7, 'rgba(165,151,238,.75)');
      c.fillStyle = '#fff'; c.font = `700 ${Math.round(R0 * 0.9)}px Fredoka, sans-serif`; c.fillText(String(k + 2), x, y + 1);
    }
    if (resume){ const p = at(st, prog * st.L); dotAt(c, p.x, p.y, R0 * 0.75, '#22c07a'); }
    dotAt(c, sx, sy, R0, prog > 0 ? '#9fe6c1' : '#22c07a');
    c.fillStyle = '#fff'; c.font = `700 ${Math.round(R0 * 1.15)}px Fredoka, sans-serif`; c.fillText(String(k + 1), sx, sy + 1);
    if (demoView) dotAt(c, demoView.x, demoView.y, R0 * 0.9, 'rgba(255,176,46,.9)');
  }
  let drawQueued = false;
  const redraw = () => { if (drawQueued) return; drawQueued = true; requestAnimationFrame(() => { drawQueued = false; draw(); }); };
  // "Show me": a dot travels along every stroke in order
  function demo(auto){
    const my = ++demoRun;
    demoView = null;
    if ((auto && calm) || !strokes.length){ redraw(); return; }
    let j = 0, t0 = performance.now();
    const tick = now => {
      if (my !== demoRun || !ctx.alive()) return;
      const st = strokes[j];
      const f = Math.min(1, (now - t0) / Math.max(500, st.L / u * 600));
      const p = at(st, f * st.L);
      demoView = {k:j, prog:f, x:p.x, y:p.y};
      draw();
      if (f >= 1 && ++j >= strokes.length){ demoView = null; draw(); return; }
      if (f >= 1) t0 = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const stopDemo = () => { demoRun++; if (demoView){ demoView = null; draw(); } };
  function clearInk(){ if (ictx) ictx.clearRect(0, 0, W, H); }
  function restart(){ stopDemo(); cur.k = 0; cur.prog = 0; mode = null; clearInk(); draw(); if (window.__traceGuide) window.__traceGuide.k = 0; }
  function hint(text, speech){
    if (Date.now() - lastHint < 2500) return;
    lastHint = Date.now(); Sfx.bad(); wiggle(wrap); say(text, speech);
  }
  function fail(text, speech){ fails++; mode = null; clearInk(); hint(text, speech); draw(); }
  function strokeDone(){
    cur.k++; cur.prog = 0; offRun = 0; Sfx.tick(cur.k); clearInk();
    if (window.__traceGuide) window.__traceGuide.k = cur.k;
    if (cur.k >= strokes.length){ mode = null; success(); return; }
    mode = 'between';
    draw();
  }
  function success(){
    won = true; Sfx.good(); wrap.classList.add('win'); burst(wrap); draw();
    const d = items[i];
    ctx.progress((i + 1) / items.length);
    const pr = pick(praises());
    afterSay(say(pr, [pr, d.length === 1 ? P.rhyme(d) : P.n(+d)]), 1300, () => { i++; if (i >= items.length) ctx.done(); else startItem(); });
  }
  function startItem(){
    if (i >= items.length){ ctx.progress(1); later(ctx.done, 300); return; }
    if (i > 0) ctx.save({r:i});
    won = false; fails = 0; cur.k = 0; cur.prog = 0; mode = null; wrap.classList.remove('win');
    const d = items[i];
    shape = writeOut(d);
    topPic.textContent = d.length === 1 ? TEXT.zh.RHYME_PIC[d] : '🔟';
    topLabel.textContent = d.length === 1 ? P.rhymeShow(d) : d;
    counter.textContent = `${i + 1} / ${items.length}`;
    clearInk(); place(); draw();
    ctx.progress(i / items.length);
    const how = i === 0 ? [T.howToTrace] : [];
    const prompt = () => { demo(true); return say(P.writeShow(d), [T.writeThis, P.n(+d), ...how]); };
    quizHook('trace', d);
    if (window.__quiz) window.__pass = () => { if (!won) success(); };   // test hook
    ctx.replay = prompt; prompt();
  }
  function ink1(p, q){
    hue = (hue + 3) % 360;
    ictx.strokeStyle = `hsl(${hue}, 85%, 55%)`; ictx.lineWidth = 0.2 * u; ictx.lineCap = 'round'; ictx.lineJoin = 'round';
    ictx.beginPath(); ictx.moveTo(p.x, p.y); ictx.lineTo(q.x, q.y); ictx.stroke();
  }
  const onDone = p => strokes.slice(0, cur.k).some(st => closest(st, p, 0, st.L).d <= tol());
  function begin(p, chain){
    const st = strokes[cur.k];
    const head = at(st, cur.prog * st.L);
    if (Math.hypot(p.x - head.x, p.y - head.y) <= near()){ mode = 'trace'; offRun = 0; moved = 0; went = 0; from = cur.prog * st.L; chained = !!chain; return true; }
    return false;
  }
  function wrongWay(){
    const st = strokes[cur.k];
    if (chained && cur.prog * st.L - from < 0.12 * u){ cur.prog = from / st.L; mode = 'between'; redraw(); return; }
    fail(SHOW.followArrow, T.followArrow);
  }
  function follow(p){
    const st = strokes[cur.k], s = cur.prog * st.L, step = Math.hypot(p.x - last.x, p.y - last.y);
    went += step;
    if (s - from >= 0.12 * u) chained = false;
    if (went > 0.65 * u && s - from < 0.12 * u){ wrongWay(); return; }
    if (s > from) moved += step;
    if (moved > 3 * (s - from) + 0.8 * u){ fail(SHOW.followArrow, T.followArrow); return; }
    const c = closest(st, p, Math.max(0, s - 0.5 * u), Math.min(st.L, s + 1.1 * u));
    if (c.d <= tol()){
      offRun = 0;
      if (c.s > s){ cur.prog = c.s / st.L; redraw(); }
      if (cur.prog * st.L >= st.L - Math.min(0.3 * u, 0.2 * st.L)) strokeDone();
    } else {
      offRun += step;
      if (offRun > 0.6 * u) wrongWay();
    }
  }
  function moveTo(p){
    ink1(last, p);
    if (mode === 'trace') follow(p);
    else if (mode === 'between' && !begin(p, true) && !onDone(p)){
      wander += Math.hypot(p.x - last.x, p.y - last.y);
      if (wander > 0.6 * u) mode = null;
    }
    last = p;
  }
  onStrokes(ink, {
    down: p => {
      if (won || !ictx || !strokes.length) return false;
      stopDemo(); last = p; wander = 0;
      if (begin(p) || (cur.k > 0 && onDone(p) && !begin(p, true))){ if (!mode && !won) mode = 'between'; if (mode) ink1(p, {x:p.x + 0.1, y:p.y}); }
      else { mode = null; hint(SHOW.startDot, T.startDot); draw(); }
    },
    move: p => {
      if (!mode || won){ last = p; return; }
      // a long way between two reports (a quick finger, a busy device) is taken in short steps, as a finger moves:
      // in one long step, a "1" written quickly would look like a finger going nowhere
      const a = last, parts = Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / (0.15 * u)) || 1;
      for (let j = 1; j <= parts && mode && !won; j++) moveTo(j === parts ? p : {x:a.x + (p.x - a.x) * j / parts, y:a.y + (p.y - a.y) * j / parts});
      last = p;
    },
    up: () => {
      if (won || mode !== 'trace'){ mode = null; if (!won) clearInk(); return; }
      mode = null;
      const st = strokes[cur.k], gained = cur.prog * st.L - from;
      if (cur.prog >= 0.8) strokeDone();
      else if (gained < 0.15 * u && went > 0.3 * u){ if (chained){ cur.prog = from / st.L; draw(); } else fail(SHOW.followArrow, T.followArrow); }
      else if (cur.prog > 0.05){ say(SHOW.toTheEnd, T.toTheEnd); draw(); }
    },
  });
  const resized = () => { const r = wrap.getBoundingClientRect(); if (Math.round(r.width) !== W || Math.round(r.height) !== H) layout(); };
  watchSize(wrap, resized);
  layout();
  startItem();
};
PHRASES.write = (l, a) => [T.writeThis, T.howToTrace, T.startDot, T.followArrow, T.toTheEnd,
  ...a.digits.flatMap(d => [P.n(+d), ...(d.length === 1 ? [P.rhyme(d)] : [])])];

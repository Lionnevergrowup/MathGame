'use strict';
/* =====================================================================
   GAMES (4/4) — 认识立体图形 shape, 十和几 · 计数器 tens, 数的顺序 numline,
   凑十法 maketen; then the names of the games and every line 乐乐 says.
   ===================================================================== */

/* =====================================================================
   认识立体图形 shape: name the shape of things, find a shape, count shapes
   ===================================================================== */
const ITEMS_OF = s => Object.keys(SHAPE_ITEMS).filter(k => SHAPE_ITEMS[k].shape === s);
GAMES.shape = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const types = a.mode === 'mix' ? ['name', 'find', 'count'] : [a.mode];
  const plan = range(0, n - 1).map(r => {
    const t = types[r % types.length];
    const s = SHAPES[(r + Math.floor(R() * 4)) % 4];
    if (t === 'count'){
      // a heap of shapes: some of the one asked about, the others mixed in
      const want = 2 + Math.floor(R() * (hard(r) ? 5 : 3));
      const others = range(1, 3 + Math.floor(R() * 4)).map(() => pick(SHAPES.filter(x => x !== s), R));
      return {t, s, want, heap:shuffle([...range(1, want).map(() => s), ...others], R)};
    }
    return {t, s, item:pick(ITEMS_OF(s), R), others:shuffle(SHAPES.filter(x => x !== s), R).slice(0, hard(r) ? 3 : 2)};
  });
  const r0 = startAt(ctx);
  if (r0 >= 0 || a.mode !== 'name') round(Math.max(0, r0));
  else learnCards(ctx, SHAPES.map(s => ({label:P.shapeName(s), cls:'shape-card', body:[shapeSvg(s), h('span', {class:'shape-name'}, shapeWord(s)), h('span', {class:'shape-ex'}, ITEMS_OF(s).map(k => SHAPE_ITEMS[k].e).join(''))],
    say:() => say(P.shapeName(s) + ' ' + ITEMS_OF(s).map(k => SHAPE_ITEMS[k].e).join(''), P.shapeLearn(s))})), {intro:() => say(SHOW.tapEachCard, T.tapEachCard), onStart:() => round(0)});
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r];
    if (q.t === 'name'){
      // what shape is this thing?
      const it = SHAPE_ITEMS[q.item];
      const ask = [P.itemName(q.item), T.whatShape];
      quizHook('shapename', q.s);
      choiceRound(ctx, {opts:shuffle([q.s, ...q.others]), answer:q.s, r, total:n, cards:true, cls:'shape-choice', top:h('div', {class:'shape-thing'}, it.e),
        label:s => h('span', {class:'sc'}, shapeSvg(s), h('span', {class:'shape-name'}, shapeWord(s))),
        prompt:() => say(P.itemNameShow(q.item) + ' ' + U.whatShape, ask), right:pr => [pr, P.shapeItemA(q.item)], wrong:() => ask, next:() => round(r + 1)});
    } else if (q.t === 'find'){
      // which thing is a cylinder?
      const opts = shuffle([q.item, ...q.others.map(s => pick(ITEMS_OF(s)))]);
      const ask = P.findShape(q.s);
      quizHook('shapefind', q.item);
      choiceRound(ctx, {opts, answer:q.item, r, total:n, cards:true, cls:'thing-choice', top:h('div', {class:'shape-ask'}, shapeSvg(q.s), h('span', {class:'shape-name'}, shapeWord(q.s))),
        label:k => SHAPE_ITEMS[k].e, prompt:() => say(ask, ask), right:pr => [pr, P.shapeItemA(q.item)], wrong:k => [P.shapeItemA(k), ask], next:() => round(r + 1)});
    } else {
      // how many cubes are in the heap?
      const heap = h('div', {class:'heap'}, q.heap.map(s => h('span', {class:'heap-item', style:{transform:`rotate(${Math.round((Math.random() - 0.5) * 30)}deg)`}}, shapeSvg(s))));
      const ask = P.countShape(q.s);
      quizHook('shapecount', q.want);
      choiceRound(ctx, {opts:numChoices(q.want, r, 0, 10), answer:q.want, r, total:n, top:h('div', {class:'shape-count'}, h('div', {class:'shape-ask small'}, shapeSvg(q.s), h('span', {class:'shape-name'}, shapeWord(q.s))), heap),
        prompt:() => say(ask, ask), right:pr => [pr, P.countShapeA(q.s, q.want)], wrong:() => [T.countAgain], next:() => round(r + 1)});
    }
  }
};
// a shape's name, with pinyin in Chinese
function shapeWord(s){
  if (LANG !== 'zh') return P.shapeName(s);
  const [c, p] = TEXT.zh.SHAPE_PY[s];
  return h('span', {class:'rt'}, [...c].map((ch, i) => h('span', {class:'rb'}, h('span', {class:'p'}, p.split(' ')[i]), h('span', {class:'c'}, ch))));
}
PHRASES.shape = () => {
  const out = [T.tapEachCard, T.whatShape, T.countAgain];
  for (const s of SHAPES){ out.push(P.shapeName(s), P.shapeLearn(s), P.findShape(s), P.countShape(s)); for (let k = 0; k <= 10; k++) out.push(P.countShapeA(s, k)); }
  for (const k of Object.keys(SHAPE_ITEMS)) out.push(P.itemName(k), P.shapeItemA(k));
  return out;
};

/* =====================================================================
   十和几 tens: bundles of ten sticks and single sticks (11–20); 计数器 the abacus
   ===================================================================== */
GAMES.tens = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6), abacus = a.mode === 'abacus';
  const types = abacus ? ['read', 'make', 'place'] : ['read', 'ones', 'which'];
  const plan = typePlan(n, types, R).map(t => ({t, v:pick(range(abacus ? 10 : 11, t === 'ones' ? 19 : 20), R), tens:R() < 0.5}));
  const r0 = startAt(ctx);
  if (r0 >= 0) round(r0);
  else if (abacus) learnAbacus();
  else learnSticks();
  // ten single sticks are tied into one bundle: ten ones make one ten
  function learnSticks(){
    const holder = h('div', {class:'demo sticks-demo'});
    learnShow(ctx, {body:holder, play:async () => {
      const id = navId;
      holder.replaceChildren(sticksSvg(0, 10));
      await say(SHOW.tenSticks, T.tenSticks);
      if (id !== navId) return;
      Sfx.pop(); holder.replaceChildren(sticksSvg(1, 0));
      await say(SHOW.tenOnes, T.tenOnes);
      if (id !== navId) return;
      holder.replaceChildren(sticksSvg(1, 3), h('div', {class:'eq'}, h('span', {class:'eq-n'}, '10'), h('span', {class:'eq-op'}, '+'), h('span', {class:'eq-n'}, '3'), h('span', {class:'eq-op'}, '='), h('span', {class:'eq-n'}, '13')));
      await say('10 + 3 = 13', P.teenA(13));
    }, onStart:() => round(0)});
  }
  // the abacus: the right rod is the ones, the next one the tens
  function learnAbacus(){
    learnCards(ctx, [['ones', 1, 3], ['tens', 1, 0]].map(([w, t, o]) => ({label:U[w + 'Place'], cls:'abacus-card', body:[abacusSvg(t, o), h('span', {class:'shape-name'}, U[w + 'Place'])],
      say:() => say(U[w + 'Place'], T[w + 'Rod'])})), {intro:() => say(SHOW.abacusIntro, [T.abacusIntro, T.tapEachCard]), onStart:() => round(0)});
  }
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], t10 = Math.floor(q.v / 10), o1 = q.v % 10;
    if (q.t === 'read'){
      quizHook('read', q.v);
      choiceRound(ctx, {opts:numChoices(q.v, r, 10, 20), answer:q.v, r, total:n, top:abacus ? abacusSvg(t10, o1) : sticksSvg(t10, o1),
        prompt:() => say(SHOW.whatNumber, T.whatNumber), right:pr => [pr, P.teenA(q.v)], wrong:() => [abacus ? T.countBeads : T.countSticks], next:() => round(r + 1)});
    } else if (q.t === 'ones'){
      // 13 is one ten and how many ones?
      const ask = P.onesQ(q.v);
      quizHook('ones', o1);
      choiceRound(ctx, {opts:numChoices(o1, r, 0, 10), answer:o1, r, total:n, top:h('div', {class:'target'}, h('span', {class:'big-digit'}, String(q.v)), sticksSvg(t10, 0), h('span', {class:'pic-op'}, '+ ?')),
        prompt:() => say(showDigits(ask), ask), right:pr => [pr, P.teenA(q.v)], wrong:() => [ask], next:() => round(r + 1)});
    } else if (q.t === 'which'){
      // which picture shows 16?
      const opts = shuffle(uniq([q.v, ...numChoices(q.v, r, 10, 20)]).slice(0, hard(r) ? 4 : 3));
      const ask = P.whichPicture(q.v);
      quizHook('which', q.v);
      choiceRound(ctx, {opts, answer:q.v, r, total:n, cards:true, cls:'sticks-choice', top:h('div', {class:'target'}, h('span', {class:'big-digit'}, String(q.v))),
        label:v => sticksSvg(Math.floor(v / 10), v % 10), prompt:() => say(showDigits(ask), ask), right:pr => [pr, P.teenA(q.v)], wrong:k => [P.teenA(k), ask], next:() => round(r + 1)});
    } else if (q.t === 'place'){
      // in 15, what is in the tens place? the ones place?
      const ans = q.tens ? t10 : o1, ask = q.tens ? P.tensQ(q.v) : P.onesQ2(q.v);
      quizHook('placevalue', ans);
      choiceRound(ctx, {opts:numChoices(ans, r, 0, 9), answer:ans, r, total:n, top:h('div', {class:'target'}, h('span', {class:'big-digit tw'}, h('span', {class:q.tens ? 'hl' : ''}, String(t10)), h('span', {class:q.tens ? '' : 'hl'}, String(o1))), abacusSvg(t10, o1)),
        prompt:() => say(showDigits(ask), ask), right:pr => [pr, P.teenA(q.v)], wrong:() => [ask], next:() => round(r + 1)});
    } else makeRound(r, q);
  }
  // put beads on the abacus to show a number
  function makeRound(r, q){
    let tens = 0, ones = 0, solved = false;
    const box = h('div', {class:'abacus-box'});
    const redraw = () => box.replaceChildren(abacusSvg(tens, ones));
    const addT = h('button', {class:'btn blue rod-btn', 'data-v':'__tens', onclick:() => { if (solved) return; Sfx.tap(); if (tens >= 2){ wiggle(box); return; } tens++; redraw(); Speech.speak(P.n(tens * 10 + ones)); }}, U.tensPlace + ' +1');
    const addO = h('button', {class:'btn pink rod-btn', 'data-v':'__ones', onclick:() => { if (solved) return; Sfx.tap(); if (ones >= 9){ wiggle(box); return; } ones++; redraw(); Speech.speak(P.n(tens * 10 + ones)); }}, U.onesPlace + ' +1');
    const clr = h('button', {class:'btn white', onclick:() => { if (solved) return; Sfx.pop(); tens = 0; ones = 0; redraw(); }}, U.clearBeads);
    const doneBtn = h('button', {class:'btn green big', 'data-v':'__done', onclick:() => {
      if (solved) return;
      if (tens * 10 + ones === q.v){
        solved = true; Sfx.good(); box.classList.add('win'); burst(box);
        ctx.progress((r + 1) / n);
        const pr = pick(praises());
        afterSay(say(pr, [pr, P.teenA(q.v)]), 1200, () => round(r + 1));
      } else { Sfx.bad(); wiggle(box); say(tens * 10 + ones > q.v ? SHOW.tooMany : SHOW.tooFew, tens * 10 + ones > q.v ? T.tooMany : T.tooFew); }
    }}, U.doneCheck);
    const prompt = () => say(P.makeAbacusShow(q.v), P.makeAbacus(q.v));
    ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt), h('div', {class:'target'}, h('span', {class:'big-digit'}, String(q.v)))), box, h('div', {class:'row'}, addT, addO, clr), doneBtn);
    redraw();
    quizHook('make', q.v, [...range(1, Math.floor(q.v / 10)).map(() => '__tens'), ...(q.v % 10 ? range(1, q.v % 10) : []).map(() => '__ones'), '__done']);
    ctx.replay = prompt; prompt();
  }
};
PHRASES.tens = (l, a) => {
  const out = [T.tenSticks, T.tenOnes, T.whatNumber, T.countBeads, T.countSticks, T.abacusIntro, T.onesRod, T.tensRod, T.tapEachCard, T.tooMany, T.tooFew];
  for (let v = 10; v <= 20; v++) out.push(P.teenA(v), P.onesQ(v), P.whichPicture(v), P.tensQ(v), P.onesQ2(v), P.makeAbacus(v), P.n(v));
  for (let v = 0; v <= 9; v++) out.push(P.n(v));
  return out;
};

/* =====================================================================
   数的顺序 numline: before, after, between, and the missing number on a number track
   ===================================================================== */
GAMES.numline = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const plan = typePlan(n, ['after', 'before', 'between', 'gap'], R).map(t => {
    const v = t === 'after' ? a.min + Math.floor(R() * (a.max - a.min)) : t === 'before' ? a.min + 1 + Math.floor(R() * (a.max - a.min)) : a.min + 1 + Math.floor(R() * (a.max - a.min - 1));
    return {t, v};
  });
  round(Math.max(0, startAt(ctx)));
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r];
    const ans = q.t === 'after' ? q.v + 1 : q.t === 'before' ? q.v - 1 : q.v;
    // a stretch of the number track around the answer, the answer hidden
    const from = clamp(ans - 3 + Math.floor(Math.random() * 3), a.min, a.max - 5), cells = range(from, Math.min(a.max, from + 5));
    const track = h('div', {class:'numtrack'}, cells.map(v => h('span', {class:'cell' + (v === ans ? ' ask' : '') + (q.t !== 'gap' && v === q.v && q.t !== 'between' ? ' ref' : '') + (q.t === 'between' && Math.abs(v - ans) === 1 ? ' ref' : '')}, v === ans ? '?' : String(v))));
    const ask = q.t === 'after' ? P.afterQ(q.v) : q.t === 'before' ? P.beforeQ(q.v) : q.t === 'between' ? P.betweenQ(ans - 1, ans + 1) : T.whatMissing, askShow = showDigits(ask);
    quizHook(q.t, ans);
    choiceRound(ctx, {opts:numChoices(ans, r, a.min, a.max), answer:ans, r, total:n, top:track,
      prompt:() => say(askShow, ask), right:pr => [pr, q.t === 'after' ? P.afterA(q.v) : q.t === 'before' ? P.beforeA(q.v) : P.n(ans)],
      wrong:() => [ask], onRight:() => { const c = track.querySelector('.ask'); c.textContent = String(ans); c.classList.add('found'); }, next:() => round(r + 1)});
  }
};
PHRASES.numline = (l, a) => {
  const out = [T.whatMissing];
  for (let v = a.min; v <= a.max; v++){
    out.push(P.n(v));
    if (v < a.max) out.push(P.afterQ(v), P.afterA(v));
    if (v > a.min) out.push(P.beforeQ(v), P.beforeA(v));
    if (v > a.min && v < a.max) out.push(P.betweenQ(v - 1, v + 1));
  }
  return out;
};

/* =====================================================================
   凑十法 maketen: 9 + 4 → 9 and 1 make 10, 4 is 1 and 3, 10 + 3 = 13
   ===================================================================== */
GAMES.maketen = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(5, 2);
  const plan = roundList(a.pairs, n, R);
  const total = n * 3;
  const r0 = startAt(ctx);
  if (r0 >= 0) round(r0);
  else demo();
  // the frame: the big number in red, the small one in blue beside it; then blue counters fill up the ten
  function picture(big, small, moved){
    const cells = range(0, 9).map(i => i < big ? 'r' : i < big + moved ? 'b' : null);
    return h('div', {class:'maketen-pic'}, tenFrame(cells, {want:moved ? [] : range(big, 9)}), counters(small - moved, 'b'));
  }
  async function walk(x, y, holder, speak){
    const big = Math.max(x, y), small = Math.min(x, y), need = 10 - big;
    holder.replaceChildren(picture(big, small, 0), eqEl(eq([x, y], ['+'])));
    if (x < y) await speak(SHOW.lookBig, [T.swapRule, P.lookBig(big)]);
    await speak(P.needShow(big), P.makeTenA(big));
    holder.replaceChildren(picture(big, small, need), eqEl(eq([x, y], ['+'])));
    Sfx.pop();
    await speak(`${small} → ${need} + ${small - need}`, P.splitA(small, need, small - need));
    await speak(`10 + ${small - need} = ${10 + small - need}`, P.eqA(eq([10, small - need], ['+'])));
    fillBox(holder, x + y); Sfx.good();
    await speak(`${x} + ${y} = ${x + y}`, P.eqA(eq([x, y], ['+'])));
  }
  function demo(){
    const [x, y] = a.demo, holder = h('div', {class:'demo'});
    learnShow(ctx, {body:holder, play:async () => {
      const id = navId;
      await say(SHOW.makeTenRule, T.makeTenRule);
      if (id !== navId) return;
      await walk(x, y, holder, (text, speech) => id === navId ? say(text, speech) : Promise.resolve());
    }, onStart:() => round(0)});
  }
  // each sum in three steps
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    const [x, y] = plan[r], big = Math.max(x, y), small = Math.min(x, y), need = 10 - big, rest = small - need;
    const e = eq([x, y], ['+']);
    const step = (k, {ans, ask, askShow, right, moved, low, high, sumBox}) => {
      ctx.progress((r * 3 + k) / total);
      const top = h('div', {class:'calc-q'}, picture(big, small, moved), sumBox || eqEl(e));
      quizHook('maketen' + k, ans);
      choiceRound(ctx, {opts:numChoices(ans, hard(r) ? 2 : 0, low, high), answer:ans, r:r * 3 + k, total, top,
        prompt:() => say(askShow, k === 0 && x < y ? [T.swapRule, P.lookBig(big), ask] : ask), right:pr => [pr, right], wrong:() => [ask], next:() => {
          if (k === 0) step(1, {ans:rest, ask:P.splitQ(small, need), askShow:`${small} → ${need} + ?`, right:P.splitA(small, need, rest), moved:need, low:0, high:9});
          else if (k === 1) step(2, {ans:10 + rest, ask:P.eqQ(eq([10, rest], ['+'])), askShow:`10 + ${rest} = ?`, right:P.eqA(eq([10, rest], ['+'])), moved:need, low:10, high:20, sumBox:eqEl(eq([10, rest], ['+']))});
          else { ctx.progress((r * 3 + 3) / total); say(`${x} + ${y} = ${x + y}`, P.eqA(e)).then(() => later(() => round(r + 1), 400)); }
        }});
    };
    step(0, {ans:need, ask:P.makeTenQ(big), askShow:`${big} + ? = 10`, right:P.makeTenA(big), moved:0, low:0, high:9});
  }
};
PHRASES.maketen = (l, a) => {
  const out = [T.makeTenRule, T.swapRule];
  for (const [x, y] of a.pairs){
    const big = Math.max(x, y), small = Math.min(x, y), need = 10 - big, rest = small - need;
    out.push(P.lookBig(big), P.makeTenQ(big), P.makeTenA(big), P.splitQ(small, need), P.splitA(small, need, rest),
      P.eqQ(eq([10, rest], ['+'])), P.eqA(eq([10, rest], ['+'])), P.eqA(eq([x, y], ['+'])));
  }
  return out;
};

/* =====================================================================
   The games' names, icons and colours (some games have a different name in some lessons)
   ===================================================================== */
const ACT_INFO = {
  count:   ['🔢', 'var(--purple)'],
  place:   ['🧺', 'var(--orange)'],
  draw:    ['🎨', 'var(--yellow)'],
  write:   ['✏️', 'var(--teal)'],
  more:    ['⚖️', 'var(--blue)'],
  length:  ['📏', 'var(--green)'],
  pos:     ['📍', 'var(--pink)'],
  sort:    ['🗂️', 'var(--orange)'],
  signs:   ['🐊', 'var(--green)'],
  order:   ['🪜', 'var(--blue)'],
  ordinal: ['🥇', 'var(--gold)'],
  bond:    ['🍑', 'var(--pink)'],
  pairs:   ['🃏', 'var(--purple)'],
  calc:    ['🧮', 'var(--blue)'],
  train:   ['🚂', 'var(--red)'],
  story:   ['📖', 'var(--teal)'],
  shape:   ['🧊', 'var(--purple)'],
  tens:    ['🔟', 'var(--orange)'],
  numline: ['🛤️', 'var(--green)'],
  maketen: ['🔟', 'var(--pink)'],
};
function actInfo(l, a){
  const [icon, color] = ACT_INFO[a.type];
  let ic = icon;
  if (a.type === 'length' && a.what === 'building') ic = '🏢';
  if (a.type === 'pos') ic = {ud:'↕️', lr:'↔️', fb:'🏃', mix:'📍'}[a.axis];
  if (a.type === 'shape') ic = {name:'🧊', find:'🔍', count:'🔢', mix:'🧊'}[a.mode];
  if (a.type === 'tens' && a.mode === 'abacus') ic = '🧮';
  if (a.type === 'calc') ic = a.ops === '+' ? '➕' : a.ops === '-' ? '➖' : '🧮';
  if (a.type === 'signs' && !a.pics) ic = '⚖️';
  if (a.type === 'sort' && a.by === 'color') ic = '🎨';
  if (a.type === 'sort' && a.by === 'size') ic = '🐘';
  if (a.type === 'sort' && (a.by === 'shape' || a.by === 'mix')) ic = '🗂️';
  if (a.type === 'ordinal' && a.mode === 'few') ic = '👑';
  if (a.type === 'ordinal' && a.mode === 'rank') ic = '🏅';
  return [U.actName(a), ic, color];
}

/* =====================================================================
   PHRASES — every line 乐乐 can say, for tools/build_audio.py
   ===================================================================== */
function globalPhrases(){
  const t = TEXT[LANG];
  return uniq([
    ...Object.values(t.T), ...t.PRAISE, ...t.TRY,
    ...range(0, 20).map(P.n),
    ...DRAW_COLORS.map(c => P.colorName(c[0])),
    ...LESSONS.map((l, k) => P.haveStickers(k + 1)),
    ...uniq(LESSONS.flatMap(l => l.acts.map(a => actName(l, a)))).map(P.playAct),
    ...SHAPES.map(P.shapeName),
  ].map(norm).filter(Boolean));
}
function lessonPhrases(l){
  const name = stickerName(l.n);
  return uniq([
    P.lesson(l.n), P.playLesson(l.n), P.finished(l.n), P.gotSticker(name), P.aSticker(name), P.finishFor(l.n), P.intro(l.n),
    ...l.acts.map(a => P.playAct(actName(l, a))),
    ...l.acts.flatMap(a => PHRASES[a.type](l, a)),
  ].map(norm).filter(Boolean));
}
function allPhrases(lang){
  const keep = LANG;
  LANG = lang || LANG;
  try { return uniq([...globalPhrases(), ...LESSONS.flatMap(lessonPhrases)]); } finally { LANG = keep; }
}
window.__mgPhrases = allPhrases;
window.__mgActs = n => LESSON_BY_N[n].acts.map(a => a.key);

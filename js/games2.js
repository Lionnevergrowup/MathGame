'use strict';
/* =====================================================================
   GAMES (2/4) — 比多少 more, 比长短·高矮 length, 认位置 pos, 分一分 sort,
   比大小 signs, 排一排 order, 第几 ordinal
   ===================================================================== */

/* =====================================================================
   比多少 more: two rows matched one to one — which has more (or fewer)?
   ===================================================================== */
const MORE_PAIRS = [['rabbit', 'carrot'], ['bee', 'flower'], ['cat', 'fish'], ['monkey', 'banana'], ['kid', 'balloon'], ['chick', 'egg']];
GAMES.more = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const plan = [];
  for (let r = 0; r < n; r++){
    const [A, B] = pick(MORE_PAIRS, R);
    const x = 2 + Math.floor(R() * (a.max - 1));
    let y = x;
    if (!(r >= 2 && R() < 0.3)) do { y = 2 + Math.floor(R() * (a.max - 1)); } while (y === x || (r < 2 && Math.abs(y - x) < 2));
    plan.push({A, B, x, y, ask: r === 0 || R() < 0.55 ? 'more' : 'fewer'});
  }
  round(Math.max(0, startAt(ctx)));
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], A = OBJ[q.A], B = OBJ[q.B];
    const cols = Math.max(q.x, q.y);
    const row = (o, k) => h('div', {class:'match-row', style:{'--cols':cols}}, range(1, cols).map(i => h('span', {class:'ob' + (i > k ? ' gap' : '')}, i <= k ? o.e : '')));
    const top = h('div', {class:'match'}, row(A, q.x), row(B, q.y));
    const ans = q.x === q.y ? 'same' : q.ask === 'more' ? (q.x > q.y ? 'A' : 'B') : (q.x < q.y ? 'A' : 'B');
    const word = q.ask === 'more' ? U.more : U.fewer;
    const ask = q.ask === 'more' ? P.moreQ(A, B) : P.fewerQ(A, B);
    const prompt = () => say(ask + ' ' + A.e + B.e, r === 0 ? [T.matchUp, ask] : ask);
    quizHook('more', ans);
    choiceRound(ctx, {opts:['A', 'B', 'same'], answer:ans, r, total:n, top, cards:true, cls:'word-choice',
      label:o => o === 'same' ? U.same : h('span', {}, h('span', {class:'ce'}, (o === 'A' ? A : B).e), ' ', word),
      prompt, right:pr => [pr, ans === 'same' ? T.same : q.ask === 'more' ? P.moreA(ans === 'A' ? A : B) : P.fewerA(ans === 'A' ? A : B)],
      wrong:() => [T.matchUp], next:() => round(r + 1)});
  }
};
PHRASES.more = () => [T.matchUp, T.same, ...MORE_PAIRS.flatMap(([a, b]) => { const A = OBJ[a], B = OBJ[b]; return [P.moreQ(A, B), P.fewerQ(A, B), P.moreA(A), P.moreA(B), P.fewerA(A), P.fewerA(B)]; })];

/* =====================================================================
   比长短 · 比高矮 length: pencils (ends lined up) or buildings (on the same ground)
   ===================================================================== */
const PAINTS = ['red', 'yellow', 'blue', 'green', 'purple'];
GAMES.length = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6), tall = a.what === 'building';
  const plan = [];
  for (let r = 0; r < n; r++){
    const k = hard(r) ? 3 : 2, colors = shuffle(PAINTS, R).slice(0, k);
    const lo = tall ? 80 : 130, hi = tall ? 260 : 340, gap = hard(r) ? 24 : 60;
    let sizes;
    do { sizes = colors.map(() => lo + Math.round(R() * (hi - lo) / 10) * 10); } while (sizes.some((s, i) => sizes.some((t, j) => i !== j && Math.abs(s - t) < gap)));
    plan.push({colors, sizes, big: r === 0 || R() < 0.5});
  }
  round(Math.max(0, startAt(ctx)));
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], k = q.colors.length;
    const best = q.sizes.indexOf(q.big ? Math.max(...q.sizes) : Math.min(...q.sizes));
    const ans = q.colors[best];
    const ask = P.lenQ(a.what, q.big, k);
    const prompt = () => say(ask + (tall ? ' 🏢' : ' ✏️'), r === 0 ? [tall ? T.heightIntro : T.lengthIntro, ask] : ask);
    quizHook('length', ans);
    choiceRound(ctx, {opts:q.colors, answer:ans, r, total:n, cards:true, cls:tall ? 'bld-choice' : 'pencil-choice',
      label:c => { const i = q.colors.indexOf(c); return tall ? buildingSvg(q.sizes[i], c) : pencilSvg(q.sizes[i], c); },
      prompt, right:pr => [pr, P.lenA(a.what, q.big, k, ans)], wrong:() => [tall ? T.heightIntro : T.lengthIntro, ask], next:() => round(r + 1)});
    const box = ctx.stage.querySelector('.choices');
    box.classList.add(tall ? 'ground' : 'stack');
  }
};
PHRASES.length = (l, a) => {
  const out = [a.what === 'building' ? T.heightIntro : T.lengthIntro];
  for (const big of [true, false]) for (const k of [2, 3]){ out.push(P.lenQ(a.what, big, k)); for (const c of PAINTS) out.push(P.lenA(a.what, big, k, c)); }
  return out;
};

/* =====================================================================
   认位置 pos: 上下 on a shelf, 左右 on a table, 前后 in a race
   ===================================================================== */
const POS_SETS = {ud:POS_ANIMALS, lr:POS_FRUITS, fb:POS_RUNNERS};
const POS_WORDS = {ud:['up', 'down'], lr:['left', 'right'], fb:['front', 'back']};
const POS_ARROWS = {up:'⬆️', down:'⬇️', left:'⬅️', right:'➡️', front:'🏁', back:'👣'};
GAMES.pos = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const plan = [];
  for (let r = 0; r < n; r++){
    const axis = a.axis === 'mix' ? ['ud', 'lr', 'fb'][r % 3] : a.axis;
    const items = shuffle(POS_SETS[axis], R).slice(0, 3);
    const t = r === 0 ? 'rel' : (R() < 0.6 ? 'rel' : 'who');
    const [i, j] = shuffle([0, 1, 2], R);
    plan.push({axis, items, t, i, j, end: R() < 0.5 ? 0 : 2, flip: R() < 0.5});
  }
  const r0 = startAt(ctx);
  if (r0 >= 0 || a.axis === 'mix') round(Math.max(0, r0));
  else {
    const [w1, w2] = POS_WORDS[a.axis];
    learnCards(ctx, [w1, w2].map(w => ({label:U.posWord[w], cls:'word-card pos-card', body:[h('span', {class:'pos-arrow'}, POS_ARROWS[w]), posWordEl(w)], say:() => say(U.posWord[w], P.posWord(w))})),
      {intro:() => say(SHOW.tapEachCard, [T['intro_' + a.axis], T.tapEachCard]), onStart:() => round(0)});
  }
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], [w1, w2] = POS_WORDS[q.axis];
    // index 0 is top (ud), left (lr) or the front of the race (fb)
    const X = q.items[q.i], Y = q.items[q.j];
    if (q.t === 'rel'){
      const ans = q.i < q.j ? w1 : w2;
      const ask = P.posQ(q.axis, OBJ[X], OBJ[Y]);
      quizHook('pos', ans);
      choiceRound(ctx, {opts:[w1, w2], answer:ans, r, total:n, cards:true, cls:'word-choice', top:posScene(q, null, [X, Y]),
        label:w => h('span', {}, h('span', {class:'ce'}, POS_ARROWS[w]), ' ', posWordEl(w)),
        prompt:() => say(ask, ask), right:pr => [pr, P.posA(q.axis, OBJ[X], OBJ[Y], ans)], wrong:() => [ask], next:() => round(r + 1)});
    } else {
      const which = q.end === 0 ? w1 : w2, ans = q.items[q.end];
      const ask = P.endQ(q.axis, which);
      quizHook('pos', ans);
      // the things in the picture are the choices
      const btns = [];
      let solved = false, misses = 0;
      const tapItem = (k, b) => e => {
        if (solved || !tapOK(e)) return;
        if (k === ans){
          solved = true; Sfx.good(); b.classList.add('right'); burst(b);
          ctx.progress((r + 1) / n);
          const pr = pick(praises());
          afterSay(say(pr, [pr, P.whoA(OBJ[k], q.axis)]), 1100, () => round(r + 1));
        } else {
          misses++; Sfx.bad(); wiggle(b); say(pick(tries()), [ask]);
          if (misses >= 2) btns.find(x => x.dataset.v === ans).classList.add('hint');
        }
      };
      const prompt = () => say(ask, ask);
      ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt)), posScene(q, (k, b) => { btns.push(b); return tapItem(k, b); }));
      ctx.replay = prompt; prompt();
    }
  }
};
function posWordEl(w){
  const [c, p] = TEXT.zh.POS_HAN[w];
  return LANG === 'zh' ? h('span', {class:'rt'}, [...c].map((ch, i) => h('span', {class:'rb'}, h('span', {class:'p'}, p.split(' ')[i]), h('span', {class:'c'}, ch)))) : h('span', {}, U.posWord[w]);
}
// the picture: a shelf, a table or a race track; tap(k, button) makes the things buttons
function posScene(q, tap, mark = []){
  const thing = (k, cls) => {
    const o = OBJ[k];
    if (!tap) return h('span', {class:'pos-item ' + cls + (mark.includes(k) ? ' marked' + (k === mark[0] ? ' m1' : ' m2') : '')}, o.e);
    const b = h('button', {class:'pos-item ' + cls, 'data-v':k, 'aria-label':nameOf({zh:o.zh, en:o.en})});
    b.addEventListener('click', tap(k, b));
    b.append(o.e);
    return b;
  };
  if (q.axis === 'ud') return h('div', {class:'shelf'}, q.items.map(k => h('div', {class:'shelf-row'}, thing(k, ''))));
  if (q.axis === 'lr') return h('div', {class:'table-scene'}, h('div', {class:'table-top'}, q.items.map(k => thing(k, ''))), h('div', {class:'table-legs'}));
  // the race: the front runner is next to the finish flag, which is on the left or the right
  const runners = q.items.map(k => thing(k, 'runner'));
  return h('div', {class:'race' + (q.flip ? ' to-right' : '')},
    h('span', {class:'finish'}, '🏁'),
    h('div', {class:'runners'}, q.flip ? runners.reverse() : runners));
}
PHRASES.pos = (l, a) => {
  const out = [T.tapEachCard];
  for (const axis of a.axis === 'mix' ? ['ud', 'lr', 'fb'] : [a.axis]){
    out.push(T['intro_' + axis]);
    const [w1, w2] = POS_WORDS[axis];
    out.push(P.posWord(w1), P.posWord(w2), P.endQ(axis, w1), P.endQ(axis, w2));
    for (const X of POS_SETS[axis]){
      out.push(P.whoA(OBJ[X], axis));
      for (const Y of POS_SETS[axis]) if (X !== Y) out.push(P.posQ(axis, OBJ[X], OBJ[Y]), P.posA(axis, OBJ[X], OBJ[Y], w1), P.posA(axis, OBJ[X], OBJ[Y], w2));
    }
  }
  return out;
};

/* =====================================================================
   分一分 sort: put each thing in the right basket, then count a basket
   ===================================================================== */
function sortSetup(by){
  if (by === 'shape') return {bins:SHAPES, items:Object.keys(SHAPE_ITEMS).map(k => ({k, bin:SHAPE_ITEMS[k].shape}))};
  if (by === 'size') return {bins:['big', 'small'], items:SORTS.size.items.flatMap(k => [{k, bin:'big'}, {k, bin:'small'}])};
  const field = by === 'kind' ? 'kind' : 'color';
  return {bins:SORTS[by].bins.map(b => b[0]), items:SORTS[by].items.map(k => ({k, bin:OBJ[k][field]}))};
}
const binIcon = (by, b) => by === 'shape' ? shapeSvg(b) : h('span', {class:'bin-e'}, by === 'size' ? (b === 'big' ? '🐘' : '🐭') : SORTS[by].bins.find(x => x[0] === b)[1]);
const sortItemEl = (by, it) => by === 'shape' ? h('span', {class:'sort-e'}, SHAPE_ITEMS[it.k].e) : h('span', {class:'sort-e' + (by === 'size' ? ' ' + it.bin : '')}, OBJ[it.k].e);
// big or small only shows next to the other one: both are shown, the one to sort is circled
const sortAskEl = (by, it, flip) => by !== 'size' ? sortItemEl(by, it) : h('span', {class:'size-pair'},
  (flip ? ['small', 'big'] : ['big', 'small']).map(b => { const el = sortItemEl(by, {k:it.k, bin:b}); if (b === it.bin) el.classList.add('marked'); return el; }));
GAMES.sort = ctx => {
  const a = ctx.act, R = ctx.rng, by = a.by === 'mix' ? 'shape' : a.by;
  const {bins, items} = sortSetup(by);
  const n = rounds(8, 4);
  // every basket gets something, and no thing comes twice
  let list = [];
  const byBin = bins.map(b => shuffle(items.filter(it => it.bin === b), R));
  for (let i = 0; list.length < n; i++) for (const g of byBin) if (g[i] && list.length < n && !list.some(x => x.k === g[i].k)) list.push(g[i]);
  list = shuffle(list, R);
  const countBin = pick(bins.filter(b => list.some(it => it.bin === b)), R);
  const total = n + 1;
  const got = Object.fromEntries(bins.map(b => [b, []]));
  const binsEl = (onTap) => bins.map(b => {
    const el = h('button', {class:'bin', 'data-v':b, 'aria-label':P.binName(by, b)}, h('span', {class:'bin-head'}, binIcon(by, b), h('span', {class:'bin-name'}, P.binName(by, b))),
      h('span', {class:'bin-in'}, got[b].map(it => sortItemEl(by, it))));
    if (onTap) el.addEventListener('click', e => onTap(b, el, e));
    return el;
  });
  const r0 = startAt(ctx);
  if (r0 >= 0){ list.slice(0, r0).forEach(it => got[it.bin].push(it)); round(r0); }
  else learnCards(ctx, bins.map(b => ({label:P.binName(by, b), cls:'bin-card', body:[binIcon(by, b), h('span', {class:'bin-name'}, P.binName(by, b))], say:() => say(P.binName(by, b), P.binName(by, b))})),
    {intro:() => say(SHOW.sortIntro, [T.sortIntro, T.tapEachCard]), onStart:() => round(0)});
  function round(r){
    if (r >= n) return countRound();
    if (r > 0) ctx.save({r});
    ctx.progress(r / total);
    const it = list[r];
    let solved = false, misses = 0;
    const item = h('div', {class:'sort-item'}, sortAskEl(by, it, Math.random() < 0.5));
    const els = binsEl((b, el, e) => {
      if (solved || !tapOK(e)) return;
      if (b === it.bin){
        solved = true; Sfx.good(); el.classList.add('right'); burst(el);
        got[b].push(it); el.querySelector('.bin-in').append(sortItemEl(by, it)); item.classList.add('gone');
        ctx.progress((r + 1) / total);
        const pr = pick(praises());
        afterSay(say(pr, [pr, P.sortA(by, it)]), 1000, () => round(r + 1));
      } else {
        misses++; Sfx.bad(); wiggle(el); say(pick(tries()), [P.sortAsk(by, it)]);
        if (misses >= 2) els.find(x => x.dataset.v === it.bin).classList.add('hint');
      }
    });
    const prompt = () => say(P.sortAskShow(by, it), P.sortAsk(by, it));
    ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt), item), h('div', {class:'bins'}, els));
    quizHook('sort', it.bin);
    ctx.replay = prompt; prompt();
  }
  // 分一分，数一数: how many are in one basket?
  function countRound(){
    ctx.save({r:n});
    ctx.progress(n / total);
    const c = got[countBin].length;
    const ask = P.binCountQ(by, countBin);
    quizHook('sortcount', c);
    choiceRound(ctx, {opts:numChoices(c, 1, 0, 9), answer:c, r:n, total, top:h('div', {class:'bins small'}, binsEl(null)),
      prompt:() => say(ask, ask), right:pr => [pr, P.binCountA(by, countBin, c)], wrong:() => [T.countAgain], next:() => { ctx.progress(1); later(ctx.done, 300); }});
  }
};
PHRASES.sort = (l, a) => {
  const by = a.by === 'mix' ? 'shape' : a.by, {bins, items} = sortSetup(by);
  const out = [T.sortIntro, T.tapEachCard, T.countAgain];
  for (const b of bins){ out.push(P.binName(by, b), P.binCountQ(by, b)); for (let c = 1; c <= 5; c++) out.push(P.binCountA(by, b, c)); }
  for (const it of items) out.push(P.sortAsk(by, it), P.sortA(by, it));
  return out;
};

/* =====================================================================
   比大小 signs: > < = between two numbers (with pictures first), and the biggest / smallest number
   ===================================================================== */
// pairs to compare: numbers close together (and some equal ones)
function comparePairs(lo, hi){
  const out = [];
  for (let x = lo; x <= hi; x++) for (let y = lo; y <= hi; y++) if (Math.abs(x - y) <= (hi <= 5 ? 5 : 4)) out.push([x, y]);
  return out;
}
const signOf = (x, y) => x > y ? 'gt' : x < y ? 'lt' : 'eq';
GAMES.signs = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6), lo = a.min || 0, hi = a.max;
  const pairs = comparePairs(lo, hi);
  const types = a.pics ? ['pic', 'pic', 'num'] : ['num', 'big', 'small'];
  const plan = typePlan(n, a.pics ? ['pic', 'num'] : types, R).map((t, r) => {
    if (t === 'big' || t === 'small'){
      const k = hard(r) ? 4 : 3;
      return {t, nums:shuffle(range(lo, hi), R).slice(0, k)};
    }
    let p = pick(pairs, R);
    if (r < 2) while (p[0] === p[1]) p = pick(pairs, R);
    return {t, x:p[0], y:p[1], o:pick(['apple', 'star', 'duck', 'flower'], R)};
  });
  const r0 = startAt(ctx);
  if (r0 >= 0 || !a.pics) round(Math.max(0, r0));
  else learnCards(ctx, ['gt', 'lt', 'eq'].map(s => ({label:SIGN_TEXT[s], cls:'sign-card', body:[h('span', {class:'big-sign'}, SIGN_TEXT[s]), h('span', {class:'sign-ex'}, s === 'gt' ? '5 > 3' : s === 'lt' ? '2 < 4' : '3 = 3'), h('span', {class:'sign-name'}, U.signName[s])],
    say:() => say(SIGN_TEXT[s] + ' ' + U.signName[s], T['sign_' + s])})), {intro:() => say(SHOW.tapEachCard, T.tapEachCard), onStart:() => round(0)});
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r];
    if (q.t === 'big' || q.t === 'small'){
      const ans = q.t === 'big' ? Math.max(...q.nums) : Math.min(...q.nums);
      const ask = P.extremeQ(q.t, q.nums.length);
      quizHook(q.t, ans);
      choiceRound(ctx, {opts:q.nums, answer:ans, r, total:n, cards:true, cls:'num-choice',
        prompt:() => say(ask, ask), right:pr => [pr, P.n(ans)], wrong:() => [ask], next:() => round(r + 1)});
      return;
    }
    const ans = signOf(q.x, q.y), o = OBJ[q.o];
    const side = (v, cls) => h('div', {class:'cmp-side ' + cls}, q.t === 'pic' ? (v ? objGroup(v, o.e, {cls:'mini'}) : h('span', {class:'empty-plate'}, '🍽️')) : null, h('span', {class:'big-digit'}, String(v)));
    const circle = h('span', {class:'cmp-circle'}, '');
    const top = h('div', {class:'cmp'}, side(q.x, 'l'), circle, side(q.y, 'r'));
    quizHook('sign', ans);
    choiceRound(ctx, {opts:shuffle(['gt', 'lt', 'eq']), answer:ans, r, total:n, top, label:s => SIGN_TEXT[s], cls:'sign',
      prompt:() => say(SHOW.whichSign, r === 0 && !a.pics ? [T.whichSign, T.signRule] : T.whichSign),
      right:pr => [pr, P.cmpA(q.x, q.y)], wrong:(s, m) => m >= 2 ? [T.signRule] : [T.whichSign],
      onRight:() => { circle.textContent = SIGN_TEXT[ans]; circle.classList.add('full'); },
      next:() => round(r + 1)});
  }
};
PHRASES.signs = (l, a) => {
  const lo = a.min || 0, out = [T.whichSign, T.signRule, T.tapEachCard, T.sign_gt, T.sign_lt, T.sign_eq];
  for (const [x, y] of comparePairs(lo, a.max)) out.push(P.cmpA(x, y));
  if (!a.pics){ for (const t of ['big', 'small']) for (const k of [3, 4]) out.push(P.extremeQ(t, k)); for (let x = lo; x <= a.max; x++) out.push(P.n(x)); }
  return out;
};

/* =====================================================================
   排一排 order: tap the numbers from the smallest to the biggest (later: biggest first)
   ===================================================================== */
GAMES.order = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(5), lo = a.min || 0, hi = a.max;
  const plan = range(0, n - 1).map(r => {
    const k = r < 2 ? 3 : r < 4 ? 4 : 5;
    const nums = shuffle(range(lo === 0 ? 0 : lo, hi), R).slice(0, k);
    return {nums, up: !(r >= 3 && R() < 0.5)};
  });
  round(Math.max(0, startAt(ctx)));
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], want = [...q.nums].sort((x, y) => q.up ? x - y : y - x);
    let pos = 0, misses = 0;
    const slots = want.map(() => h('div', {class:'slot'}));
    const tiles = q.nums.map(v => {
      const t = h('button', {class:'tile', 'data-v':String(v), onclick:e => {
        if (pos >= want.length || t.classList.contains('used') || !tapOK(e)) return;
        if (v === want[pos]){
          t.classList.add('used'); slots[pos].textContent = String(v); slots[pos].classList.add('filled');
          pos++; misses = 0; Sfx.tick(pos); Speech.speak(P.n(v));
          tiles.forEach(x => x.classList.remove('hint'));
          if (pos === want.length){
            Sfx.good(); burst(slotRow);
            ctx.progress((r + 1) / n);
            const pr = pick(praises());
            afterSay(wait(500).then(() => say(pr, pr)), 1100, () => round(r + 1));
          }
        } else {
          misses++; Sfx.bad(); wiggle(t); say(pick(tries()), [q.up ? T.smallFirst : T.bigFirst]);
          if (misses >= 2) tiles.find(x => +x.dataset.v === want[pos]).classList.add('hint');
        }
      }}, String(v));
      return t;
    });
    const slotRow = h('div', {class:'slots order-slots'}, slots.flatMap((s, k) => k ? [h('span', {class:'op'}, q.up ? '<' : '>'), s] : [s]));
    const prompt = () => say(q.up ? SHOW.orderUp : SHOW.orderDown, q.up ? T.orderUp : T.orderDown);
    ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt)), slotRow, h('div', {class:'tiles'}, tiles));
    quizHook('order', want.join(','), want.map(String));
    ctx.replay = prompt; prompt();
  }
};
PHRASES.order = (l, a) => [T.orderUp, T.orderDown, T.smallFirst, T.bigFirst, ...range(a.min || 0, a.max).map(P.n)];

/* =====================================================================
   第几 ordinal: animals in a line — who is third? what place is the cat? three animals vs the third animal
   ===================================================================== */
GAMES.ordinal = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6), len = a.len;
  const plan = range(0, n - 1).map(r => {
    const mode = a.mode === 'mix' ? ['which', 'rank'][r % 2] : a.mode === 'few' ? (r % 2 ? 'nth' : 'few') : a.mode;
    const side = hard(r) && R() < 0.5 ? 'right' : 'left';
    // few: never 1 (one animal and the first animal are the same thing)
    return {mode, side, line:shuffle(LINE_ANIMALS, R).slice(0, len), p:mode === 'few' ? 2 + Math.floor(R() * (len - 1)) : 1 + Math.floor(R() * len)};
  });
  const r0 = startAt(ctx);
  if (r0 >= 0 || a.mode !== 'which' || len > 5) round(Math.max(0, r0));
  else learn();
  // count along the line: 第一、第二、第三…
  function learn(){
    const line = plan[0].line;
    const els = line.map(k => h('span', {class:'animal'}, OBJ[k].e));
    learnShow(ctx, {body:h('div', {class:'line-wrap'}, h('div', {class:'line from-left'}, h('span', {class:'side-arrow'}, '👉'), els)),
      againLabel:U.countAgainBtn,
      play:async () => {
        const id = navId;
        await say(SHOW.lineIntro, T.lineIntro);
        for (let k = 0; k < els.length; k++){
          if (id !== navId) return;
          els[k].classList.add('lit'); Sfx.tick(k);
          await Speech.speak(P.ordinal(k + 1));
          await wait(150);
        }
        els.forEach(e => e.classList.remove('lit'));
      },
      onStart:() => round(0)});
  }
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r];
    const idx = p => q.side === 'left' ? p - 1 : len - p;   // place p counted from the side → index in the line
    const lineEl = (tap) => h('div', {class:'line-wrap'}, h('div', {class:'line from-' + q.side},
      q.side === 'left' ? h('span', {class:'side-arrow'}, '👉') : null,
      q.line.map((k, i) => tap ? tap(k, i) : h('span', {class:'animal'}, OBJ[k].e)),
      q.side === 'right' ? h('span', {class:'side-arrow'}, '👈') : null));
    if (q.mode === 'rank'){
      const X = q.line[idx(q.p)];
      const ask = P.rankQ(OBJ[X], q.side);
      quizHook('rank', q.p);
      choiceRound(ctx, {opts:numChoices(q.p, r, 1, len), answer:q.p, r, total:n, top:lineEl(null),
        label:v => String(v),
        prompt:() => say(showDigits(ask), ask), right:pr => [pr, P.rankA(q.p)], wrong:() => [ask], next:() => round(r + 1)});
      ctx.stage.querySelectorAll('.animal')[idx(q.p)].classList.add('marked');
      return;
    }
    // which / nth: tap one animal · few: tap the first p animals
    const want = q.mode === 'few' ? range(1, q.p).map(idx) : [idx(q.p)];
    const ask = q.mode === 'which' ? P.nthQ(q.p, q.side) : q.mode === 'nth' ? P.tapNth(q.p, q.side) : P.tapFew(q.p, q.side);
    const askShow = showDigits(ask);
    let solved = false, misses = 0;
    const chosen = new Set(), btns = [];
    const tapper = (k, i) => {
      const b = h('button', {class:'animal', 'data-v':String(i), 'aria-label':nameOf({zh:OBJ[k].zh, en:OBJ[k].en})}, OBJ[k].e);
      b.addEventListener('click', e => {
        if (solved || !tapOK(e)) return;
        if (q.mode !== 'few'){
          if (i === want[0]) win(b);
          else miss(b);
          return;
        }
        if (chosen.has(i)){ chosen.delete(i); b.classList.remove('crown'); Sfx.tap(); return; }
        chosen.add(i); b.classList.add('crown'); Sfx.tick(chosen.size); Speech.speak(P.n(chosen.size));
        if (chosen.size === want.length){
          if (want.every(x => chosen.has(x))) win(lineBox);
          else { later(() => { chosen.clear(); btns.forEach(x => x.classList.remove('crown')); }, 500); miss(lineBox); }
        }
      });
      btns.push(b);
      return b;
    };
    const lineBox = lineEl(tapper);
    function win(el){
      solved = true; Sfx.good(); el.classList.add('right'); burst(el);
      ctx.progress((r + 1) / n);
      const pr = pick(praises()), X = OBJ[q.line[want[want.length - 1]]];
      afterSay(say(pr, [pr, q.mode === 'which' ? P.whoA(X) : q.mode === 'few' ? P.fewA(q.p) : P.nthA(q.p)]), 1100, () => round(r + 1));
    }
    function miss(el){
      misses++; Sfx.bad(); wiggle(el);
      say(pick(tries()), misses >= 2 && q.mode !== 'which' ? [T.fewVsNth, ask] : [ask]);
      if (misses >= 2) want.forEach(i => btns[i].classList.add('hint'));
    }
    const prompt = () => say(askShow, ask);
    ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt)), lineBox);
    quizHook(q.mode, want.join(','), want.map(String));
    ctx.replay = prompt; prompt();
  }
};
PHRASES.ordinal = (l, a) => {
  const out = [T.lineIntro, T.fewVsNth];
  for (let p = 1; p <= a.len; p++){
    out.push(P.ordinal(p), P.rankA(p), P.n(p), P.fewA(p), P.nthA(p));
    for (const side of ['left', 'right']) out.push(P.nthQ(p, side), P.tapNth(p, side), P.tapFew(p, side));
  }
  for (const k of LINE_ANIMALS) out.push(P.whoA(OBJ[k]), P.rankQ(OBJ[k], 'left'), P.rankQ(OBJ[k], 'right'));
  return out;
};

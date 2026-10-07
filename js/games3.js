'use strict';
/* =====================================================================
   GAMES (3/4) — 分与合 bond, 凑数 pairs, 算一算 calc, 开火车 train,
   解决问题 story
   ===================================================================== */

/* ---------- number sentences ---------- */
// {t:[3, 2], o:['+']} is 3 + 2; {t:[6, 2, 3], o:['-', '+']} is 6 − 2 + 3
const eq = (t, o) => ({t, o});
function eqValue(e){ let v = e.t[0]; e.o.forEach((op, i) => { v = op === '+' ? v + e.t[i + 1] : v - e.t[i + 1]; }); return v; }
const opSign = op => op === '+' ? '+' : '−';
function eqText(e, hide){ // hide: index of a number shown as "?"
  return e.t.map((x, i) => (i ? ` ${opSign(e.o[i - 1])} ` : '') + (i === hide ? '?' : String(x))).join('');
}
const eqKey = e => eqText(e);
// all the number sentences a lesson uses (the same list every time, so every line can be recorded)
function calcPool(a){
  const M = a.max, out = [], seen = new Set();
  const add = e => { const k = eqKey(e); if (!seen.has(k) && eqValue(e) >= 0 && eqValue(e) <= 20){ seen.add(k); out.push(e); } };
  const lo = a.zero ? 0 : 1;
  const plus = (min = a.min || 2) => { for (let x = lo; x <= M; x++) for (let y = lo; x + y <= M; y++) if (x + y >= min && x + y > 0) add(eq([x, y], ['+'])); };
  const minus = (min = a.min || 1) => { for (let c = Math.max(1, min); c <= M; c++) for (let y = lo; y <= c; y++) if (y < c || a.zero) add(eq([c, y], ['-'])); };
  const fixed = (list, k, seed) => shuffle(list, makeRng(seed)).slice(0, k);   // a fixed part of a long list
  switch (a.ops){
    case '+': plus(); break;
    case '-': minus(); break;
    case '+-':
      if (a.zero){   // 0: things with 0 in them, and a few without
        const all = []; for (let x = 0; x <= M; x++) for (let y = 0; x + y <= M; y++) if (x + y > 0) all.push(eq([x, y], ['+']));
        for (let c = 1; c <= M; c++) for (let y = 0; y <= c; y++) all.push(eq([c, y], ['-']));
        all.filter(e => e.t.includes(0) || eqValue(e) === 0).forEach(add);
        fixed(all.filter(e => !e.t.includes(0) && eqValue(e) !== 0), 6, 11).forEach(add);
      } else { plus(); minus(); }
      break;
    case 'teen': {   // 十加几, 几加十, 十几加几, 十几减几, 十几减十 — a fixed part of each
      const tenPlus = range(1, 9).map(x => eq([10, x], ['+'])), plusTen = range(1, 9).map(x => eq([x, 10], ['+'])), minusTen = range(1, 9).map(x => eq([10 + x, 10], ['-']));
      const teenPlus = [], teenMinus = [];
      for (let x = 1; x <= 8; x++) for (let y = 1; x + y <= 9; y++) teenPlus.push(eq([10 + x, y], ['+']));
      for (let x = 1; x <= 9; x++) for (let y = 1; y <= x; y++) teenMinus.push(eq([10 + x, y], ['-']));
      [...fixed(tenPlus, 6, 23), ...fixed(plusTen, 4, 24), ...fixed(teenPlus, 12, 25), ...fixed(teenMinus, 12, 26), ...fixed(minusTen, 6, 27)].forEach(add);
      break;
    }
    case 'carry':
      for (const x of a.firsts) for (let y = 2; y <= 9; y++) if (x + y > 10) add(eq([x, y], ['+']));
      break;
    case '++--': {
      const list = [];
      for (let x = 1; x <= 8; x++) for (let y = 1; y <= 8; y++) for (let z = 1; x + y + z <= M; z++) list.push(eq([x, y, z], ['+', '+']));
      for (let x = 3; x <= M; x++) for (let y = 1; y < x; y++) for (let z = 1; y + z <= x; z++) list.push(eq([x, y, z], ['-', '-']));
      fixed(list.filter(e => e.o[0] === '+'), 20, 18).forEach(add);
      fixed(list.filter(e => e.o[0] === '-'), 20, 19).forEach(add);
      break;
    }
    case '+-mix': {
      const list = [];
      for (let x = 1; x <= M; x++) for (let y = 1; y <= M; y++) for (let z = 1; z <= M; z++){
        if (x + y <= M && x + y - z >= 0) list.push(eq([x, y, z], ['+', '-']));
        if (x - y >= 0 && x - y + z <= M) list.push(eq([x, y, z], ['-', '+']));
      }
      fixed(list.filter(e => e.o[0] === '+'), 20, 20).forEach(add);
      fixed(list.filter(e => e.o[0] === '-'), 20, 21).forEach(add);
      break;
    }
    case 'review': {
      const list = [];
      for (let x = 1; x <= 9; x++) for (let y = 1; y <= 9; y++){ list.push(eq([x, y], ['+'])); if (y < x) list.push(eq([x, y], ['-'])); }
      for (let x = 1; x <= 9; x++) for (let y = 1; y <= x; y++) list.push(eq([10 + x, y], ['-']));
      for (let x = 1; x <= 9; x++) list.push(eq([10, x], ['+']), eq([10 + x, 10], ['-']));
      fixed(list, 60, 29).forEach(add);
      break;
    }
  }
  return out;
}

/* ---------- pictures of number sentences ---------- */
// x things and y more (a brace under both), or x things with y crossed out
function calcPicture(e, o){
  const [x, y] = e.t;
  if (e.t.length === 3) return chainPanels(e, o);
  if (Math.max(x, y) >= 10 || x + y > 10) return teenFrames(e);
  if (e.o[0] === '+'){
    const g = v => v ? objGroup(v, o.e, {cls:'mini'}) : h('span', {class:'empty-plate'}, '🍽️');
    return h('div', {class:'calc-pic add'}, h('div', {class:'parts'}, g(x), h('span', {class:'pic-op'}, '+'), g(y)), h('div', {class:'brace'}, '?'));
  }
  if (!x) return h('div', {class:'calc-pic'}, h('span', {class:'empty-plate'}, '🍽️'));
  const g = objGroup(x, o.e);
  g.items.slice(x - y).forEach(it => it.classList.add('crossed'));
  return h('div', {class:'calc-pic sub'}, g);
}
// teen numbers: a full ten frame and the rest (crossed out when taken away)
function teenFrames(e){
  const [x, y] = e.t, add = e.o[0] === '+';
  const cells = [];
  if (add){ for (let i = 0; i < x; i++) cells.push('r'); for (let i = 0; i < y; i++) cells.push('b'); }
  else if (y === 10 && x > 10){ for (let i = 0; i < x; i++) cells.push(i < 10 ? 'x' : 'r'); }   // 十几减十: the whole ten goes
  else { for (let i = 0; i < x; i++) cells.push(i >= x - y ? 'x' : 'r'); }
  const frames = [];
  for (let f = 0; f * 10 < cells.length; f++) frames.push(tenFrame(range(0, 9).map(i => cells[f * 10 + i] || null)));
  return h('div', {class:'calc-pic frames'}, frames);
}
// three numbers: what there was, what came or went, what came or went next
function chainPanels(e, o){
  const panels = [h('div', {class:'panel'}, objGroup(e.t[0], o.e, {cls:'mini'}))];
  e.o.forEach((op, i) => {
    const g = objGroup(e.t[i + 1], o.e, {cls:'mini'});
    if (op === '-') g.items.forEach(it => it.classList.add('crossed'));
    panels.push(h('span', {class:'pic-op'}, opSign(op)), h('div', {class:'panel ' + (op === '+' ? 'comes' : 'goes')}, g));
  });
  return h('div', {class:'calc-pic chain'}, panels);
}
// the number sentence itself, with a "?" box
function eqEl(e, hide = e.t.length){
  const parts = [];
  e.t.forEach((x, i) => {
    if (i) parts.push(h('span', {class:'eq-op'}, opSign(e.o[i - 1])));
    parts.push(i === hide ? h('span', {class:'eq-box'}, '?') : h('span', {class:'eq-n'}, String(x)));
  });
  parts.push(h('span', {class:'eq-op'}, '='), hide === e.t.length ? h('span', {class:'eq-box'}, '?') : h('span', {class:'eq-n'}, String(eqValue(e))));
  return h('div', {class:'eq'}, parts);
}
const fillBox = (el, v) => { const b = el.querySelector('.eq-box'); if (b){ b.textContent = String(v); b.classList.add('full'); } };

/* =====================================================================
   分与合 bond: 5 can be split into 2 and 3; 2 and 3 make 5
   ===================================================================== */
GAMES.bond = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const pairs = a.nums.flatMap(N => range(1, N - 1).map(x => [N, x]));
  const plan = roundList(pairs, n, R).map(([N, x], r) => ({N, x, join:a.mode === 'join' || (a.mode === 'mix' && r % 2 === 1)}));
  const o = OBJ[a.obj];
  const r0 = startAt(ctx);
  if (r0 >= 0) round(r0);
  else learn();
  // split the first number every way: 5 → 1 and 4, 2 and 3, 3 and 2, 4 and 1
  function learn(){
    const N = a.nums[0];
    const holder = h('div', {class:'bond-learn'});
    const show = x => holder.replaceChildren(bondSvg(N, x, N - x), h('div', {class:'plates'}, h('div', {class:'dish'}, objGroup(x, o.e, {cls:'mini'})), h('div', {class:'dish'}, objGroup(N - x, o.e, {cls:'mini'}))));
    show(1);
    learnShow(ctx, {body:holder, play:async () => {
      const id = navId;
      await say(SHOW.splitIntro, a.mode === 'join' ? T.joinIntro : T.splitIntro);
      for (let x = 1; x < N; x++){
        if (id !== navId) return;
        show(x); Sfx.tick(x);
        await say(`${N} → ${x} + ${N - x}`, a.mode === 'join' ? P.joinA(x, N - x, N) : P.splitA(N, x, N - x));
        await wait(250);
      }
    }, onStart:() => round(0)});
  }
  function round(r){
    if (r >= plan.length){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / plan.length);
    const q = plan[r], y = q.N - q.x;
    const ans = q.join ? q.N : y;
    const bond = bondSvg(q.N, q.x, y, q.join ? 'whole' : 'b');
    const dishes = h('div', {class:'plates'}, h('div', {class:'dish'}, objGroup(q.x, o.e, {cls:'mini'})), h('div', {class:'dish' + (q.join ? '' : ' covered')}, q.join ? objGroup(y, o.e, {cls:'mini'}) : h('span', {class:'cover'}, '?')));
    const ask = q.join ? P.joinQ(q.x, y) : P.splitQ(q.N, q.x);
    quizHook('bond', ans);
    choiceRound(ctx, {opts:numChoices(ans, r, q.join ? 2 : 0, q.join ? 10 : q.N), answer:ans, r, total:plan.length,
      top:h('div', {class:'bond-q'}, bond, q.join ? dishes : h('div', {class:'whole-row'}, objGroup(q.N, o.e, {cls:'mini'}))),
      prompt:() => say(showDigits(ask), ask), right:pr => [pr, q.join ? P.joinA(q.x, y, q.N) : P.splitA(q.N, q.x, y)], wrong:() => [ask],
      onRight:() => { const t = bond.querySelector('.ask text'); if (t) t.textContent = String(ans); bond.querySelector('.ask').classList.add('found'); },
      next:() => round(r + 1)});
  }
};
PHRASES.bond = (l, a) => {
  const out = [T.splitIntro, T.joinIntro];
  for (const N of a.nums) for (let x = 1; x < N; x++) out.push(P.splitQ(N, x), P.splitA(N, x, N - x), P.joinQ(x, N - x), P.joinA(x, N - x, N));
  return out;
};

/* =====================================================================
   凑数 pairs: find two cards that make the number (凑十 for 10)
   ===================================================================== */
GAMES.pairs = ctx => {
  const a = ctx.act, R = ctx.rng;
  // each board: one target number, its pairs (twice for small numbers), shuffled
  const boards = a.nums.map(N => {
    let ps = range(1, Math.floor(N / 2)).map(x => [x, N - x]);
    if (ps.length < 3) ps = [...ps, ...ps].slice(0, isShort() ? 2 : 4);
    else ps = isShort() ? shuffle(ps, R).slice(0, 3) : ps;
    return {N, pairs:ps, cards:shuffle(ps.flat(), R)};
  });
  const total = boards.reduce((t, b) => t + b.pairs.length, 0);
  let doneN = 0;
  const r0 = Math.max(0, startAt(ctx));
  let bi = 0, skip = r0;
  while (bi < boards.length && skip >= boards[bi].pairs.length){ skip -= boards[bi].pairs.length; doneN += boards[bi].pairs.length; bi++; }
  board(bi, skip);
  function board(b, already){
    if (b >= boards.length){ ctx.progress(1); later(ctx.done, 300); return; }
    const B = boards[b];
    let first = null, found = 0;
    // pairs already found before a reload stay found
    const gone = new Set();
    for (let k = 0; k < already; k++){ const [x, y] = B.pairs[k]; const i = B.cards.findIndex((v, j) => v === x && !gone.has(j)); gone.add(i); gone.add(B.cards.findIndex((v, j) => v === y && !gone.has(j))); found++; }
    const cards = B.cards.map((v, i) => {
      const c = h('button', {class:'pcard' + (gone.has(i) ? ' used' : ''), 'data-v':'c' + i, 'data-n':String(v), onclick:e => {
        if (c.classList.contains('used') || !tapOK(e)) return;
        if (first === c){ c.classList.remove('on'); first = null; Sfx.tap(); return; }
        if (!first){ first = c; c.classList.add('on'); Sfx.tick(1); Speech.speak(P.n(v)); return; }
        const u = +first.dataset.n;
        if (u + v === B.N){
          const f = first; first = null;
          f.classList.remove('on'); f.classList.add('used', 'match'); c.classList.add('used', 'match');
          Sfx.good(); burst(c);
          found++; doneN++;
          ctx.progress(doneN / total); ctx.save({r:doneN});
          const pr = pick(praises());
          const doneBoard = found === B.pairs.length;
          afterSay(say(`${u} + ${v} = ${B.N}`, [pr, P.joinA(u, v, B.N)]), 600, () => { if (doneBoard) board(b + 1, 0); else hook(); });
        } else {
          Sfx.bad(); wiggle(c); wiggle(first); first.classList.remove('on'); first = null;
          say(P.pairsQ(B.N), [P.joinA(u, v, u + v), P.pairsQ(B.N)]);
        }
      }}, String(v));
      return c;
    });
    const prompt = () => say(P.pairsQShow(B.N), P.pairsQ(B.N));
    ctx.stage.replaceChildren(h('div', {class:'q-top'}, listenBtn(prompt), h('div', {class:'target'}, h('span', {class:'big-digit'}, String(B.N)))), h('div', {class:'pcards'}, cards));
    const hook = () => {
      // the next pair to find (for the test)
      const left = B.cards.map((v, i) => cards[i].classList.contains('used') ? null : v);
      for (let i = 0; i < left.length; i++) if (left[i] != null){ const j = left.findIndex((w, k) => k !== i && w != null && w + left[i] === B.N); if (j >= 0){ quizHook('pairs', B.N, ['c' + i, 'c' + j]); return; } }
    };
    hook();
    ctx.replay = prompt; prompt();
  }
};
PHRASES.pairs = (l, a) => {
  const out = [];
  for (const N of a.nums){
    out.push(P.pairsQ(N));
    for (let x = 1; x < N; x++) for (let y = 1; y < N; y++) out.push(P.joinA(x, y, x + y));
  }
  for (let x = 1; x <= 10; x++) out.push(P.n(x));
  return out;
};

/* =====================================================================
   算一算 calc: a picture and its number sentence — find the answer, the missing number,
   or the number sentence that fits the picture
   ===================================================================== */
GAMES.calc = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const pool = calcPool(a);
  const two = pool.filter(e => e.t.length === 2);
  const types = a.three ? ['pic', 'eq'] : a.missing ? ['eq', 'miss', 'pic'] : ['pic', 'eq', 'build', 'miss'];
  const plan = typePlan(n, types, R).map((t, r) => {
    let e = pick(t === 'miss' || t === 'build' ? (two.length ? two : pool) : pool, R);
    if (t === 'miss' && e.t.length !== 2) t = 'eq';
    return {t, e, o:pick(a.objs, R), hide:t === 'miss' ? Math.floor(R() * 2) : e.t.length};
  });
  const r0 = startAt(ctx);
  if (r0 >= 0 || !a.demo) round(Math.max(0, r0));
  else demo();
  // 乐乐 shows one example with things that come and go
  function demo(){
    const [ok, ...nums] = a.demo, o = OBJ[ok];
    const ops = a.ops.includes('mix') ? ['-', '+'] : a.ops === '++--' ? ['+', '+'] : [a.ops[0] === '-' || (a.ops === '+-' && a.zero) ? '-' : '+'];
    const e = eq(nums, ops.slice(0, nums.length - 1));
    const holder = h('div', {class:'demo'});
    learnShow(ctx, {body:holder, play:async () => {
      const id = navId;
      let have = e.t[0];
      const groups = [objGroup(have, o.e)];
      holder.replaceChildren(h('div', {class:'demo-pic'}, groups[0]), eqEl(e));
      await say(P.demoHaveShow(have, o), P.demoHave(have, o));
      for (let i = 0; i < e.o.length; i++){
        if (id !== navId) return;
        const v = e.t[i + 1];
        if (e.o[i] === '+'){
          const g = objGroup(v, o.e, {cls:'arrive'});
          holder.firstChild.append(h('span', {class:'pic-op'}, '+'), g);
          have += v;
          await say(P.demoMoreShow(v, o), P.demoMore(v, o));
        } else {
          const items = [...holder.querySelectorAll('.ob:not(.crossed)')].slice(-v);
          items.forEach(it => it.classList.add('crossed'));
          have -= v;
          await say(P.demoGoneShow(v, o), P.demoGone(v, o));
        }
        Sfx.tick(i);
      }
      if (id !== navId) return;
      const lastOp = e.o[e.o.length - 1];
      await say(P.demoEndShow(have, o, lastOp), P.demoEnd(have, o, lastOp));
      fillBox(holder, have); Sfx.good();
      await say(eqText(e) + ' = ' + have, [P.eqA(e), ...(e.t.length === 2 ? [e.o[0] === '+' ? T.plusSign : T.minusSign] : [])]);
    }, onStart:() => round(0)});
  }
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const q = plan[r], e = q.e, o = OBJ[q.o], v = eqValue(e);
    if (q.t === 'build'){
      // which number sentence fits the picture?
      const flip = eq(e.t, [e.o[0] === '+' ? '-' : '+']);
      const other = e.o[0] === '+' ? eq([e.t[0], e.t[1] + (e.t[1] < 9 ? 1 : -1)], ['+']) : eq([e.t[0], Math.max(0, e.t[1] - 1) === e.t[1] ? e.t[1] + 1 : e.t[1] - 1], ['-']);
      const opts = uniq([eqKey(e), ...(eqValue(flip) >= 0 ? [eqKey(flip)] : []), eqKey(other)]).slice(0, 3);
      const byKey = {[eqKey(e)]:e, [eqKey(flip)]:flip, [eqKey(other)]:other};
      quizHook('build', eqKey(e));
      choiceRound(ctx, {opts:shuffle(opts), answer:eqKey(e), r, total:n, cards:true, cls:'eq-choice', top:calcPicture(e, o),
        label:k => `${k} = ${eqValue(byKey[k])}`,
        prompt:() => say(SHOW.pickEquation, T.pickEquation), right:pr => [pr, P.eqA(e)], wrong:() => [T.pickEquation], next:() => round(r + 1)});
      return;
    }
    const ans = q.t === 'miss' ? e.t[q.hide] : v;
    const eqBox = eqEl(e, q.hide);
    const ask = q.t === 'miss' ? T.whatInBox : P.eqQ(e);
    quizHook(q.t, ans);
    choiceRound(ctx, {opts:numChoices(ans, r, 0, Math.max(10, a.max)), answer:ans, r, total:n,
      top:h('div', {class:'calc-q'}, q.t === 'pic' ? calcPicture(e, o) : null, eqBox),
      prompt:() => say(eqText(e, q.hide) + (q.t === 'miss' ? ' = ' + v : ' = ?'), ask), right:pr => [pr, P.eqA(e)], wrong:() => [ask],
      onRight:() => fillBox(eqBox, ans), next:() => round(r + 1)});
  }
};
function demoPhrases(a){
  if (!a.demo) return [];
  const [ok, ...nums] = a.demo, o = OBJ[ok];
  const ops = a.ops.includes('mix') ? ['-', '+'] : a.ops === '++--' ? ['+', '+'] : [a.ops[0] === '-' || (a.ops === '+-' && a.zero) ? '-' : '+'];
  const e = eq(nums, ops.slice(0, nums.length - 1));
  const out = [P.demoHave(e.t[0], o)];
  let have = e.t[0];
  e.o.forEach((op, i) => { const v = e.t[i + 1]; out.push(op === '+' ? P.demoMore(v, o) : P.demoGone(v, o)); have += op === '+' ? v : -v; });
  out.push(P.demoEnd(have, o, e.o[e.o.length - 1]), P.eqA(e), T.plusSign, T.minusSign);
  return out;
}
PHRASES.calc = (l, a) => {
  const out = [T.pickEquation, T.whatInBox, ...demoPhrases(a)];
  for (const e of calcPool(a)) out.push(P.eqQ(e), P.eqA(e));
  return out;
};

/* =====================================================================
   开火车 train: quick sums; every right answer adds a carriage, then the train leaves
   ===================================================================== */
GAMES.train = ctx => {
  const a = ctx.act, R = ctx.rng, n = rounds(6);
  const plan = roundList(calcPool(a), n, R);
  const r0 = Math.max(0, startAt(ctx));
  const cars = plan.slice(0, r0).map(e => eqValue(e));
  round(r0);
  function trainEl(){
    return h('div', {class:'train'}, cars.map(v => h('span', {class:'car'}, String(v))), h('span', {class:'engine', 'aria-hidden':'true'}, '🚂'));
  }
  function round(r){
    if (r >= n) return leave();
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const e = plan[r], v = eqValue(e);
    const track = h('div', {class:'track'}, trainEl());
    const eqBox = eqEl(e);
    const ask = P.eqQ(e);
    quizHook('train', v);
    choiceRound(ctx, {opts:numChoices(v, r, 0, 20), answer:v, r, total:n, top:h('div', {class:'calc-q'}, eqBox, track),
      prompt:() => say(eqText(e) + ' = ?', r === 0 && r0 === 0 ? [T.trainIntro, ask] : ask), right:pr => [pr, P.eqA(e)], wrong:() => [ask],
      onRight:() => { fillBox(eqBox, v); cars.push(v); const t = track.firstChild; t.insertBefore(h('span', {class:'car new'}, String(v)), t.lastChild); },
      next:() => round(r + 1)});
  }
  function leave(){
    ctx.progress(1);
    const track = h('div', {class:'track big'}, trainEl());
    ctx.stage.replaceChildren(track);
    Sfx.whistle();
    requestAnimationFrame(() => track.firstChild.classList.add('go'));
    say(SHOW.trainGo, T.trainGo).then(() => later(ctx.done, 300));
  }
};
PHRASES.train = (l, a) => [T.trainIntro, T.trainGo, ...calcPool(a).flatMap(e => [P.eqQ(e), P.eqA(e)])];

/* =====================================================================
   解决问题 story: 乐乐 tells a little story with a picture — how many altogether, how many are left?
   ===================================================================== */
// the number sentence of a story
function storyEq(s){
  const [x, y, z] = s.n;
  if (s.t === 'arrive' || s.t === 'combine') return eq([x, y], ['+']);
  if (s.t === 'leave' || s.t === 'eat') return eq([x, y], ['-']);
  if (s.t === 'part') return eq([x, y], ['-']);
  return eq([x, y, z], s.s.split(''));
}
function storyPicture(s){
  const o = OBJ[s.o], [x, y] = s.n;
  const g = (v, cls) => objGroup(v, o.e, {cls:'mini' + (cls ? ' ' + cls : '')});
  switch (s.t){
    case 'arrive': return h('div', {class:'story-pic'}, sceneBox(s.p, g(x)), h('div', {class:'incoming'}, h('span', {class:'comes'}, '⬅️'), g(y)));
    case 'combine': return h('div', {class:'story-pic'}, h('div', {class:'calc-pic add'}, h('div', {class:'parts'}, g(x), h('span', {class:'pic-sep'}, ''), g(y)), h('div', {class:'brace'}, '?')));
    case 'leave': {
      const grp = g(x); grp.items.slice(x - y).forEach(it => it.classList.add('leaving'));
      return h('div', {class:'story-pic'}, sceneBox(s.p, grp), h('span', {class:'goes'}, '➡️'));
    }
    case 'eat': { const grp = g(x); grp.items.slice(x - y).forEach(it => it.classList.add('crossed')); return h('div', {class:'story-pic'}, sceneBox(s.p, grp)); }
    case 'part': return h('div', {class:'story-pic part'}, h('div', {class:'part-row'}, g(y), h('span', {class:'closed-box'}, '📦', h('b', {}, '?'))), h('div', {class:'brace total'}, String(x)));
    default: return h('div', {class:'story-pic'}, sceneBox(s.p, chainPanels(storyEq(s), o)));
  }
}
GAMES.story = ctx => {
  const a = ctx.act, R = ctx.rng, n = Math.min(a.stories.length, rounds(6));
  const plan = roundList(a.stories, n, R).map((s, r) => ({s, t:a.pick && r % 2 === 1 ? 'eq' : 'ans'}));
  round(Math.max(0, startAt(ctx)));
  function round(r){
    if (r >= n){ ctx.progress(1); later(ctx.done, 300); return; }
    if (r > 0) ctx.save({r});
    ctx.progress(r / n);
    const {s, t} = plan[r], e = storyEq(s), v = eqValue(e);
    const lines = P.story(s);
    const pic = storyPicture(s);
    const tell = () => say(P.storyShow(s), lines);
    if (t === 'eq'){
      // first: which number sentence? then: the answer
      // the other cards: the opposite sign, and the numbers of the story in a sum that does not answer it
      const alts = e.t.length === 2
        ? (e.o[0] === '+' ? [eq(e.t, ['-']), eq([v, e.t[0]], ['-'])] : [eq(e.t, ['+']), eq([v, e.t[1]], ['+'])])
        : [eq(e.t, e.o.map(op => op === '+' ? '-' : '+')), eq(e.t, [e.o[0], e.o[1] === '+' ? '-' : '+'])];
      const opts = uniq([eqKey(e), ...alts.filter(x => eqValue(x) >= 0 && eqKey(x) !== eqKey(e)).map(eqKey)]).slice(0, 3);
      quizHook('storyeq', eqKey(e));
      choiceRound(ctx, {opts:shuffle(opts), answer:eqKey(e), r, total:n, cards:true, cls:'eq-choice', top:pic,
        label:k => k + ' = ?',
        prompt:() => say(P.storyShow(s), [...lines, T.whichEquation]), right:pr => [pr], wrong:() => [T.whichEquation],
        next:() => answer(r, s, e, v, pic, true)});
      return;
    }
    answer(r, s, e, v, pic, false);
    function answer(r, s, e, v, pic, second){
      const eqBox = eqEl(e);
      quizHook('story', v);
      choiceRound(ctx, {opts:numChoices(v, r, 0, 20), answer:v, r, total:n, top:h('div', {class:'calc-q'}, pic, second ? eqBox : null),
        prompt:second ? () => say(eqText(e) + ' = ?', P.eqQ(e)) : tell, right:pr => [pr, P.eqA(e), P.storyA(s)], wrong:() => second ? [P.eqQ(e)] : [lines[lines.length - 1]],
        onRight:() => fillBox(eqBox, v), next:() => round(r + 1)});
    }
  }
};
PHRASES.story = (l, a) => {
  const out = [T.whichEquation];
  for (const s of a.stories){ const e = storyEq(s); out.push(...P.story(s), P.eqQ(e), P.eqA(e), P.storyA(s)); }
  return out;
};

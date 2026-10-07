'use strict';
/* =====================================================================
   PICTURES — groups of things to count, ten frames, number bonds, sticks
   and bundles, the abacus, 3D shapes, pencils and buildings, scenes.
   All drawn with HTML and inline SVG, so nothing has to be downloaded.
   ===================================================================== */

// ---------- groups of things ----------
// n things in tidy rows of five (like a ten frame), so they are easy to count; scatter: a loose heap instead
function objGroup(n, emoji, {cls = '', scatter = false, rng = Math.random, tap = null, mark = null} = {}){
  const g = h('div', {class:'objs' + (scatter ? ' scatter' : '') + (n > 10 ? ' many' : '') + (cls ? ' ' + cls : ''), role:'img', 'aria-label':String(n)});
  const items = [];
  if (scatter){
    // a grid with a few more cells than things, each thing nudged a little inside its cell
    const cols = n <= 4 ? 3 : n <= 9 ? 4 : 5, rows = Math.ceil((n + Math.ceil(n / 3)) / cols);
    const cells = shuffle(range(0, cols * rows - 1), rng).slice(0, n).sort((a, b) => a - b);
    g.style.setProperty('--cols', cols); g.style.setProperty('--rows', rows);
    for (const c of cells){
      const it = h('span', {class:'ob', style:{gridColumn:(c % cols + 1), gridRow:(Math.floor(c / cols) + 1),
        transform:`translate(${Math.round((rng() - 0.5) * 30)}%, ${Math.round((rng() - 0.5) * 30)}%) rotate(${Math.round((rng() - 0.5) * 24)}deg)`}}, emoji);
      items.push(it); g.append(it);
    }
  } else {
    // whole fives first: 7 = ●●●●● / ●●
    for (let r = 0; r < Math.ceil(n / 5); r++){
      const row = h('div', {class:'orow'});
      for (let c = 0; c < Math.min(5, n - r * 5); c++){ const it = h('span', {class:'ob'}, emoji); items.push(it); row.append(it); }
      g.append(row);
    }
  }
  if (tap) items.forEach(it => it.addEventListener('click', () => tap(it, items)));
  g.items = items;
  return g;
}
// tap things to count them: each one gets its number, and 乐乐 says it
function countByTap(items){
  let k = 0;
  return it => {
    if (it.classList.contains('counted')) return;
    k++;
    it.classList.add('counted'); it.dataset.k = k;
    Sfx.tick(k); Speech.speak(P.n(k));
  };
}

// ---------- ten frame: two rows of five ----------
// cells: list of colours (null = empty); a dashed outline marks the cells to fill (want)
function tenFrame(cells, {want = []} = {}){
  const f = h('div', {class:'tenframe', role:'img', 'aria-label':String(cells.filter(Boolean).length)});
  for (let i = 0; i < 10; i++){
    const c = h('span', {class:'tf-cell' + (want.includes(i) ? ' want' : '')});
    if (cells[i]) c.append(h('i', {class:'counter ' + cells[i]}));
    f.append(c);
  }
  return f;
}
const counters = (n, color) => h('div', {class:'loose'}, range(1, n).map(() => h('i', {class:'counter ' + color})));

// ---------- number bond (分与合): the whole on top, the two parts below ----------
// hide: 'whole' | 'a' | 'b' — that circle shows "?"
function bondSvg(whole, a, b, hide){
  const circ = (x, y, v, key) => svg('g', {class:'bc' + (hide === key ? ' ask' : '')},
    svg('circle', {cx:x, cy:y, r:30}),
    svg('text', {x, y:y + 2, 'text-anchor':'middle', 'dominant-baseline':'middle'}, hide === key ? '?' : String(v)));
  return svg('svg', {class:'bond', viewBox:'0 0 220 160', role:'img', 'aria-label':`${whole} = ${a} + ${b}`},
    svg('line', {x1:110, y1:52, x2:58, y2:112}), svg('line', {x1:110, y1:52, x2:162, y2:112}),
    circ(110, 36, whole, 'whole'), circ(58, 122, a, 'a'), circ(162, 122, b, 'b'));
}

// ---------- sticks and bundles of ten (小棒) ----------
function sticksSvg(tens, ones){
  const stick = (x, y, rot = 0) => svg('rect', {class:'stick', x, y, width:7, height:86, rx:3.5, transform:rot ? `rotate(${rot} ${x + 3.5} ${y + 43})` : null});
  const parts = [];
  let x = 6;
  for (let t = 0; t < tens; t++){
    const g = svg('g', {class:'bundle'});
    for (let k = 0; k < 10; k++) g.append(stick(x + k * 5, 8 + (k % 2) * 2, (k - 4.5) * 1.6));
    g.append(svg('rect', {class:'ribbon', x:x - 4, y:46, width:60, height:12, rx:5}));
    parts.push(g); x += 74;
  }
  for (let k = 0; k < ones; k++){ parts.push(stick(x, 8)); x += 17; }
  const w = Math.max(40, x + 2);
  return svg('svg', {class:'sticks', viewBox:`0 0 ${w} 104`, style:{width:`calc(${w / 104} * var(--stick-h, 96px))`}, role:'img', 'aria-label':String(tens * 10 + ones)}, parts);
}

// ---------- the abacus (计数器): tens and ones ----------
function abacusSvg(tens, ones, {labels = true} = {}){
  const rod = (x, n, cls) => svg('g', {class:'rod ' + cls},
    svg('rect', {class:'pole', x:x - 3, y:14, width:6, height:150, rx:3}),
    range(0, n - 1).map(k => svg('ellipse', {class:'bead', cx:x, cy:150 - k * 13.5, rx:24, ry:7.5})));
  return svg('svg', {class:'abacus', viewBox:'0 0 220 214', role:'img', 'aria-label':String(tens * 10 + ones)},
    svg('rect', {class:'base', x:14, y:160, width:192, height:16, rx:6}),
    rod(76, tens, 'tens'), rod(146, ones, 'ones'),
    labels ? svg('text', {class:'albl', x:76, y:202, 'text-anchor':'middle'}, U.tensPlace) : null,
    labels ? svg('text', {class:'albl', x:146, y:202, 'text-anchor':'middle'}, U.onesPlace) : null);
}

// ---------- 3D shapes ----------
const SHAPE_COLORS = {cuboid:['#ffb347', '#ff9f1c', '#d27a00'], cube:['#8fb8ff', '#3d8bfd', '#1f5fc7'], cylinder:['#7fe0b0', '#22c07a', '#15965c'], sphere:['#ff9ec7', '#ff5fa2', '#d63f80']};
const SHAPE_EMOJI = {cuboid:'📦', cube:'🎲', cylinder:'🥫', sphere:'⚽'};
function shapeSvg(kind, {color = kind, cls = ''} = {}){
  const [light, mid, dark] = SHAPE_COLORS[color] || SHAPE_COLORS[kind];
  const line = {stroke:'#3a2440', 'stroke-width':2.5, 'stroke-linejoin':'round'};
  let body;
  if (kind === 'cuboid') body = [
    svg('path', Object.assign({d:'M10 44 L30 26 L90 26 L70 44 Z', fill:light}, line)),
    svg('path', Object.assign({d:'M70 44 L90 26 L90 66 L70 84 Z', fill:dark}, line)),
    svg('rect', Object.assign({x:10, y:44, width:60, height:40, fill:mid}, line))];
  else if (kind === 'cube') body = [
    svg('path', Object.assign({d:'M16 38 L36 20 L80 20 L60 38 Z', fill:light}, line)),
    svg('path', Object.assign({d:'M60 38 L80 20 L80 64 L60 82 Z', fill:dark}, line)),
    svg('rect', Object.assign({x:16, y:38, width:44, height:44, fill:mid}, line))];
  else if (kind === 'cylinder') body = [
    svg('path', Object.assign({d:'M24 26 L24 76 A26 9 0 0 0 76 76 L76 26 Z', fill:mid}, line)),
    svg('path', {d:'M60 30 L60 82', stroke:dark, 'stroke-width':8, opacity:.45}),
    svg('ellipse', Object.assign({cx:50, cy:26, rx:26, ry:9, fill:light}, line))];
  else body = [
    svg('circle', Object.assign({cx:50, cy:52, r:34, fill:mid}, line)),
    svg('path', {d:'M18 56 A32 11 0 0 0 82 56', fill:'none', stroke:dark, 'stroke-width':2.5, 'stroke-dasharray':'5 4'}),
    svg('circle', {cx:38, cy:38, r:9, fill:light, opacity:.9})];
  return svg('svg', {class:'shape3d ' + kind + (cls ? ' ' + cls : ''), viewBox:'0 0 100 100', role:'img', 'aria-label':P.shapeName(kind)}, body);
}

// ---------- pencils (长短) and buildings (高矮) ----------
const PAINT = {red:['#ff6b5e', '#d63a2f'], yellow:['#ffd23f', '#d9a800'], blue:['#5aa2ff', '#1f6fe0'], green:['#4fd18b', '#15965c'], purple:['#a98bff', '#6c45d9']};
function pencilSvg(len, color){
  const [c, d] = PAINT[color], H = 34, tip = 30;
  return svg('svg', {class:'pencil', viewBox:`0 0 ${len} ${H}`, style:{width:`calc(${len} / 340 * var(--pencil-w, 100%))`}, role:'img', 'aria-label':color},
    svg('rect', {x:1, y:5, width:16, height:H - 10, rx:5, fill:'#ff9ec7', stroke:'#3a2440', 'stroke-width':2}),
    svg('rect', {x:14, y:4, width:10, height:H - 8, fill:'#c9c9d6', stroke:'#3a2440', 'stroke-width':2}),
    svg('rect', {x:24, y:4, width:len - tip - 25, height:H - 8, fill:c, stroke:'#3a2440', 'stroke-width':2}),
    svg('rect', {x:24, y:13, width:len - tip - 25, height:5, fill:d, opacity:.55}),
    svg('path', {d:`M${len - tip - 1} 4 L${len - 2} ${H / 2} L${len - tip - 1} ${H - 4} Z`, fill:'#f6d7a7', stroke:'#3a2440', 'stroke-width':2, 'stroke-linejoin':'round'}),
    svg('path', {d:`M${len - 11} ${H / 2 - 4} L${len - 2} ${H / 2} L${len - 11} ${H / 2 + 4} Z`, fill:'#3a2440'}));
}
function buildingSvg(height, color){
  const [c, d] = PAINT[color], W = 70, rows = Math.max(1, Math.floor((height - 30) / 26));
  const wins = [];
  for (let r = 0; r < rows; r++) for (const x of [14, 40]) wins.push(svg('rect', {x, y:16 + r * 26, width:16, height:14, rx:2, fill:'#fffbe0', stroke:'#3a2440', 'stroke-width':1.5}));
  return svg('svg', {class:'building', viewBox:`0 0 ${W} ${height}`, style:{height:`calc(${height} / 260 * var(--bld-h, 240px))`}, role:'img', 'aria-label':color},
    svg('rect', {x:2, y:2, width:W - 4, height:height - 4, rx:4, fill:c, stroke:'#3a2440', 'stroke-width':3}),
    svg('rect', {x:2, y:2, width:W - 4, height:8, fill:d}),
    wins,
    svg('rect', {x:W / 2 - 9, y:height - 26, width:18, height:22, rx:3, fill:d, stroke:'#3a2440', 'stroke-width':2}));
}

// ---------- signs ----------
const SIGN_TEXT = {gt:'>', lt:'<', eq:'='};

// ---------- story scenes ----------
// the place things are in: pond, tree, grass, plate, basket, sky, bus, box
const PLACE_ICON = {pond:'💧', tree:'🌳', grass:'🌿', plate:'🍽️', basket:'🧺', sky:'☁️', bus:'🚌', box:'📦'};
function sceneBox(place, kids, cls = ''){
  return h('div', {class:'scene place-' + (place || 'none') + (cls ? ' ' + cls : '')},
    place ? h('span', {class:'scene-icon', 'aria-hidden':'true'}, PLACE_ICON[place]) : null, kids);
}

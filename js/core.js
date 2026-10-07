'use strict';
/* =====================================================================
   CORE — helpers, language, saved progress, 乐乐's voice, sounds, music,
   the mascot, navigation and the screens (home, lesson, game, stickers,
   parents). The games themselves are in games.js, their pictures in art.js.
   ===================================================================== */

/* ---------- small helpers ---------- */
if (!Element.prototype.replaceChildren){ // iOS < 14
  Element.prototype.replaceChildren = function(...nodes){ while (this.firstChild) this.removeChild(this.firstChild); this.append(...nodes); };
}
const $ = s => document.querySelector(s);
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  for (const kid of kids.flat(Infinity)){
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
function setAttrs(el, attrs){
  if (attrs) for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object'){
      for (const [sk, sv] of Object.entries(v)){ if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'hidden') el.hidden = true;
    else el.setAttribute(k, v === true ? '' : v);
  }
}
// SVG elements
const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, ...kids){
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  for (const kid of kids.flat(Infinity)){
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
// seeded random numbers (mulberry32): a game's questions come from its seed, so a game left half-way is rebuilt exactly
function makeRng(seed){
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const newSeed = () => Math.floor(Math.random() * 2147483647) + 1;
const shuffle = (arr, r = Math.random) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
const uniq = arr => [...new Set(arr)];
const wait = ms => new Promise(res => setTimeout(res, ms));
const range = (a, b) => { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- language: 中文 or English ---------- */
const LANGS = ['zh', 'en'];
let LANG = 'zh';
// T: what 乐乐 says · SHOW: what his bubble shows for it · U: words on the screen · P: lines built from numbers and things
const textPart = part => new Proxy({}, {get(_, k){ const t = TEXT[LANG][part]; return k in t ? t[k] : TEXT.zh[part][k]; }});
const T = textPart('T'), SHOW = textPart('SHOW'), U = textPart('U'), P = textPart('P');
const praises = () => TEXT[LANG].PRAISE, tries = () => TEXT[LANG].TRY;
const nameOf = x => (x && typeof x === 'object' && 'zh' in x) ? (x[LANG] != null ? x[LANG] : x.zh) : x;
function applyLang(){
  const el = document.documentElement;
  el.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  el.classList.toggle('en', LANG === 'en');
  document.title = U.appName;
}

/* ---------- saved progress (this device only) ---------- */
// Progress is kept in three places, so it survives a browser (or an in-app browser such as WeChat) clearing one:
// localStorage (everything), IndexedDB (everything) and a small cookie (finished games, hand ticks, settings).
// When the game opens they are merged: a game finished in any of them counts. "Reset progress" starts a new
// generation (gen), and copies from an older generation are ignored, so a reset never comes back.
const STORE_KEY = 'shuxue-leyuan-v1', COOKIE = 'shuxueleyuan', RESUME_V = 1;
// the parents' check table: its columns and the games each one covers
const CHECK_COLS = [
  ['num', ['count', 'place', 'write', 'draw', 'more', 'length', 'signs', 'order', 'ordinal', 'tens', 'numline']],
  ['calc', ['bond', 'pairs', 'calc', 'train', 'maketen']],
  ['shape', ['shape', 'pos', 'sort']],
  ['story', ['story']],
];
const RATES = [0.8, 1, 1.15];
function cleanState(s){
  if (!s || typeof s !== 'object') s = {};
  for (const k of ['done', 'check', 'resume']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};   // resume: where each unfinished game was left
  s.gen = +s.gen || 0;
  s.settings = Object.assign({lang:'zh', rate:1, sfx:true, music:true, leo:null, captions:false, short:false, pinyin:true}, s.settings || {});
  if (!LANGS.includes(s.settings.lang)) s.settings.lang = 'zh';
  return s;
}
// add another copy into s; true if anything was added
function mergeState(s, o){
  if (!o || typeof o !== 'object' || (+o.gen || 0) < s.gen) return false;
  let added = false;
  if ((+o.gen || 0) > s.gen){ s.gen = +o.gen; s.done = {}; s.check = {}; s.resume = {}; added = true; }   // that copy was reset later
  for (const [n, acts] of Object.entries(o.done || {})) for (const [k, v] of Object.entries(acts || {}))
    if (v && !(s.done[n] && s.done[n][k])){ (s.done[n] = s.done[n] || {})[k] = true; added = true; }
  for (const [n, marks] of Object.entries(o.check || {})) for (const [k, v] of Object.entries(marks || {}))
    if (!(s.check[n] && k in s.check[n])){ (s.check[n] = s.check[n] || {})[k] = !!v; added = true; }
  for (const [k, r] of Object.entries(o.resume || {}))
    if (r && (!s.resume[k] || (r.at || 0) > (s.resume[k].at || 0))){ s.resume[k] = r; added = true; }
  return added;
}
// the cookie: "1.<generation>.<finished games: 2 characters per lesson>.<hand ticks: 2 per lesson>.<settings>"
function toCookie(s){
  const d = LESSONS.map(l => l.acts.reduce((t, a, i) => t + (s.done[l.n] && s.done[l.n][a.key] ? 1 << i : 0), 0).toString(36).padStart(2, '0')).join('');
  const c = LESSONS.map(l => { const m = s.check[l.n] || {}; return CHECK_COLS.reduce((t, [k], i) => t + (k in m ? (m[k] ? 1 : 2) << (i * 2) : 0), 0).toString(16).padStart(2, '0'); }).join('');
  const st = s.settings, g = [st.lang === 'en' ? 1 : 0, Math.max(0, RATES.indexOf(st.rate)), +!!st.sfx, +!!st.music, +!!st.captions, +!!st.short, +!!st.pinyin].join('');
  return `1.${s.gen.toString(36)}.${d}.${c}.${g}`;
}
function fromCookie(code){
  const n = LESSONS.length * 2, m = new RegExp(`^1\\.([0-9a-z]+)\\.([0-9a-z]{${n}})\\.([0-9a-f]{${n}})\\.([01][0-2][01]{5})$`).exec(code || '');
  if (!m) return null;
  const o = {gen:parseInt(m[1], 36) || 0, done:{}, check:{}, resume:{}};
  LESSONS.forEach((l, i) => {
    const d = parseInt(m[2].substr(i * 2, 2), 36), c = parseInt(m[3].substr(i * 2, 2), 16);
    l.acts.forEach((a, j) => { if (d & (1 << j)) (o.done[l.n] = o.done[l.n] || {})[a.key] = true; });
    CHECK_COLS.forEach(([k], j) => { const v = (c >> (j * 2)) & 3; if (v) (o.check[l.n] = o.check[l.n] || {})[k] = v === 1; });
  });
  const g = m[4];
  o.settings = {lang:g[0] === '1' ? 'en' : 'zh', rate:RATES[+g[1]], sfx:g[2] === '1', music:g[3] === '1', captions:g[4] === '1', short:g[5] === '1', pinyin:g[6] === '1'};
  return o;
}
function readCookie(){
  try { const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)')); return m ? fromCookie(decodeURIComponent(m[1])) : null; } catch (e) { return null; }
}
function writeCookie(s){ try { document.cookie = `${COOKIE}=${encodeURIComponent(toCookie(s))}; max-age=34560000; path=/; SameSite=Lax`; } catch (e) {} }
const IDB = {
  db: null,
  open(){
    if (this.db) return this.db;
    return (this.db = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no IndexedDB'));
      const r = indexedDB.open('shuxue-leyuan', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    })).catch(e => { this.db = null; throw e; });
  },
  get(){ return this.open().then(db => new Promise(res => { const q = db.transaction('kv').objectStore('kv').get('state'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); })).catch(() => null); },
  put(json){ return this.open().then(db => new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(json, 'state'); tx.oncomplete = tx.onerror = tx.onabort = () => res(); })).catch(() => {}); },
};
let hadLocal = false;
const state = (() => {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
  hadLocal = !!(local && typeof local === 'object');
  const s = cleanState(local);
  const ck = readCookie();
  if (ck && mergeState(s, ck) && !hadLocal) Object.assign(s.settings, ck.settings);   // localStorage was lost: the cookie's settings
  return s;
})();
let persistAsked = false;
function saveState(){
  const json = JSON.stringify(state);
  try { localStorage.setItem(STORE_KEY, json); } catch (e) {}
  writeCookie(state);
  IDB.put(json);
  // ask the browser not to clear this site's storage when space runs low (Firefox would ask the user, so not there)
  if (!persistAsked){ persistAsked = true; try { if (navigator.storage && navigator.storage.persist && !/Firefox\//.test(navigator.userAgent)) navigator.storage.persist().catch(() => {}); } catch (e) {} }
}
// IndexedDB answers a moment after the start: anything there that the other two lost is added back
function restoreSaved(then){
  IDB.get().then(json => {
    let o = null;
    try { o = typeof json === 'string' ? JSON.parse(json) : null; } catch (e) {}
    const settings = o && o.settings, added = !!o && mergeState(state, o);
    if (added && !hadLocal && settings) Object.assign(state.settings, settings);
    if (added || JSON.stringify(state) !== json) saveState();   // all three copies the same again
    if (added) then();
  });
}
// ?lang=en (or zh) in the address picks the language
(() => {
  const m = /[?&]lang=(zh|en)\b/.exec(location.search);
  if (m && state.settings.lang !== m[1]){ state.settings.lang = m[1]; saveState(); }
  LANG = state.settings.lang;
})();
const applyPinyin = () => document.documentElement.classList.toggle('nopy', !state.settings.pinyin);
applyPinyin();
const isShort = () => !!state.settings.short;

/* ---------- 乐乐's voice ---------- */
let audioUnlocked = false;
// Pre-recorded clips (audio/<lang>/*.mp3, listed in audio/<lang>/manifest.js) play through one <audio> element,
// so they work in WeChat, on phones without a Chinese or English speech engine, and with the iPhone silent switch on.
// The browser's own speech (Web Speech API) is only a fallback for a missing clip.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}\u{20E3}]/gu;
const norm = t => String(t).replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
const clipsOf = lang => (window.MG_CLIPS && window.MG_CLIPS[lang]) || {};
// load the clip list of a language (the page loads the first one itself)
const manifestLoads = {};
function loadClips(lang){
  if (window.MG_CLIPS && window.MG_CLIPS[lang]) return Promise.resolve();
  if (!manifestLoads[lang]) manifestLoads[lang] = new Promise(res => {
    const s = document.createElement('script');
    s.src = `audio/${lang}/manifest.js?v=${(window.ASSET_VERSION || {})[lang] || ''}`;
    s.onload = s.onerror = () => res();
    document.head.append(s);
  });
  return manifestLoads[lang];
}
const Speech = {
  tts: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  voices: {}, gen: 0, current: null, audio: null, halt: null, blobs: new Map(), queue: [], loading: 0,
  init(){
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.setAttribute('playsinline', '');
    if (!this.tts) return;
    const load = () => {
      const all = speechSynthesis.getVoices();
      const zh = all.filter(v => /^(zh|cmn)([-_]|$)/i.test(v.lang));
      const zs = v => (/(zh|cmn)[-_](CN|Hans)/i.test(v.lang) ? 4 : 0) + (/xiaoxiao|tingting|ting-ting|huihui|yaoyao|meijia|google/i.test(v.name) ? 3 : 0) - (/(HK|TW|yue)/i.test(v.lang) ? 5 : 0);
      const en = all.filter(v => /^en([-_]|$)/i.test(v.lang));
      const es = v => (/en[-_]US/i.test(v.lang) ? 4 : 0) + (/samantha|allison|ava|google us|zira|jenny|aria/i.test(v.name) ? 3 : 0);
      this.voices = {zh: zh.sort((a, b) => zs(b) - zs(a))[0] || null, en: en.sort((a, b) => es(b) - es(a))[0] || null};
    };
    load();
    try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { speechSynthesis.onvoiceschanged = load; }
  },
  // Must run inside a tap: lets later clips play without a tap (iOS / Chrome autoplay rules).
  unlock(){
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const a = this.audio;
    try { a.src = SILENT_WAV; a.volume = 1; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
  },
  file: phrase => clipsOf(LANG)[norm(phrase)] || null,
  url(phrase){ const f = this.file(phrase); return f ? (this.blobs.get(LANG + '/' + f) || `audio/${LANG}/${f}`) : null; },
  // Fetch clips in the background so they play instantly later (first = jump the queue).
  preload(phrases, first){
    const add = [];
    for (const ph of phrases){ const f = this.file(ph); const k = f && LANG + '/' + f; if (k && !this.blobs.has(k) && !add.includes(k)) add.push(k); }
    this.queue = first ? [...add, ...this.queue.filter(k => !add.includes(k))] : [...this.queue, ...add.filter(k => !this.queue.includes(k))];
    const pump = () => {
      while (this.loading < 6 && this.queue.length){
        const k = this.queue.shift();
        if (this.blobs.has(k)) continue;
        this.loading++;
        fetch('audio/' + k).then(r => r.ok ? r.blob() : Promise.reject(r.status))
          .then(b => { this.blobs.set(k, URL.createObjectURL(new Blob([b], {type:'audio/mpeg'}))); })
          .catch(() => {})
          .finally(() => { this.loading--; pump(); });
      }
    };
    pump();
  },
  stopNow(){
    const a = this.audio;
    if (a){ a.onended = a.onerror = null; try { a.pause(); } catch (e) {} }
    if (this.tts) try { speechSynthesis.cancel(); } catch (e) {}
    if (this.halt){ const f = this.halt; this.halt = null; f(); }
  },
  stop(){ this.gen++; this.stopNow(); Music.duck(false); },
  // parts: a phrase or a list of phrases, spoken one after another
  speak(parts, opts = {}){
    const gen = ++this.gen;
    this.stopNow();
    const list = (Array.isArray(parts) ? parts : [parts]).filter(x => x != null).map(norm).filter(Boolean);
    if (window.__spoken && list.length && audioUnlocked) window.__spoken.push(list.join(' ')); // test hook
    if (list.length && audioUnlocked) Music.duck(true);   // the music goes quiet while 乐乐 talks
    return (async () => {
      try {
        for (let i = 0; i < list.length; i++){
          if (gen !== this.gen || !audioUnlocked) return;
          if (i) await wait(170);
          if (gen !== this.gen) return;
          await this.one(list[i], opts, gen);
        }
      } finally { if (gen === this.gen) Music.duck(false); }
    })();
  },
  async one(phrase, opts, gen){
    if (window.__fastSpeech){ if (!this.file(phrase) && window.__clipMiss) window.__clipMiss.push(LANG + ': ' + phrase); await wait(5); return; }   // test hook
    const url = this.url(phrase);
    if (url && await this.clip(url, opts, gen)) return;
    if (gen !== this.gen) return;
    if (!url && window.__clipMiss) window.__clipMiss.push(LANG + ': ' + phrase);
    await this.say(phrase, opts, gen);
  },
  rate: opts => clamp((opts.rate || 1) * state.settings.rate, 0.6, 1.5),
  clip(url, opts, gen){
    return new Promise(resolve => {
      const a = this.audio;
      let over = false, timer = null;
      const end = ok => { if (over) return; over = true; clearTimeout(timer); a.onended = a.onerror = null; if (this.halt === stopFn) this.halt = null; resolve(ok); };
      const stopFn = () => end(true);
      if (gen !== this.gen){ resolve(true); return; }
      this.halt = stopFn;
      a.onended = () => end(true);
      a.onerror = () => { this.last = 'error'; end(false); };
      a.onplaying = () => { this.last = 'ok'; };
      try {
        a.src = url;
        const r = this.rate(opts);
        a.defaultPlaybackRate = r; a.playbackRate = r;
        const pr = a.play();
        // iOS can refuse audio again after a call or time in the background; the next tap unlocks it
        if (pr && pr.catch) pr.catch(err => { if (err && err.name === 'NotAllowedError'){ this.blocked = true; this.last = 'blocked'; } end(false); });
      } catch (e) { end(false); return; }
      timer = setTimeout(() => end(true), 15000);
    });
  },
  // fallback: the browser's built-in speech
  say(text, opts, gen){
    return new Promise(resolve => {
      if (!this.tts){ resolve(); return; }
      let over = false, timer = null;
      const fin = () => { if (over) return; over = true; clearTimeout(timer); if (this.halt === fin) this.halt = null; resolve(); };
      const start = () => {
        if (gen !== this.gen){ fin(); return; }
        const u = new SpeechSynthesisUtterance(text), v = this.voices[LANG];
        if (v){ u.voice = v; u.lang = v.lang; } else u.lang = LANG === 'zh' ? 'zh-CN' : 'en-US';
        u.volume = 1;
        u.rate = clamp((opts.rate || 1) * state.settings.rate * 0.9, 0.5, 1.4);
        u.pitch = 1.08;
        u.onend = fin; u.onerror = fin;
        this.current = u; // keep a reference: some browsers drop events for collected utterances
        this.halt = fin;
        try { speechSynthesis.speak(u); if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) { fin(); return; }
        timer = setTimeout(fin, 2500 + text.length * 300 / u.rate);
      };
      if (speechSynthesis.speaking || speechSynthesis.pending){ speechSynthesis.cancel(); setTimeout(start, 70); }
      else start();
    });
  },
};
// a tiny silent WAV, played inside the first tap to unlock audio
const SILENT_WAV = (() => {
  const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], {type:'audio/wav'}));
})();

/* ---------- sound effects (Web Audio, no files needed) ---------- */
const Sfx = {
  ctx: null,
  ensure(){
    if (!this.ctx){ const AC = window.AudioContext || window.webkitAudioContext; if (AC) try { this.ctx = new AC(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  tone(freq, dur, o = {}){
    if (!state.settings.sfx || !audioUnlocked) return;
    const c = this.ensure(); if (!c) return;
    try {
      const t = c.currentTime + (o.when || 0);
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((o.vol || 0.18) * 2, t + 0.015);   // phones play quietly
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch (e) {}
  },
  tap(){ this.tone(700, 0.06, {type:'triangle', vol:0.1}); },
  tick(k){ this.tone(520 + (k % 12) * 70, 0.08, {type:'triangle', vol:0.1}); },
  good(){ [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, {type:'triangle', when:i * 0.07, vol:0.15})); },
  bad(){ this.tone(300, 0.28, {type:'sine', slide:170, vol:0.16}); },
  pop(){ this.tone(420, 0.1, {type:'square', slide:1400, vol:0.07}); },
  stroke(){ this.tone(880, 0.07, {type:'triangle', vol:0.08}); },
  whistle(){ this.tone(880, 0.35, {type:'sine', slide:990, vol:0.12}); this.tone(1175, 0.35, {type:'sine', when:0.4, slide:1320, vol:0.12}); },
  win(){ [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.26, {type:'triangle', when:i * 0.08, vol:0.14})); },
};

/* ---------- background music: audio/music.mp3, an original loop made by tools/make_music.py ---------- */
const Music = {
  buf: null, src: null, master: null, loading: null, ducked: false, undock: null,
  level(){ return this.ducked ? 0.06 : 0.2; },
  load(){
    const c = Sfx.ensure();
    if (!c || this.buf) return null;
    if (!this.loading) this.loading = fetch('audio/music.mp3?v=' + ((window.ASSET_VERSION || {}).music || '')).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(ab => new Promise((res, rej) => c.decodeAudioData(ab, res, rej)))
      .then(b => { this.buf = b; }).catch(() => {}).then(() => { this.loading = null; });
    return this.loading;
  },
  start(){
    if (!state.settings.music || !audioUnlocked || document.hidden || this.src) return;
    const c = Sfx.ensure(); if (!c) return;
    if (!this.buf){ const p = this.load(); if (p) p.then(() => { if (this.buf) this.start(); }); return; }
    try {
      if (!this.master){ this.master = c.createGain(); this.master.gain.value = this.level(); this.master.connect(c.destination); }
      const g = c.createGain(), s = c.createBufferSource();
      s.buffer = this.buf; s.loop = true; s.connect(g); g.connect(this.master);
      g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
      s.start();
      this.src = {s, g};
    } catch (e) {}
  },
  stop(){
    const cur = this.src, c = Sfx.ctx;
    if (!cur || !c) return;
    this.src = null;
    try {
      cur.g.gain.cancelScheduledValues(c.currentTime); cur.g.gain.setValueAtTime(cur.g.gain.value, c.currentTime);
      cur.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
      cur.s.stop(c.currentTime + 0.45);
    } catch (e) {}
  },
  duck(on){
    clearTimeout(this.undock);
    if (on){ if (!this.ducked){ this.ducked = true; this.fade(0.15); } }
    else if (this.ducked) this.undock = setTimeout(() => { this.ducked = false; this.fade(0.9); }, 350);
  },
  fade(secs){
    const c = Sfx.ctx; if (!c || !this.master) return;
    try { const g = this.master.gain, t = c.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(this.level(), t + secs); } catch (e) {}
  },
};
function setMusic(on){
  state.settings.music = on; saveState();
  if (on) Music.start(); else Music.stop();
}

/* ---------- visual effects ---------- */
function confetti(n = 50){
  const colors = ['#ff5fa2', '#ffd23f', '#22c07a', '#3d8bfd', '#7c5cff', '#ff9f1c', '#e8453c'];
  for (let i = 0; i < n; i++){
    const c = h('i', {class:'confetti', 'aria-hidden':'true', style:{
      left: Math.random() * 100 + 'vw', background: colors[i % colors.length],
      '--dx': (Math.random() * 240 - 120) + 'px', '--rot': (Math.random() * 900 - 450) + 'deg',
      animationDuration: (1.6 + Math.random() * 1.5) + 's', animationDelay: (Math.random() * 0.35) + 's'}});
    document.body.append(c);
    setTimeout(() => c.remove(), 3800);
  }
}
function burst(el){
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let k = 0; k < 10; k++){
    const ang = k / 10 * Math.PI * 2, dist = 60 + Math.random() * 60;
    const s = h('span', {class:'spark', 'aria-hidden':'true', style:{left:cx + 'px', top:cy + 'px', '--tx':Math.cos(ang) * dist + 'px', '--ty':Math.sin(ang) * dist + 'px'}}, pick(['⭐', '✨', '🌟']));
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  }
}
// Run fn once 乐乐 has finished talking (and at least minMs has passed), unless the child has left the screen.
function afterSay(spoken, minMs, fn){
  const id = navId;
  Promise.all([spoken, wait(minMs)]).then(() => { if (id === navId) fn(); });
}
// Call fn when el changes size.
function watchSize(el, fn){
  if (window.ResizeObserver){ const ro = new ResizeObserver(fn); ro.observe(el); cleanups.push(() => ro.disconnect()); }
  else { window.addEventListener('resize', fn); cleanups.push(() => window.removeEventListener('resize', fn)); }
}
// Finger or mouse strokes on an element. Only the first finger draws, so a resting palm or a second finger is ignored.
// positions are relative to `rel` (the element itself unless given)
function onStrokes(el, {down, move, up}, rel = el){
  el.addEventListener('contextmenu', e => e.preventDefault());
  const pos = e => { const r = rel.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; };
  if (window.PointerEvent){
    let id = null;
    el.addEventListener('pointerdown', e => {
      if (id !== null || down(pos(e)) === false) return;
      id = e.pointerId; e.preventDefault();
      try { el.setPointerCapture(id); } catch (err) {}
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of (evs.length ? evs : [e])) move(pos(ev));
    });
    const stop = e => { if (e.pointerId !== id) return; id = null; up(); };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    return;
  }
  // older iPads (iOS < 13) have touch events only
  let tid = null, mouse = false;
  const find = e => { for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === tid) return e.changedTouches[i]; return null; };
  el.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    if (tid !== null || down(pos(t)) === false) return;
    tid = t.identifier; e.preventDefault();
  }, {passive:false});
  el.addEventListener('touchmove', e => { const t = find(e); if (t){ e.preventDefault(); move(pos(t)); } }, {passive:false});
  const tend = e => { if (find(e)){ tid = null; up(); } };
  el.addEventListener('touchend', tend);
  el.addEventListener('touchcancel', tend);
  el.addEventListener('mousedown', e => { if (down(pos(e)) !== false) mouse = true; });
  const mm = e => { if (mouse) move(pos(e)); }, mu = () => { if (mouse){ mouse = false; up(); } };
  window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
  cleanups.push(() => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); });
}
function replayAnim(el, cls){
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  const off = e => { if (e.target !== el) return; el.classList.remove(cls); el.removeEventListener('animationend', off); };
  el.addEventListener('animationend', off);
}
const wiggle = el => replayAnim(el, 'shake');
const bounce = el => replayAnim(el, 'bounce');
function reveal(btn){ btn.hidden = false; requestAnimationFrame(() => { try { btn.scrollIntoView({behavior:'smooth', block:'nearest'}); } catch (e) {} }); }

/* ---------- the mascot (乐乐 / Leo the lion) ---------- */
let lastSay = null, sayCount = 0, bubbleTimer = null;
const bubbleEl = h('div', {class:'bubble', 'aria-live':'polite'});
let leoDragged = false;
const lionEl = h('button', {class:'lion', onclick:() => {
  if (leoDragged) return;   // that was a drag, not a tap
  if (lastSay) say(lastSay.text, lastSay.speech);
}}, '🦁');
const mascotEl = h('aside', {class:'mascot'}, lionEl, bubbleEl);
document.body.append(mascotEl);
function labelMascot(){ lionEl.setAttribute('aria-label', U.lionLabel); mascotEl.setAttribute('aria-label', U.lionName); }

// Put 乐乐 at (x, y) = his top-left corner; his bubble opens towards the side with more room.
let leoAt = null;   // where he was last put (measuring him mid-move can lag a frame behind)
function placeLeo(x, y, save){
  const lw = lionEl.offsetWidth || 64, lh = lionEl.offsetHeight || 64, vw = innerWidth, vh = innerHeight;
  x = clamp(x, 4, vw - lw - 4);
  y = clamp(y, 4, vh - lh - 4);
  const right = x + lw / 2 > vw / 2, low = y + lh / 2 > vh / 2;
  const st = mascotEl.style;
  mascotEl.classList.add('moved');
  mascotEl.classList.toggle('flip', right);
  mascotEl.classList.toggle('top', !low);
  if (right){ st.left = 'auto'; st.right = (vw - x - lw) + 'px'; } else { st.right = 'auto'; st.left = x + 'px'; }
  if (low){ st.top = 'auto'; st.bottom = (vh - y - lh) + 'px'; } else { st.bottom = 'auto'; st.top = y + 'px'; }
  leoAt = {x, y};
  if (save){ state.settings.leo = {fx:(x + lw / 2) / vw, fy:(y + lh / 2) / vh}; saveState(); }
}
function restoreLeo(){
  const p = state.settings.leo;
  if (p && isFinite(p.fx) && isFinite(p.fy)) placeLeo(p.fx * innerWidth - (lionEl.offsetWidth || 64) / 2, p.fy * innerHeight - (lionEl.offsetHeight || 64) / 2, false);
}
function putLeoBack(){
  state.settings.leo = null; saveState();
  mascotEl.classList.remove('moved', 'flip', 'top');
  ['left', 'right', 'top', 'bottom'].forEach(k => { mascotEl.style[k] = ''; });
  bounce(lionEl);
}
(() => {
  let drag = null;
  const begin = (id, cx, cy) => { const r = lionEl.getBoundingClientRect(); drag = {id, cx, cy, x:r.left, y:r.top, moved:false}; };
  const moveTo = (cx, cy) => {
    if (!drag) return false;
    const dx = cx - drag.cx, dy = cy - drag.cy;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return false;   // a small wobble is still a tap
    if (!drag.moved){ drag.moved = true; mascotEl.classList.add('dragging'); }
    placeLeo(drag.x + dx, drag.y + dy, false);
    return true;
  };
  const finish = () => {
    if (!drag) return;
    if (drag.moved){
      leoDragged = true; setTimeout(() => { leoDragged = false; }, 60);
      mascotEl.classList.remove('dragging');
      if (leoAt) placeLeo(leoAt.x, leoAt.y, true);
      Sfx.pop(); bounce(lionEl);
    }
    drag = null;
  };
  if (window.PointerEvent){
    lionEl.addEventListener('pointerdown', e => { begin(e.pointerId, e.clientX, e.clientY); try { lionEl.setPointerCapture(e.pointerId); } catch (err) {} });
    lionEl.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id && moveTo(e.clientX, e.clientY)) e.preventDefault(); });
    lionEl.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) finish(); });
    lionEl.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) finish(); });
  } else {   // older iPads
    lionEl.addEventListener('touchstart', e => { const t = e.changedTouches[0]; begin(t.identifier, t.clientX, t.clientY); }, {passive:true});
    lionEl.addEventListener('touchmove', e => { const t = e.changedTouches[0]; if (moveTo(t.clientX, t.clientY)) e.preventDefault(); }, {passive:false});
    lionEl.addEventListener('touchend', finish);
    lionEl.addEventListener('touchcancel', finish);
  }
  window.addEventListener('resize', restoreLeo);
  restoreLeo();
})();
// text = what the bubble shows, speech = what 乐乐 says (so answers are never shown as text before they are found)
// With "show what 乐乐 says" on, the bubble shows exactly what he says, so the game can be played with the sound off.
let welcomeAt = -1;   // a game carried on after a reload: 乐乐's next line there starts with "welcome back"
const caption = speech => (Array.isArray(speech) ? speech : [speech]).filter(x => x != null).map(norm).filter(Boolean).join(' ');
function say(text, speech){
  if (speech == null) speech = text;
  if (welcomeAt === navId && welcomeAt >= 0){
    welcomeAt = -1;
    speech = [T.welcomeBack, ...(Array.isArray(speech) ? speech : [speech])];
    text = SHOW.welcomeBack + ' ' + text;
  }
  lastSay = {text, speech};
  const my = ++sayCount;
  bubbleEl.textContent = state.settings.captions ? caption(speech) : text;
  bubbleEl.classList.add('show');
  mascotEl.classList.add('talking');
  clearTimeout(bubbleTimer);
  return Speech.speak(speech)
    .then(() => {
      if (my !== sayCount) return;
      mascotEl.classList.remove('talking');
      if (!state.settings.captions) bubbleTimer = setTimeout(() => { if (my === sayCount) bubbleEl.classList.remove('show'); }, 6000);
    });
}

/* ---------- navigation ---------- */
let navId = 0, timers = [], cleanups = [], overlayEl = null;
function later(fn, ms){ const id = navId; const t = setTimeout(() => { if (id === navId) fn(); }, ms); timers.push(t); return t; }
function resetScope(){
  navId++;
  timers.forEach(clearTimeout); timers = [];
  cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = [];
  Speech.stop(); closeOverlay();
  mascotEl.classList.remove('talking');
}
function go(hash){ if (location.hash === hash || (hash === '#/' && !location.hash)) route(); else location.hash = hash; }
function mount(...nodes){ $('#app').replaceChildren(...nodes.flat(Infinity).filter(Boolean)); window.scrollTo(0, 0); }
function overlay(content, cls = ''){
  closeOverlay();
  const panel = h('div', {class:'panel', role:'dialog', 'aria-modal':'true'}, content);
  const title = panel.querySelector('h1');
  if (title){ title.id = 'dlg-title'; panel.setAttribute('aria-labelledby', 'dlg-title'); }
  overlayEl = h('div', {class:'overlay ' + cls}, panel);
  document.body.append(overlayEl);
  return overlayEl;
}
function closeOverlay(){ if (overlayEl){ overlayEl.remove(); overlayEl = null; } }

function route(){
  resetScope();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'lesson' && LESSON_BY_N[+parts[1]]){
    const l = LESSON_BY_N[+parts[1]];
    const a = parts[2] && l.acts.find(x => x.key === parts[2]);
    return a ? showActivity(l, a) : showLesson(l);
  }
  if (parts[0] === 'stickers') return showStickers();
  if (parts[0] === 'start') return showStart();
  if (parts[0] === 'parents') return showParents();
  showHome();
}

/* ---------- progress helpers ---------- */
const isDone = (n, k) => !!(state.done[n] && state.done[n][k]);
const doneCount = l => l.acts.filter(a => isDone(l.n, a.key)).length;
const lessonComplete = l => doneCount(l) === l.acts.length;
const totalStars = () => LESSONS.reduce((t, l) => t + doneCount(l), 0);
const actName = (l, a) => actInfo(l, a)[0];
const actIcon = (l, a) => actInfo(l, a)[1];

const LIGHT_BG = new Set(['var(--pink)', 'var(--green)', 'var(--orange)', 'var(--teal)', 'var(--gold)', 'var(--yellow)', 'var(--lime)']);
const UNIT_COLORS = {0:['var(--orange)', 'var(--orange-d)'], 1:['var(--blue)', 'var(--blue-d)'], 2:['var(--purple)', 'var(--purple-d)'], 3:['var(--teal)', 'var(--teal-d)'],
  4:['var(--pink)', 'var(--pink-d)'], 5:['var(--red)', 'var(--red-d)'], 6:['var(--green)', 'var(--green-d)']};
const lessonColor = l => UNIT_COLORS[l.unit];

const starPill = () => h('div', {class:'pill', 'aria-label':U.stars}, '⭐ ', totalStars());
const backBtn = hash => h('button', {class:'icon-btn', 'aria-label':U.back, onclick:() => { Sfx.tap(); go(hash); }}, '⬅️');
const listenBtn = fn => h('button', {class:'listen', 'aria-label':U.listen, onclick:() => { Sfx.tap(); fn(); }}, '🔊');

/* =====================================================================
   SCREENS
   ===================================================================== */
// the game's icon (a sum, 1 + 2 = ?), on the start screen and next to the name
const ICON = 'icons/icon.svg?v=2';

function showHome(quiet){
  const next = LESSONS.find(l => !lessonComplete(l));
  mount(
    h('header', {class:'topbar'},
      h('h1', {class:'brand'}, h('button', {class:'brand-btn', 'aria-label':U.toStart, title:U.startPage,
        onclick:() => { Sfx.tap(); go('#/start'); }}, h('img', {class:'logo', src:ICON, alt:'', 'aria-hidden':'true'}), h('span', {class:'name'}, U.appName))),
      starPill(),
      h('button', {class:'icon-btn', 'aria-label':U.myStickers, onclick:() => { Sfx.tap(); go('#/stickers'); }}, '🏆'),
      h('button', {class:'icon-btn', 'aria-label':U.parents, onclick:() => { Sfx.tap(); go('#/parents'); }}, '👪'),
      h('button', {class:'icon-btn', 'aria-label':U.update, title:U.update, onclick:() => forceRefresh()}, '🔄')),
    updateSlot,
    UNITS.map(([u, icon]) => [
      h('h2', {class:'section-title'}, icon, ' ', U.unitTitle(u)),
      h('div', {class:'lesson-grid'}, LESSONS.filter(l => l.unit === u).map(l => lessonBtn(l, l === next))),
    ]),
    h('div', {class:'row', style:{marginTop:'28px'}},
      h('button', {class:'btn white', onclick:() => { Sfx.tap(); go('#/start'); }}, U.startPageBtn),
      musicButton(), langButton()),
    h('p', {class:'version'}, versionText())
  );
  if (quiet) return;
  const line = next && next.n > 1 ? P.playLesson(next.n) : T.pickLesson;
  say(line + ' 👆', line);
}

function musicButton(){
  const label = () => state.settings.music ? U.musicOn : U.musicOff;
  const b = h('button', {class:'btn white', 'aria-pressed':String(!!state.settings.music), onclick:() => {
    Sfx.tap(); setMusic(!state.settings.music);
    b.textContent = label(); b.setAttribute('aria-pressed', String(!!state.settings.music));
  }}, label());
  return b;
}
// 中文 ⇄ English
function setLang(lang){
  if (!LANGS.includes(lang) || lang === LANG) return Promise.resolve();
  state.settings.lang = lang; saveState();
  LANG = lang; applyLang(); labelMascot();
  return loadClips(lang);
}
function langButton(){
  return h('button', {class:'btn white', 'aria-label':U.switchLang, onclick:() => { Sfx.tap(); setLang(LANG === 'zh' ? 'en' : 'zh').then(() => route()); }}, U.otherLang);
}
function langSeg(onPick){
  const wrap = h('div', {class:'seg lang-seg', role:'radiogroup', 'aria-label':'语言 Language'});
  for (const [lang, label] of [['zh', '中文'], ['en', 'English']]) wrap.append(h('button', {class:lang === LANG ? 'on' : null, role:'radio', 'aria-checked':String(lang === LANG), lang:lang === 'zh' ? 'zh-CN' : 'en',
    onclick:() => { Sfx.tap(); setLang(lang).then(onPick); }}, label));
  return wrap;
}

// The first screen ("数学乐园 ▶ 开始"). Shown when the game opens, and at #/start.
function showStart(){
  if (/^#\/start/.test(location.hash)) showHome(true);   // the home screen waits underneath
  overlay([
    h('img', {class:'hero-icon', src:ICON, alt:''}),
    h('h1', {}, U.appName),
    h('p', {}, U.tagline),
    h('p', {class:'sound-tip'}, U.soundOn),
    h('div', {class:'row'}, h('button', {class:'btn green big go', onclick:() => {
      audioUnlocked = true; Speech.unlock(); Sfx.ensure(); Sfx.win(); Music.start();
      closeOverlay();
      Speech.preload(globalPhrases());
      // from the start screen, 开始 leads to the home screen
      if (/^#\/start/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search + '#/'); } catch (e) { location.hash = '#/'; }
      const greet = location.hash.length > 2 ? null : T.greet;
      if (greet) say(SHOW.greet, greet).then(() => { if (lastSay && lastSay.speech === greet) route(); });
      else route();
    }}, U.start)),
    langSeg(() => { closeOverlay(); showStart(); }),
    h('p', {class:'version'}, versionText()),
  ], 'splash');
}

function lessonBtn(l, isNext){
  const [c, d] = lessonColor(l);
  const cnt = doneCount(l), label = nameOf(l.title);
  const status = cnt === l.acts.length ? U.statusDone : cnt ? U.statusSome(cnt, l.acts.length) : '';
  return h('button', {class:'lesson-btn' + (isNext ? ' next' : '') + (LIGHT_BG.has(c) ? ' ink' : ''), style:{'--c':c, '--d':d}, 'aria-label':U.lessonAria(l.n, label) + status,
      onclick:() => { Sfx.tap(); go('#/lesson/' + l.n); }},
    h('span', {class:'num'}, l.n),
    h('span', {class:'letters' + ([...label].length > 5 ? ' small' : '')}, label),
    h('span', {class:'dots'}, l.acts.map(a => h('i', {class:isDone(l.n, a.key) ? 'on' : null}))),
    lessonComplete(l) ? h('span', {class:'sticker'}, STICKERS[l.n - 1][0]) : null);
}

// the chips on a lesson page: numbers, signs or shapes; a tap says what they are
function chipEl(c, l){
  const tap = (e, text, speech) => { Sfx.tap(); bounce(e.currentTarget); say(text, speech); };
  if (typeof c === 'number') return h('button', {class:'hero-chip', 'aria-label':String(c), onclick:e => tap(e, String(c), P.n(c))}, String(c));
  if (SHAPES.includes(c)) return h('button', {class:'hero-chip shape', 'aria-label':P.shapeName(c), onclick:e => tap(e, P.shapeName(c), P.shapeName(c))}, shapeSvg(c));
  const sign = {'>':'gt', '<':'lt', '=':'eq', '+':'plus', '−':'minus'}[c];
  return h('button', {class:'hero-chip sign', 'aria-label':c, onclick:e => sign ? tap(e, c, T['sign_' + sign]) : tap(e, P.introShow(l.n), P.intro(l.n))}, c);
}
function readLesson(l){ say(P.introShow(l.n), P.intro(l.n)); }

function showLesson(l){
  const next = l.acts.find(a => !isDone(l.n, a.key));
  mount(
    h('header', {class:'topbar'}, backBtn('#/'), h('h1', {class:'title'}, U.lessonTitle(l.n), ' · ', nameOf(l.title)), starPill()),
    h('section', {class:'lesson-hero'},
      l.chips ? h('div', {class:'hero-chips'}, l.chips.map(c => chipEl(c, l))) : null,
      h('div', {class:'hero-focus'}, U.unitTitle(l.unit)),
      h('div', {class:'hero-row'},
        h('button', {class:'btn white', onclick:() => { Sfx.tap(); readLesson(l); }}, U.listenLesson))),
    h('div', {class:'act-grid'}, l.acts.map((a, i) => {
      const done = isDone(l.n, a.key), [name, icon, color] = actInfo(l, a);
      const resumable = !done && state.resume[l.n + '/' + a.key];
      return h('button', {class:'act-card' + (done ? ' done' : '') + (a === next ? ' next' : ''), style:{'--c':color}, 'aria-label':`${i + 1}. ${name}${done ? U.statusDone : ''}`,
          onclick:() => { Sfx.tap(); go(`#/lesson/${l.n}/${a.key}`); }},
        h('span', {class:'step'}, i + 1),
        done ? h('span', {class:'check'}, '✅') : resumable ? h('span', {class:'check'}, '⏸️') : null,
        h('span', {class:'ic'}, icon),
        h('span', {class:'nm'}, name));
    }))
  );
  Speech.preload(lessonPhrases(l), true);
  if (next) say(U.lessonNext(l.n, actIcon(l, next), actName(l, next)), [P.lesson(l.n), P.playAct(actName(l, next))]);
  else say(U.lessonAgain(l.n), [P.finished(l.n), T.playAgain]);
}

// Every game remembers where it was after each question (ctx.save), so leaving it or reloading the page
// carries on from there (ctx.saved). Finishing the game forgets it; "↺" starts the game again.
function showActivity(l, a){
  const bar = h('i');
  const stage = h('div', {class:'stage'});
  const id = navId, key = l.n + '/' + a.key;
  const kept = state.resume[key];
  let over = false;
  const saved = kept && kept.v === RESUME_V && kept.lang === LANG ? kept : null;
  const seed = saved && saved.seed ? saved.seed : newSeed();
  const ctx = {
    lesson:l, act:a, stage, replay:null, saved, seed,
    rng: makeRng(seed),
    alive: () => id === navId,
    progress: f => { bar.style.width = Math.round(clamp(f, 0, 1) * 100) + '%'; },
    // where the game is, so a reload carries on from there (each game calls it once a question is done)
    save: data => { if (id !== navId || over) return; state.resume[key] = Object.assign({v:RESUME_V, at:Date.now(), seed, lang:LANG}, data); saveState(); },
    done: () => { if (id !== navId || over) return; over = true; delete state.resume[key]; finishActivity(l, a); },
  };
  Speech.preload(lessonPhrases(l), true);
  const again = saved ? h('button', {class:'icon-btn', 'aria-label':U.startAgain, title:U.startAgain, onclick:() => {
    Sfx.tap(); delete state.resume[key]; saveState(); route();
  }}, '↺') : null;
  mount(
    h('header', {class:'topbar act-head'},
      backBtn('#/lesson/' + l.n),
      h('h1', {class:'act-title', 'aria-label':U.actAria(l.n, actName(l, a))}, actIcon(l, a), ' ', h('span', {class:'nm'}, actName(l, a))),
      h('div', {class:'progress', role:'progressbar', 'aria-label':U.progress}, bar),
      again,
      h('button', {class:'icon-btn', 'aria-label':U.hearAgain, onclick:() => { Sfx.tap(); if (ctx.replay) ctx.replay(); }}, '🔊')),
    stage);
  const run = GAMES[a.type];
  if (!saved){ run(ctx); return; }
  welcomeAt = navId;   // 乐乐's next line starts with "welcome back"
  try { run(ctx); }
  catch (e){   // a place saved by an older version that no longer fits: start the game fresh
    welcomeAt = -1; delete state.resume[key]; saveState(); ctx.saved = null; stage.replaceChildren(); run(ctx);
  }
}

function finishActivity(l, a){
  const first = !isDone(l.n, a.key);
  (state.done[l.n] = state.done[l.n] || {})[a.key] = true;
  saveState();
  Sfx.win(); confetti(60);
  const idx = l.acts.indexOf(a);
  const nextAct = l.acts.slice(idx + 1).find(x => !isDone(l.n, x.key)) || l.acts.slice(0, idx).find(x => !isDone(l.n, x.key));
  const nextLesson = LESSON_BY_N[l.n + 1];
  if (first && lessonComplete(l)){
    const [emo] = STICKERS[l.n - 1], name = stickerName(l.n);
    overlay([
      h('div', {class:'big-star'}, emo),
      h('h1', {}, U.lessonDone),
      h('p', {}, P.gotSticker(name)),
      h('div', {class:'row'},
        nextLesson ? h('button', {class:'btn green big', onclick:() => go('#/lesson/' + nextLesson.n)}, U.nextLesson(nextLesson.n)) : null,
        h('button', {class:'btn pink', onclick:() => go('#/stickers')}, U.myStickersBtn),
        h('button', {class:'btn white', onclick:() => go('#/')}, U.homeBtn)),
    ]);
    say(U.hoorayLesson(l.n), [T.hooray, P.finished(l.n), P.gotSticker(name)]);
    confetti(80);
    return;
  }
  const pr = pick(praises());
  overlay([
    h('div', {class:'big-star'}, '⭐'),
    h('h1', {}, pr),
    h('p', {}, first ? U.gotStar : U.doneAgain),
    h('div', {class:'row'},
      nextAct ? h('button', {class:'btn green big', onclick:() => go(`#/lesson/${l.n}/${nextAct.key}`)}, actIcon(l, nextAct), ' ', actName(l, nextAct), ' ➜')
              : (nextLesson ? h('button', {class:'btn green big', onclick:() => go('#/lesson/' + nextLesson.n)}, U.nextLesson(nextLesson.n)) : null),
      h('button', {class:'btn white', onclick:() => go('#/lesson/' + l.n)}, U.backToLesson(l.n))),
  ]);
  say(first ? T.earnedStar + ' ⭐' : T.greatJob, first ? [pr, T.earnedStar] : pr);
}

const stickerName = n => LANG === 'zh' ? STICKERS[n - 1][1] : STICKERS[n - 1][2];
function showStickers(){
  const count = LESSONS.filter(lessonComplete).length;
  mount(
    h('header', {class:'topbar'}, backBtn('#/'), h('h1', {class:'title'}, `🏆 ${U.myStickers}  ${count}/${LESSONS.length}`), starPill()),
    h('div', {class:'sticker-grid'}, LESSONS.map(l => {
      const got = lessonComplete(l);
      const [emo] = STICKERS[l.n - 1], name = stickerName(l.n);
      return h('button', {class:'sticker-slot' + (got ? ' got' : ''), 'aria-label':U.stickerAria(l.n, got ? name : null), onclick:e => {
          Sfx.tap(); bounce(e.currentTarget);
          if (got) say(P.aSticker(name) + ' 🎉', P.aSticker(name)); else say(P.finishFor(l.n));
        }},
        h('span', {class:'st'}, got ? emo : '❔'), h('span', {class:'lb'}, U.lessonTitle(l.n)));
    })));
  say(count ? P.haveStickers(count) + ' 🎉' : T.finishALesson, count ? P.haveStickers(count) : T.finishALesson);
}

const soundStatus = h('span', {class:'note', role:'status'});
// Play a test line and report what happened, so a parent can tell why there is no sound.
function soundCheck(){
  Sfx.good();
  soundStatus.textContent = U.checking;
  Speech.last = null;
  const clips = Object.keys(clipsOf(LANG)).length;
  Speech.speak(T.readingVoice);
  setTimeout(() => {
    const r = Speech.last;
    soundStatus.textContent = !clips ? U.soundNoClips : r === 'ok' ? U.soundOk : r === 'blocked' ? U.soundBlocked : r === 'error' ? U.soundError : U.soundNone;
  }, 2200);
}

function showParents(){
  soundStatus.textContent = '';
  const seg = (name, options, cur, onPick) => {
    const wrap = h('div', {class:'seg', role:'radiogroup', 'aria-label':name});
    options.forEach(([label, val]) => wrap.append(h('button', {class:val === cur ? 'on' : null, role:'radio', 'aria-checked':String(val === cur), onclick:e => {
      [...wrap.children].forEach(b => { b.classList.toggle('on', b === e.currentTarget); b.setAttribute('aria-checked', String(b === e.currentTarget)); });
      onPick(val);
    }}, label)));
    return wrap;
  };
  // A box is ticked automatically when the child finishes the games; a tap sets it by hand.
  const checkBtn = (l, col, types) => {
    const own = l.acts.filter(a => types.includes(a.type));
    if (!own.length) return h('span', {class:'na', title:U.noSuchColumn}, '—');
    const auto = own.every(a => isDone(l.n, a.key));
    const mine = state.check[l.n] || {};
    const hand = Object.prototype.hasOwnProperty.call(mine, col);
    const on = hand ? !!mine[col] : auto;
    const b = h('button', {class:'check-btn' + (hand ? ' hand' : ''), 'aria-pressed':String(on), 'aria-label':U.checkAria(l.n, U.checkCols[col], on),
      title: hand ? U.tickByHand : (auto ? U.tickByGame : U.tickHere),
      onclick:() => {
        Sfx.tap();
        (state.check[l.n] = state.check[l.n] || {})[col] = !on;
        saveState();
        b.replaceWith(checkBtn(l, col, types));
      }}, on ? '✅' : '⬜');
    return b;
  };
  mount(
    h('header', {class:'topbar'}, backBtn('#/'), h('h1', {class:'title'}, U.parentsTitle)),
    h('section', {class:'panel-card'},
      h('h2', {}, U.guideTitle),
      U.guideIntro.map(p => h('p', {}, p)),
      h('ul', {}, U.guideList.map(li => h('li', {}, li))),
      h('p', {class:'note'}, U.guideTip)),
    h('section', {class:'panel-card'},
      h('h2', {}, U.settings),
      h('div', {class:'setting'}, h('label', {}, '语言 · Language'), langSeg(() => route())),
      h('p', {class:'note'}, U.langNote),
      h('div', {class:'setting'}, h('label', {}, U.voiceSpeed),
        seg(U.voiceSpeed, [[U.slow, RATES[0]], [U.normal, RATES[1]], [U.fast, RATES[2]]], state.settings.rate, v => { state.settings.rate = v; saveState(); Speech.speak(T.readingVoice); })),
      LANG === 'zh' ? h('div', {class:'setting'}, h('label', {}, U.pinyin),
        seg(U.pinyin, [[U.show, true], [U.hide, false]], !!state.settings.pinyin, v => { state.settings.pinyin = v; saveState(); applyPinyin(); Sfx.tap(); })) : null,
      h('div', {class:'setting'}, h('label', {}, U.sfx),
        seg(U.sfx, [[U.on1, true], [U.off1, false]], state.settings.sfx, v => { state.settings.sfx = v; saveState(); Sfx.good(); })),
      h('div', {class:'setting'}, h('label', {}, U.music),
        seg(U.music, [[U.on2, true], [U.off2, false]], state.settings.music, v => setMusic(v))),
      h('div', {class:'setting'}, h('label', {}, U.captions),
        seg(U.captions, [[U.on3, true], [U.off3, false]], !!state.settings.captions, v => { state.settings.captions = v; saveState(); Sfx.tap(); })),
      h('p', {class:'note'}, U.captionsNote),
      h('div', {class:'setting'}, h('label', {}, U.length),
        seg(U.length, [[U.short, true], [U.normalLen, false]], !!state.settings.short, v => { state.settings.short = v; saveState(); Sfx.tap(); })),
      h('p', {class:'note'}, U.lengthNote),
      h('div', {class:'setting'}, h('label', {}, U.lionName),
        h('button', {class:'btn white', onclick:() => { Sfx.tap(); putLeoBack(); }}, U.putBack)),
      h('div', {class:'setting'}, h('label', {}, U.soundTest),
        h('button', {class:'btn blue', onclick:() => soundCheck()}, U.testSound), soundStatus),
      h('p', {class:'note'}, U.soundHelp),
      h('div', {class:'setting'}, h('label', {}, U.updateLabel),
        h('button', {class:'btn teal', onclick:() => forceRefresh()}, U.updateBtn),
        h('span', {class:'note'}, U.current + versionText())),
      updateSlot),
    h('section', {class:'panel-card'},
      h('h2', {}, U.checkTitle),
      h('div', {class:'table-wrap'}, h('table', {class:'prog'},
        h('thead', {}, h('tr', {}, h('th', {}, U.lessonCol), CHECK_COLS.map(([col]) => h('th', {}, U.checkCols[col])))),
        h('tbody', {}, LESSONS.map(l => h('tr', {},
          h('td', {class:'l'}, h('b', {}, `${l.n}. ${nameOf(l.title)}`), h('br'), h('small', {}, l.acts.map(a => actName(l, a)).join(' · '))),
          CHECK_COLS.map(([col, types]) => h('td', {}, checkBtn(l, col, types)))))))),
      h('p', {class:'note'}, U.checkNote),
      h('div', {class:'row', style:{marginTop:'14px', justifyContent:'flex-start'}},
        h('button', {class:'btn red', onclick:() => { Sfx.tap(); confirmReset(); }}, U.resetBtn))),
    h('section', {class:'panel-card'}, U.credits.map(p => h('p', {class:'note'}, p)))
  );
  say(T.hiGrownUps + ' 👋', T.hiGrownUps);
}

// Clear all progress, after a sum only a grown-up can answer (children play this game, so it is not an easy one).
function confirmReset(){
  const a = 12 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4);
  const input = h('input', {type:'text', inputmode:'numeric', pattern:'[0-9]*', autocomplete:'off', 'aria-label':`${a} × ${b} = ?`});
  const err = h('div', {class:'err', role:'alert'});
  const doReset = () => {
    if (input.value.trim() !== String(a * b)){
      Sfx.bad(); err.textContent = input.value.trim() ? U.wrongAnswer : U.fillAnswer;
      wiggle(input); input.select(); return;
    }
    state.done = {}; state.check = {}; state.resume = {}; state.gen = Date.now(); saveState();   // a new generation: older copies are ignored
    route();   // redraw the parents page with everything cleared
    overlay([
      h('div', {class:'big-star'}, '🧹'),
      h('h1', {}, U.cleared),
      h('p', {}, U.clearedNote),
      h('div', {class:'row'}, h('button', {class:'btn green', onclick:closeOverlay}, U.ok)),
    ]);
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doReset(); if (e.key === 'Escape') closeOverlay(); });
  overlay([
    h('div', {class:'big-star'}, '🗑️'),
    h('h1', {}, U.resetTitle),
    h('p', {}, U.resetNote),
    h('div', {class:'gate'}, h('label', {}, U.gateQ(a, b)), input, err),
    h('div', {class:'row'},
      h('button', {class:'btn red', onclick:doReset}, U.resetConfirm),
      h('button', {class:'btn white', onclick:() => { Sfx.tap(); closeOverlay(); }}, U.cancel)),
  ]);
  setTimeout(() => { try { input.focus(); } catch (e) {} }, 50);
}

/* ---------- version ---------- */
const versionText = () => U.version(APP_VERSION.n, APP_VERSION.date);
// Shown on the home and parents screens when the server has a newer version than this page.
const updateSlot = h('div', {class:'update-slot', role:'status'});
let lastCheck = 0, newer = 0;
function showNewer(){ if (newer) updateSlot.replaceChildren(h('button', {class:'btn orange', onclick:() => forceRefresh()}, U.newVersion(newer))); }
function checkUpdate(){
  if (!window.fetch || Date.now() - lastCheck < 10 * 60 * 1000) return;   // at most every 10 minutes
  lastCheck = Date.now();
  fetch('index.html?check=' + Date.now(), {cache:'no-store'}).then(r => r.ok ? r.text() : '').then(t => {
    const m = /var APP_VERSION = \{n:(\d+), date:'([^']*)'\}/.exec(t);
    if (m && +m[1] > APP_VERSION.n){ newer = +m[1]; showNewer(); }
  }).catch(() => {});
}
async function forceRefresh(){
  Speech.stop();
  overlay([h('div', {class:'big-star'}, '🔄'), h('h1', {}, U.updating), h('p', {}, U.updatingNote)]);
  const base = location.pathname.replace(/[^/]*$/, '');
  const urls = [location.pathname, base + 'index.html', base + `audio/${LANG}/manifest.js`, base + 'css/style.css'];
  try {
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    await Promise.race([Promise.all(urls.map(u => fetch(u, {cache:'reload'}).catch(() => {}))), wait(6000)]);
  } catch (e) {}
  location.replace(location.pathname + '?v=' + Date.now() + location.hash);
}

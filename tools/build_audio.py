"""Record 乐乐's / Leo's voice: one MP3 per phrase in tools/phrases.json, plus audio/<lang>/manifest.js.

Chinese: Kokoro-82M v1.1-zh (Apache-2.0), voice zf_078, run locally with onnxruntime. Every phrase is read with pinyin
worked out here (pypinyin, plus the readings in WORDS for characters with two readings: 数一数 shǔ, 几只 zhī, 长 cháng),
so the model never guesses. A phrase that is one pinyin syllable (sān) is a number said on its own: the model says
it, then Praat (parselmouth) puts the exact textbook tone shape on it, so 一 二 三 四 always sound clearly different.
English: Kokoro-82M v1.0, American English voice af_heart, with kokoro-onnx.

Usage:
  pip install onnxruntime numpy scipy "misaki[zh]" lameenc praat-parselmouth kokoro-onnx av
  NODE_PATH=$(npm root -g) node tools/export_phrases.js           # writes tools/phrases.json
  python3 tools/build_audio.py zh path/to/kokoro-zh [--all] [--redo "phrase" ...] [--show]
  python3 tools/build_audio.py en kokoro-v1.0.onnx voices-v1.0.bin [--all] [--redo "phrase" ...]
The Chinese model folder holds onnx/model.onnx, tokenizer.json and voices/zf_078.bin from
https://huggingface.co/onnx-community/Kokoro-82M-v1.1-zh-ONNX ; the English files come from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 .
Existing clips are reused, so running it again only records new phrases (and those passed with --redo, or everything
with --all). --show prints the pinyin each Chinese phrase is read with, without recording.
A clip is named after its content, so browsers never play a stale cached copy.
"""
import hashlib, json, os, re, sys
import numpy as np
import lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = 24000
HOP = 600             # samples per duration step of the model
HAN = re.compile(r'[㐀-鿿]')

# ================================================================ Chinese
ZH_VOICE = 'zf_078'   # the voice of 中文乐园 (of the 58 Chinese voices, the one speech recognition understood best)
ZH_SPEED = 0.88       # a little slower than normal speech, for young children

# Readings of words whose characters have more than one reading, or where 一 / 不 change their tone.
WORDS = {
    '数一数': 'shǔ yi shǔ', '再数': 'zài shǔ', '边数': 'biān shǔ', '地数': 'de shǔ', '数出': 'shǔ chū', '来数': 'lái shǔ',
    '大数': 'dà shù', '小数': 'xiǎo shù', '的数': 'de shù', '个数': 'gè shù', '数大': 'shù dà', '数小': 'shù xiǎo', '数最': 'shù zuì', '得数': 'dé shù',
    '两个数': 'liǎng gè shù', '个地': 'gè de', '根地': 'gēn de', '一步一步地': 'yí bù yí bù de',
    '只有': 'zhǐ yǒu', '只点': 'zhǐ diǎn', '只': 'zhī', '长': 'cháng', '家长': 'jiā zhǎng', '数图形': 'shǔ tú xíng',
    '长短': 'cháng duǎn', '更长': 'gèng cháng', '最长': 'zuì cháng', '笔长': 'bǐ cháng', '细长': 'xì cháng', '长长方方': 'cháng cháng fāng fāng', '长方体': 'cháng fāng tǐ',
    '哪个': 'nǎ ge', '哪一组': 'nǎ yì zǔ', '哪支': 'nǎ zhī', '哪栋': 'nǎ dòng', '哪幅': 'nǎ fú', '哪边': 'nǎ biān',
    '朝着': 'cháo zhe', '还剩': 'hái shèng', '还是': 'hái shì', '还不够': 'hái bú gòu', '一样': 'yí yàng', '同样': 'tóng yàng',
    '骰子': 'tóu zi', '乐乐': 'lè lè', '乐园': 'lè yuán', '罐头': 'guàn tou', '小朋友': 'xiǎo péng you', '朋友': 'péng you',
    '空格': 'kòng gé', '方框': 'fāng kuàng', '盒子': 'hé zi', '为什么': 'wèi shén me', '分成': 'fēn chéng', '合成': 'hé chéng',
    '拧一道': 'nǐng yí dào', '秤钩': 'chèng gōu', '咧嘴': 'liě zuǐ', '勺子': 'sháo zi', '水上漂': 'shuǐ shàng piāo',
    '一个一个': 'yí gè yí gè', '一根一根': 'yì gēn yì gēn', '一捆一捆': 'yì kǔn yì kǔn',
}
ZH_MARKS = {'a': 'āáǎà', 'o': 'ōóǒò', 'e': 'ēéěè', 'i': 'īíǐì', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}
TONED = {m: (v, k + 1) for v, ms in ZH_MARKS.items() for k, m in enumerate(ms)}
SYLLABLE = re.compile('^[a-zü' + ''.join(TONED) + ']+$')


def is_syllable(p):
    return bool(SYLLABLE.match(p))


def tone_of(s):
    for c in s:
        if c in TONED:
            return TONED[c][1]
    return 5


def plain(s):
    return ''.join(TONED[c][0] if c in TONED else c for c in s)


def with_tone(base, t):
    """Put tone t on a plain syllable, where pinyin writes it: on a or e, on the o of ou, else on the last vowel."""
    if not 1 <= t <= 4:
        return base
    i = base.find('a')
    if i < 0:
        i = base.find('e')
    if i < 0 and 'ou' in base:
        i = base.find('o')
    if i < 0:
        i = max(k for k, c in enumerate(base) if c in ZH_MARKS)
    return base[:i] + ZH_MARKS[base[i]][t - 1] + base[i + 1:]


def zh_pinyin(text):
    """One syllable per Han character, as it should be read."""
    from pypinyin import pinyin, Style
    chars = [c for c in text if HAN.match(c)]
    syl = [p[0] for p in pinyin(''.join(chars), style=Style.TONE, heteronym=False)]
    han = ''.join(chars)
    fixed = [False] * len(syl)
    # longer words first, so 只只有 wins over 只有
    for w in sorted(WORDS, key=len, reverse=True):
        for m in re.finditer(re.escape(w), han):
            if any(fixed[m.start():m.end()]):
                continue
            syl[m.start():m.end()] = WORDS[w].split()
            fixed[m.start():m.end()] = [True] * len(w)
    # 看一看, 数一数: 一 between a verb and itself is said lightly (but not in sums: 一加一加一)
    for i in range(1, len(han) - 1):
        if han[i] == '一' and han[i - 1] == han[i + 1] and han[i - 1] in '数看听想说写画比排找摆分合拨捆算点试读走跑' and not fixed[i]:
            syl[i] = 'yi'; fixed[i] = True
    # 一 and 不 change their tone before another syllable; the number one (counting, 第一, 十一, 一加二) does not
    pos = [i for i, c in enumerate(text) if HAN.match(c)]   # where each Han character is in the text
    for i, c in enumerate(han):
        if fixed[i] or c not in '一不':
            continue
        at = pos[i]
        nxt_char = text[at + 1] if at + 1 < len(text) else ''   # punctuation counts here: 一、二、三
        nxt = han[i + 1] if i + 1 < len(han) and HAN.match(nxt_char) else ''
        prv = han[i - 1] if i else ''
        if c == '一':
            if not nxt or nxt in '十加减和等像是后前大小合凑' or (prv and prv in '第十于个'):
                syl[i] = 'yī'
            else:
                syl[i] = 'yí' if tone_of(syl[i + 1]) == 4 else 'yì'
        else:
            syl[i] = 'bú' if nxt and tone_of(syl[i + 1]) == 4 else 'bù'
    return ' '.join(syl)


_g2p = None
_queue = []
_forcing = False


def g2p():
    """misaki's Chinese G2P; while _queue holds syllables, characters are read with them instead of its own guess."""
    global _g2p
    if _g2p is None:
        from misaki import zh
        _g2p = zh.ZHG2P(version='1.1')
        front = _g2p.frontend
        orig = front._get_initials_finals

        def forced(word):
            if not _queue:
                return orig(word)
            initials, finals = [], []
            for c in word:
                if HAN.match(c):
                    ini, fin = split_syllable(_queue.pop(0))
                    initials.append(ini)
                    finals.append(fin)
                else:
                    a, b = orig(c)
                    initials += a
                    finals += b
            return initials, finals
        front._get_initials_finals = forced
        # With the pinyin given, 一 and 不 are already written as said: keep only the third-tone sandhi (你好 → ní hǎo)
        tm = front.tone_modifier
        full = tm.modified_tone

        def modified(word, pos, finals):
            if not _forcing:
                return full(word, pos, finals)
            return tm._three_sandhi(word, finals)
        tm.modified_tone = modified
    return _g2p


def split_syllable(s):
    """'shì' -> ('sh', 'iii4'), 'yǔ' -> ('', 'v3'), 'men' -> ('m', 'en5'): the form misaki's frontend uses."""
    from pypinyin.contrib.tone_convert import to_initials, to_finals_tone3
    ini = to_initials(s, strict=True)
    fin = to_finals_tone3(s, strict=True, neutral_tone_with_five=True)
    if not fin[-1].isdigit():
        fin += '5'
    base, tone = fin[:-1], fin[-1]
    if base == 'i' and ini in ('z', 'c', 's'):
        base = 'ii'
    elif base == 'i' and ini in ('zh', 'ch', 'sh', 'r'):
        base = 'iii'
    return ini, base + tone


def syllable_phonemes(s, tone=None):
    from misaki.zh_frontend import ZH_MAP
    ini, fin = split_syllable(s)
    return (ZH_MAP[ini] if ini else '') + ZH_MAP[fin[:-1]] + str(tone or fin[-1])


def text_phonemes(text, pinyin):
    global _queue, _forcing
    g = g2p()
    syl = pinyin.split()
    if len(syl) != len(HAN.findall(text)):
        raise SystemExit(f'pinyin does not match the characters: {text!r} / {pinyin!r}')
    _queue = list(syl)
    _forcing = True
    try:
        ph = g(text)[0]
    finally:
        left, _queue, _forcing = _queue, [], False
    if left:
        raise SystemExit(f'not every syllable was used for {text!r}: {left}')
    if '❓' in ph:
        raise SystemExit(f'unknown sound in {text!r}: {ph}')
    return ph


class KokoroZh:
    def __init__(self, folder, voice=ZH_VOICE):
        import onnxruntime as ort
        so = ort.SessionOptions()
        so.intra_op_num_threads = max(1, (os.cpu_count() or 2))
        path = os.path.join(folder, 'onnx', 'model.onnx')
        self.sess = ort.InferenceSession(path if os.path.exists(path) else os.path.join(folder, 'model.onnx'), so, providers=['CPUExecutionProvider'])
        self.vocab = json.load(open(os.path.join(folder, 'tokenizer.json'), encoding='utf-8'))['model']['vocab']
        self.voice = np.fromfile(os.path.join(folder, 'voices', voice + '.bin'), dtype=np.float32).reshape(-1, 1, 256)
        self.names = [i.name for i in self.sess.get_inputs()]

    def run(self, ph, speed=ZH_SPEED):
        missing = [c for c in ph if c not in self.vocab]
        if missing:
            raise SystemExit(f'phonemes not in the model: {missing} in {ph!r}')
        ids = [self.vocab[c] for c in ph]
        if len(ids) > 500:
            raise SystemExit(f'phrase too long: {ph!r}')
        toks = np.array([[0, *ids, 0]], dtype=np.int64)
        audio, dur = self.sess.run(None, {self.names[0]: toks, self.names[1]: self.voice[len(ids)].astype(np.float32),
                                          self.names[2]: np.array([speed], dtype=np.float32)})
        return highpass(audio.reshape(-1)), dur.reshape(-1)


# Chao tone letters as (time fraction, level 1..5)
CONTOUR = {
    1: [(0, 4.9), (0.5, 4.9), (1, 4.7)],
    2: [(0, 3.0), (0.3, 2.8), (1, 5.0)],
    3: [(0, 2.3), (0.45, 1.0), (0.62, 1.0), (1, 3.8)],
    4: [(0, 5.0), (0.15, 5.1), (1, 1.4)],
    5: [(0, 3.0), (1, 2.2)],
}
DURATION = {1: 1.15, 2: 1.2, 3: 1.4, 4: 1.0, 5: 0.8}
LOW, HIGH = 160.0, 300.0   # pitch of tone levels 1 and 5 (set from the voice in main())


def highpass(x, hz=60):
    from scipy.signal import butter, sosfiltfilt
    return sosfiltfilt(butter(2, hz, 'highpass', fs=RATE, output='sos'), np.asarray(x, np.float64)).astype(np.float32)


def trim(x, thr=0.01, pad=0.03):
    idx = np.where(np.abs(x) > thr * (np.abs(x).max() or 1))[0]
    if not len(idx):
        return x
    return x[max(0, idx[0] - int(pad * RATE)): min(len(x), idx[-1] + int(pad * RATE))]


def impose_tone(x, tone):
    import parselmouth
    from parselmouth.praat import call
    x = trim(x)
    snd = parselmouth.Sound(x.astype(np.float64), RATE)
    p = snd.to_pitch(time_step=0.005, pitch_floor=90, pitch_ceiling=600)
    f = p.selected_array['frequency']
    voiced = np.where(f > 0)[0]
    manip = call(snd, 'To Manipulation', 0.005, 90, 600)
    if len(voiced) >= 3:
        t0, t1 = p.xs()[voiced[0]], p.xs()[voiced[-1]]
        pt = call(manip, 'Extract pitch tier')
        call(pt, 'Remove points between', 0, snd.duration)
        for frac, lev in CONTOUR[tone]:
            call(pt, 'Add point', t0 + frac * (t1 - t0), LOW * (HIGH / LOW) ** ((lev - 1) / 4))
        call([pt, manip], 'Replace pitch tier')
        ds = DURATION[tone]
        if abs(ds - 1) > 1e-3:
            dt = call(manip, 'Extract duration tier')
            call(dt, 'Add point', max(0, t0 - 0.001), 1.0)
            call(dt, 'Add point', t0 + 0.02, ds)
            call(dt, 'Add point', t1, ds)
            call(dt, 'Add point', min(snd.duration, t1 + 0.001), 1.0)
            call([manip, dt], 'Replace duration tier')
    return highpass(call(manip, 'Get resynthesis (overlap-add)').values[0])


def syllable(kokoro, s):
    """One syllable on its own (a number), with the exact tone shape put on it."""
    tone = tone_of(s)
    ph = syllable_phonemes(s, 1 if tone == 5 else tone)
    x, dur = kokoro.run(ph, 1.0)
    return impose_tone(speech_only(x, ph, dur), tone)


def frame_db(x):
    e = np.array([np.sqrt(np.mean(x[i:i + HOP] ** 2)) for i in range(0, len(x), HOP)])
    return 20 * np.log10(e / (e.max() or 1) + 1e-9)


# How long each initial sounds before the vowel's voicing starts, in model steps (25 ms).
LEADIN = {'b': 1, 'd': 1, 'g': 1, 'm': 1, 'n': 1, 'l': 1, 'r': 2, 'p': 3, 't': 3, 'k': 3, 'j': 3, 'z': 3, 'zh': 3,
          'q': 5, 'c': 5, 'ch': 5, 'f': 5, 'h': 4, 'x': 5, 's': 5, 'sh': 5, '': 1}
VOICED_INITIAL = set('mnlr') | {''}
SEPARATORS = set(' /')
PAUSES = set(';:,.!?—…')


def voiced_frames(x):
    import parselmouth
    p = parselmouth.Sound(x.astype(np.float64), RATE).to_pitch(time_step=HOP / RATE, pitch_floor=90, pitch_ceiling=600)
    f, t = p.selected_array['frequency'], p.xs()
    n = int(np.ceil(len(x) / HOP))
    out = np.zeros(n, bool)
    for fi, ti in zip(f, t):
        if fi > 0:
            out[min(n - 1, int(ti * RATE / HOP))] = True
    return out


def first_initial(ph):
    from misaki.zh_frontend import ZH_MAP
    back = {v: k for k, v in ZH_MAP.items() if k in LEADIN}
    for c in ph:
        if c not in SEPARATORS and c not in PAUSES:
            return back.get(c, '')
    return ''


def syllable_spans(ph):
    """[(first token, tone token, tone, ends a phrase)] for every syllable in the phonemes."""
    out, start = [], None
    for i, c in enumerate(ph):
        if c in SEPARATORS or c in PAUSES or c in '"()“”':
            continue
        if start is None:
            start = i
        if c in '12345':
            rest = ph[i + 1:].lstrip(' /R')
            out.append((start, i, int(c), not rest or rest[0] in PAUSES))
            start = None
    return out


def speech_only(x, ph, dur):
    """Cut off the stray murmur the model makes while it waits to start and after the last sound."""
    e, v = frame_db(x), voiced_frames(x)
    cum = np.concatenate([[0], np.cumsum(dur)]).astype(int)
    lead = cum[1]
    ini = first_initial(ph)
    v0 = None
    for i in range(max(0, lead - 12), min(len(e), lead + 8)):
        if v[i] and e[i] > -20:
            v0 = i
            break
    if v0 is None:
        start = max(0, lead - 2)
    else:
        if ini in VOICED_INITIAL:
            while v0 > max(0, lead - 14) and v[v0 - 1] and e[v0 - 1] > -24:
                v0 -= 1
        start = max(0, v0 - LEADIN.get(ini, 1))
    spans = syllable_spans(ph)
    if spans:
        a, b = spans[-1][0], spans[-1][1]
        s0, s1 = cum[a + 1], min(len(e), cum[b + 2])
        peak = e[s0:s1].max() if s1 > s0 else 0
        end = s1
        while end > s0 and e[end - 1] < peak - 15:
            end -= 1
        end = min(len(e), end + 3)
    else:
        end = len(e)
    y = x[start * HOP:end * HOP].copy()
    fi, fo = min(len(y) // 4, int(0.008 * RATE)), min(len(y) // 4, int(0.06 * RATE))
    if fi:
        y[:fi] *= np.linspace(0, 1, fi)
    if fo:
        y[-fo:] *= np.linspace(1, 0, fo)
    return y


def fix_final_tones(x, ph, dur):
    """Give first tones that fall, second tones that end a phrase flat, and third tones said high inside a phrase
    their level, rising or low shape back (Praat PSOLA)."""
    import parselmouth
    from parselmouth.praat import call
    cum = np.concatenate([[0], np.cumsum(dur)]) * HOP
    todo = []
    snd = parselmouth.Sound(x.astype(np.float64), RATE)
    pitch = snd.to_pitch(time_step=0.005, pitch_floor=90, pitch_ceiling=600)
    f, t = pitch.selected_array['frequency'], pitch.xs()
    allv = f[f > 0]
    lo, hi = (np.percentile(allv, 10), np.percentile(allv, 90)) if len(allv) > 10 else (0, 0)
    at = lambda share: lo * (hi / lo) ** share
    for a, b, tone, final in syllable_spans(ph):
        if tone not in (1, 2, 3) or (tone == 2 and not final) or (tone == 3 and (final or not lo)):
            continue
        s0, s1 = cum[a + 1] / RATE, cum[b + 2] / RATE
        sel = (t >= s0) & (t < s1) & (f > 0)
        v, tv = f[sel], t[sel]
        if len(v) < 6:
            continue
        n = len(v)
        onset = float(np.median(v[:max(2, n // 4)]))
        end = float(np.median(v[-max(2, n // 4):]))
        change = 12 * np.log2(end / onset)
        if tone == 1 and change < (-1.2 if final else -1.5):
            points = [(tv[0], onset), (tv[-1], onset * 2 ** (-0.5 / 12))]
        elif tone == 2 and change < 2.5:
            low = min(onset, float(np.min(v[:max(2, n // 2)])))
            points = [(tv[0], low), (tv[0] + 0.3 * (tv[-1] - tv[0]), low * 2 ** (-0.3 / 12)), (tv[-1], low * 2 ** (5 / 12))]
        elif tone == 3 and np.median(v) > at(0.4):
            points = [(tv[0], at(0.3)), (tv[-1], at(0.02))]
        else:
            continue
        todo.append((tv[0], tv[-1], points))
    if not todo:
        return x
    manip = call(snd, 'To Manipulation', 0.005, 90, 600)
    pt = call(manip, 'Extract pitch tier')
    for t0, t1, points in todo:
        call(pt, 'Remove points between', t0 - 0.004, t1 + 0.004)
        for tt, hz in points:
            call(pt, 'Add point', float(tt), float(hz))
    call([pt, manip], 'Replace pitch tier')
    return highpass(call(manip, 'Get resynthesis (overlap-add)').values[0])


def zh_audio(kokoro, phrase):
    if is_syllable(phrase):
        return syllable(kokoro, phrase)
    ph = text_phonemes(phrase, zh_pinyin(phrase))
    n = len(HAN.findall(phrase))
    x, dur = kokoro.run(ph, 0.82 if n <= 2 else ZH_SPEED)
    return speech_only(fix_final_tones(x, ph, dur), ph, dur)


def voice_range(kokoro):
    """Tone levels 1 and 5 from the voice's own pitch in an ordinary sentence."""
    import parselmouth
    text = '小朋友，你好！我们一起来学数学吧。'
    a, _ = kokoro.run(text_phonemes(text, zh_pinyin(text)), ZH_SPEED)
    f = parselmouth.Sound(a.astype(np.float64), RATE).to_pitch(pitch_floor=90, pitch_ceiling=600).selected_array['frequency']
    med = float(np.median(f[f > 0]))
    return med * 0.74, med * 1.38


# ================================================================ English
EN_VOICE = 'af_heart'
# Short lines are cut out of this sentence, so they start cleanly instead of with a stray sound.
CARRIER = 'The next word is:'


def cut_after_pause(x, rate):
    """Keep the audio after the longest pause (the carrier's colon), or None if there is no clear pause."""
    f = int(rate * 0.01)
    rms = np.array([np.sqrt(np.mean(x[i:i + f] ** 2)) for i in range(0, len(x) - f, f)])
    quiet = list(rms < 0.03 * rms.max()) + [False]
    runs, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None:
            s = i
        if not q and s is not None:
            runs.append((s, i))
            s = None
    runs = [r for r in runs if r[1] < len(rms) - 15]
    if not runs:
        return None
    s, e = max(runs, key=lambda r: r[1] - r[0])
    return x[max(0, e * f - int(0.03 * rate)):] if e - s >= 8 else None


def en_audio(kokoro, phrase):
    text = phrase if re.search(r'[.!?:]$', phrase) else phrase + '.'   # a lone word sounds complete when it ends like a sentence
    ph = kokoro.tokenizer.phonemize(text, 'en-us')
    words = len(phrase.split())
    speed = 0.85 if words <= 2 else 0.92
    direct, rate = kokoro.create(ph, voice=EN_VOICE, speed=speed, lang='en-us', is_phonemes=True)
    direct = np.asarray(direct, np.float32)
    if words <= 3 and not re.search(r'[,;:.!?]', phrase[:-1]):
        carrier = kokoro.tokenizer.phonemize(CARRIER, 'en-us')
        full, rate = kokoro.create(carrier + ' ' + ph, voice=EN_VOICE, speed=speed, lang='en-us', is_phonemes=True)
        cut = cut_after_pause(np.asarray(full, np.float32), rate)
        if cut is not None and 0.6 * len(direct) <= len(cut) <= 1.8 * len(direct):
            return cut
    return direct


# ================================================================ loudness, MP3, manifest
LOUDNESS_DB = -8      # loudness of the spoken parts before limiting (RMS, dBFS); phones play quietly, so this is loud
CEILING = 0.94
MAX_BOOST_DB = 12


def _window_min(g, n):
    pad = np.concatenate([np.full(n, g[0]), g, np.full(n, g[-1])])
    return np.lib.stride_tricks.sliding_window_view(pad, 2 * n + 1).min(axis=1)


def _smooth(g, n):
    k = n // 2
    pad = np.concatenate([np.full(k, g[0]), g, np.full(k, g[-1])])
    c = np.concatenate([[0.0], np.cumsum(pad, dtype=np.float64)])
    return ((c[2 * k + 1:] - c[:-2 * k - 1]) / (2 * k + 1)).astype(np.float32)


def level(x):
    """Bring the spoken parts to LOUDNESS_DB, then limit peaks to CEILING (no clipping)."""
    x = np.asarray(x, np.float32)
    f = max(1, int(RATE * 0.05))
    rms = np.array([np.sqrt(np.mean(x[i:i + f] ** 2)) for i in range(0, max(1, len(x) - f), f)])
    if not len(rms) or rms.max() == 0:
        return x
    active = rms[rms > 0.1 * rms.max()]
    gain = min(10 ** ((LOUDNESS_DB - 20 * np.log10(np.sqrt(np.mean(active ** 2)))) / 20), 10 ** (MAX_BOOST_DB / 20))
    y = x * gain
    need = np.minimum(1.0, CEILING / np.maximum(np.abs(y), 1e-9)).astype(np.float32)
    n = max(1, int(RATE * 0.006))
    need = np.minimum(need, _smooth(_window_min(need, n), n))
    return np.clip(y * need, -CEILING, CEILING)


def to_mp3(pcm):
    x = np.asarray(pcm, dtype=np.float32)
    peak = np.abs(x).max() or 1.0
    loud = np.where(np.abs(x) > 0.01 * peak)[0]
    if len(loud):
        pad = int(0.07 * RATE)
        x = x[max(0, loud[0] - pad): loud[-1] + pad]
    x = level(x)
    for _ in range(4):
        mp3 = _lame(x)
        peak = _decoded_peak(mp3)
        if peak is None or peak <= 0.995:
            break
        x = x * (0.985 / peak)
    return mp3


def _lame(x):
    x = np.clip(np.asarray(x, np.float32) * 32767, -32767, 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(x.tobytes()) + enc.flush()


def _decoded_peak(mp3):
    try:
        import av, io
        with av.open(io.BytesIO(mp3), format='mp3') as c:
            x = np.concatenate([fr.to_ndarray().astype(np.float32).reshape(-1) for fr in c.decode(audio=0)])
        return float(np.abs(x).max() / (32768 if np.abs(x).max() > 2 else 1))
    except ImportError:
        return None


def clip_name(mp3):
    return hashlib.sha1(mp3).hexdigest()[:12] + '.mp3'


def audio_dir(lang):
    return os.path.join(ROOT, 'audio', lang)


def old_manifest(lang):
    path = os.path.join(audio_dir(lang), 'manifest.js')
    if not os.path.exists(path):
        return {}
    body = open(path, encoding='utf-8').read().split('= {', 1)
    return json.loads('{' + body[1].strip().rstrip(';')) if len(body) == 2 else {}


def write_manifest(lang, manifest):
    folder = audio_dir(lang)
    keep = set(manifest.values())
    for f in os.listdir(folder):   # remove clips no longer used
        if re.fullmatch(r'[0-9a-f]{12}\.mp3', f) and f not in keep:
            os.remove(os.path.join(folder, f))
    with open(os.path.join(folder, 'manifest.js'), 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_audio.py: phrase -> recorded clip\n')
        f.write(f'(window.MG_CLIPS = window.MG_CLIPS || {{}}).{lang} = ' + json.dumps(manifest, ensure_ascii=False, indent=0) + ';\n')
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import stamp
    stamp.main()


def main(lang, model_args, redo=(), everything=False, show=False):
    global LOW, HIGH
    phrases = json.load(open(os.path.join(ROOT, 'tools', 'phrases.json'), encoding='utf-8'))[lang]
    if show:
        for p in phrases:
            if not is_syllable(p):
                print(p, '|', zh_pinyin(p))
        return
    if lang == 'zh':
        kokoro = KokoroZh(model_args[0])
        LOW, HIGH = voice_range(kokoro)
        print(f'voice {ZH_VOICE}: tones between {LOW:.0f} and {HIGH:.0f} Hz', flush=True)
        make = lambda p: zh_audio(kokoro, p)
    else:
        from kokoro_onnx import Kokoro
        kokoro = Kokoro(model_args[0], model_args[1])
        make = lambda p: en_audio(kokoro, p)
    os.makedirs(audio_dir(lang), exist_ok=True)
    old = {} if everything else old_manifest(lang)
    manifest, made = {}, 0
    for k, p in enumerate(phrases):
        if p in old and p not in redo and os.path.exists(os.path.join(audio_dir(lang), old[p])):
            manifest[p] = old[p]
            continue
        mp3 = to_mp3(make(p))
        manifest[p] = clip_name(mp3)
        with open(os.path.join(audio_dir(lang), manifest[p]), 'wb') as f:
            f.write(mp3)
        made += 1
        if made % 100 == 0:
            print(f'  {k + 1}/{len(phrases)}', flush=True)
            write_manifest(lang, {**{q: old[q] for q in phrases[k + 1:] if q in old}, **manifest})   # keep what is done so far
    write_manifest(lang, manifest)
    print(f'{lang}: {len(phrases)} phrases, {made} new clips')


if __name__ == '__main__':
    args = sys.argv[1:]
    redo = set(args[args.index('--redo') + 1:]) if '--redo' in args else set()
    args = args[:args.index('--redo')] if '--redo' in args else args
    everything, show = '--all' in args, '--show' in args
    args = [a for a in args if a not in ('--all', '--show')]
    if not args or args[0] not in ('zh', 'en') or (not show and len(args) < (2 if args[0] == 'zh' else 3)):
        sys.exit(__doc__)
    main(args[0], args[1:], redo, everything, show)

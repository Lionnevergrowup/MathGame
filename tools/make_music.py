"""Render the background music loop: audio/music.mp3.

An original, bouncy tune in G major (104 BPM, 16 bars, about 37 s): a xylophone melody that climbs like counting
(one, two, three, four), plucked off-beat chords, a plucked bass, a soft wood block and a shaker, with a little
glockenspiel at the start of every four bars. Everything is synthesized here, so the music has no licence
restrictions. The last bar ends on a rest, so the loop joins without a bump.

Usage: pip install numpy lameenc; python3 tools/make_music.py
"""
import os
import numpy as np
import lameenc

RATE = 32000
BPM = 104
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 16
rng = np.random.default_rng(11)

CHORDS = {'G': [62, 67, 71], 'C': [64, 67, 72], 'D': [62, 66, 69], 'Em': [64, 67, 71], 'Am': [64, 69, 72]}
ROOT = {'G': 43, 'C': 48, 'D': 50, 'Em': 52, 'Am': 45}
FIFTH = {'G': 50, 'C': 43, 'D': 45, 'Em': 47, 'Am': 52}
PROGRESSION = ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G',
               'C', 'G', 'Am', 'D', 'G', 'C', ('D', 'D'), 'G']

# melody: (beat, length in beats, midi note) for every bar
G4, B4, C5, D5, E5, FS5, G5, A5, B5, C6, D6 = 67, 71, 72, 74, 76, 78, 79, 81, 83, 84, 86
MELODY_BARS = [
    [(0, 1, D5), (1, 1, E5), (2, 1, FS5), (3, 1, G5)],                 # one, two, three, four
    [(0, 1.5, E5), (1.5, .5, C5), (2, 1, E5), (3, 1, G5)],
    [(0, 1, FS5), (1, .5, E5), (1.5, .5, FS5), (2, 1, A5), (3, 1, D5)],
    [(0, 2, G5), (2, 1, D5), (3, 1, G5)],
    [(0, 1, B5), (1, 1, G5), (2, 1, E5), (3, 1, G5)],
    [(0, 1, C6), (1, 1, G5), (2, 1, E5), (3, 1, C5)],
    [(0, 1, D5), (1, .5, FS5), (1.5, .5, A5), (2, 1, D6), (3, 1, A5)],
    [(0, 1.5, G5), (1.5, .5, FS5), (2, 2, G5)],
    [(0, .5, E5), (.5, .5, FS5), (1, 1, G5), (2, .5, E5), (2.5, .5, FS5), (3, 1, G5)],
    [(0, 1, D5), (1, 1, G5), (2, 1, B5), (3, 1, G5)],
    [(0, 1, C6), (1, 1, A5), (2, 1, E5), (3, 1, A5)],
    [(0, 1, FS5), (1, 1, A5), (2, 1.5, D6), (3.5, .5, C6)],
    [(0, 1, B5), (1, 1, G5), (2, 1, D5), (3, 1, G5)],
    [(0, 1, E5), (1, 1, G5), (2, 1, C6), (3, 1, E5)],
    [(0, 1, FS5), (1, 1, G5), (2, 1, A5), (3, 1, FS5)],
    [(0, 1, B5), (1, 1, A5), (2, 1, G5)],                              # beat 4 rests, so the loop can restart
]

hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def xylophone(f, dur):
    t = np.arange(int((dur + 0.7) * RATE)) / RATE
    attack = 1 - np.exp(-t * 600)
    tone = (np.sin(2 * np.pi * f * t) * np.exp(-t * 6.5)
            + 0.35 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t * 16)
            + 0.12 * np.sin(2 * np.pi * 6.2 * f * t) * np.exp(-t * 40))
    return tone * attack


def glock(f, dur=1.2):
    t = np.arange(int(dur * RATE)) / RATE
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 6)) * np.exp(-t * 3.2) * (1 - np.exp(-t * 900))


def pluck(f, dur, bright=0.5, decay=0.996):
    """Karplus-Strong string (chords and bass)."""
    n = int((dur + 0.6) * RATE)
    period = max(2, int(RATE / f))
    buf = rng.uniform(-1, 1, period)
    buf = np.convolve(buf, [bright, 1 - bright], mode='same')
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = decay * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out * (1 - np.exp(-np.arange(n) / RATE * 300))


def woodblock(f=900, dur=0.09):
    t = np.arange(int(dur * RATE)) / RATE
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 60) * (1 - np.exp(-t * 2000))


def shaker(dur=0.07):
    t = np.arange(int(dur * RATE)) / RATE
    noise = np.diff(np.concatenate([[0], rng.uniform(-1, 1, len(t))]))
    return noise * np.exp(-t * 55) * (1 - np.exp(-t * 900))


def add(track, at, sound, gain):
    i = int(at * RATE)
    j = min(len(track), i + len(sound))
    track[i:j] += gain * sound[:j - i]


def render():
    total = int((BARS * BAR + 2.0) * RATE)
    mel, chords, bass, perc = (np.zeros(total) for _ in range(4))
    for b, prog in enumerate(PROGRESSION):
        start = b * BAR
        last = b == BARS - 1
        halves = prog if isinstance(prog, tuple) else (prog, prog)
        for half, name in enumerate(halves):
            beat0 = half * 2
            if not (last and half == 1):
                for k, m in enumerate(CHORDS[name]):   # off-beat strums on beats 2 and 4
                    add(chords, start + (beat0 + 1) * BEAT + k * 0.015, pluck(hz(m), BEAT, bright=0.4, decay=0.993), 0.5)
                add(bass, start + beat0 * BEAT, pluck(hz(ROOT[name] if half == 0 or isinstance(prog, tuple) else FIFTH[name]), BEAT * 1.5, bright=0.2, decay=0.998), 0.9)
        for beat in range(4):
            if last and beat >= 3:
                continue
            add(perc, start + beat * BEAT, woodblock(1000 if beat % 2 == 0 else 800), 0.10)
            add(perc, start + (beat + 0.5) * BEAT, shaker(), 0.07)
        if b % 4 == 0:
            add(mel, start, glock(hz(91)), 0.12)
        for beat, length, note in MELODY_BARS[b]:
            add(mel, start + beat * BEAT, xylophone(hz(note), length * BEAT), 0.5 * (0.92 + 0.16 * rng.random()))
    dry = mel + 0.4 * chords + 0.55 * bass + perc
    t = np.arange(int(1.2 * RATE)) / RATE
    ir = rng.uniform(-1, 1, len(t)) * np.exp(-t * 4.5)
    ir = np.convolve(ir, np.ones(6) / 6, mode='same')
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(dry) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(dry, n) * np.fft.rfft(ir, n), n)[:len(dry)]
    mix = dry + 0.15 * wet
    # fold the tail back onto the start so the loop is seamless, then cut to exactly 16 bars
    loop_len = int(BARS * BAR * RATE)
    loop = mix[:loop_len].copy()
    tail = mix[loop_len:]
    loop[:len(tail)] += tail
    loop = np.tanh(loop / np.abs(loop).max() * 1.2) / np.tanh(1.2)   # gentle limiter
    return (loop * 0.9 * 32767).astype(np.int16)


def main():
    pcm = render()
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = enc.encode(pcm.tobytes()) + enc.flush()
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'audio', 'music.mp3')
    with open(out, 'wb') as f:
        f.write(mp3)
    print(f'{out}: {len(pcm) / RATE:.1f} s, {len(mp3) // 1024} KB')
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import stamp
    stamp.main()


if __name__ == '__main__':
    main()

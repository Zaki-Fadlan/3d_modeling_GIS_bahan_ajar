"""Skor musik Reel Z versi kelas, disintesis murni dengan numpy/scipy (tanpa sampel).
Jalankan: python audio/music.py  -> menulis audio/score.wav dan audio/audio.json.
Durasi mengikuti data/timeline.json (bagian penjelasan rumus otomatis tanpa drum)."""
"""Reel X "Z" score — 120 BPM, 32 bars (64 s), A minor.
Pure numpy synthesis: no samples. Every act change on the picture has a sound event.

Acts (seconds):  0 intro | 4 rise-to-Z | 10 dimensions | 18 data models | 28 surface
                 36 viewshed (half-time tension) | 44 cut&fill | 50 city | 56 workflow | 60 end
"""
import numpy as np, json, wave, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
import json
TL = json.load(open(os.path.join(HERE, '..', 'data', 'timeline.json')))
INS = TL['inserts']
TOTAL = TL['base'] + sum(i['dur'] for i in INS)
def b2r(tb):
    return tb + sum(i['dur'] for i in INS if i['at'] < tb - 1e-9)
def r2b(T):
    acc = 0
    for i in INS:
        s = i['at'] + acc
        if T < s: return T - acc, None
        if T < s + i['dur']: return i['at'], (i, T - s)
        acc += i['dur']
    return T - acc, None


SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = float(TOTAL)
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def t_arr(n): return np.arange(n) / SR
def midi(m): return 440 * 2 ** ((m - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * l * 1.414
    R[i:i + len(sig)] += sig * r * 1.414

def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.2, hold=None):
    t = t_arr(n); dur = n / SR
    hold = dur - r if hold is None else hold
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = np.clip((t - hold) / r, 0, 1)
    return e * (1 - rel)

def lp(x, cutoff):
    # one-pole lowpass, cutoff may be array
    a = np.exp(-2 * np.pi * np.broadcast_to(cutoff, x.shape) / SR)
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y

def lp_fast(x, cutoff):
    from scipy.signal import butter, lfilter
    b, a = butter(2, min(cutoff, SR / 2 - 100) / (SR / 2), 'low')
    return lfilter(b, a, x)

def hp_fast(x, cutoff):
    from scipy.signal import butter, lfilter
    b, a = butter(2, cutoff / (SR / 2), 'high')
    return lfilter(b, a, x)

def bp_fast(x, lo, hi):
    from scipy.signal import butter, lfilter
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)

# ---------- instruments ----------
def kick(g=1.0):
    n = int(0.45 * SR); t = t_arr(n)
    f = 46 + 120 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.25
    return np.tanh((s + click) * 1.6) * g

def snare():
    n = int(0.3 * SR); t = t_arr(n)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.5
    nz = bp_fast(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 16)
    return (body + nz * 0.9)

def clap():
    n = int(0.35 * SR); t = t_arr(n)
    e = np.zeros(n)
    for k, o in enumerate([0, 0.011, 0.022]):
        e += np.where(t >= o, np.exp(-(t - o) * 90), 0) * (0.7 if k < 2 else 1)
    e += np.exp(-t * 14) * 0.35
    return bp_fast(rng.standard_normal(n), 900, 6000) * e

def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = t_arr(n)
    x = hp_fast(rng.standard_normal(n), 7000)
    return x * np.exp(-t * (14 if open_ else 90)) * 0.5

def sub_bass(m, dur):
    n = int(dur * SR); t = t_arr(n); f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t + 0.4)
    saw = 2 * ((f * t) % 1) - 1
    s = s * 0.8 + lp_fast(saw, 600) * 0.35
    return np.tanh(s * 1.3) * env_adsr(n, 0.004, 0.12, 0.7, 0.05)

def pad(notes, dur, bright=1.0):
    n = int(dur * SR); t = t_arr(n); s = np.zeros(n)
    for m in notes:
        for det in (-0.09, 0.0, 0.11):
            f = midi(m) * 2 ** (det / 12)
            s += 2 * ((f * t + rng.random()) % 1) - 1
    s /= len(notes) * 3
    s = lp_fast(s, 900 + 1800 * bright)
    return s * env_adsr(n, 0.5, 0.4, 0.85, 0.6)

def pluck(m, dur=0.35, bright=1.0):
    n = int(dur * SR); t = t_arr(n); f = midi(m)
    s = (2 * ((f * t) % 1) - 1) * 0.6 + np.sign(np.sin(2 * np.pi * f * t)) * 0.3
    s = lp_fast(s, 1200 + 3500 * bright) * np.exp(-t * 9)
    return s

def bell(m, dur=1.6):
    n = int(dur * SR); t = t_arr(n); f = midi(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.6) * 0.5

def riser(dur, f0=200, f1=4000):
    n = int(dur * SR); t = t_arr(n)
    x = rng.standard_normal(n)
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        p = i / n
        fc = f0 * (f1 / f0) ** p
        out[i:i + seg] = bp_fast(x[i:i + seg], max(40, fc * 0.6), min(20000, fc * 1.6))
    sweep = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (t / dur * 3)) / SR) * 0.2
    return (out + sweep) * (t / dur) ** 2

def impact():
    n = int(2.2 * SR); t = t_arr(n)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    nz = lp_fast(rng.standard_normal(n), 2500) * np.exp(-t * 4) * 0.6
    return np.tanh((boom + nz) * 1.5)

def whoosh(dur=0.6, up=True):
    n = int(dur * SR); t = t_arr(n)
    x = rng.standard_normal(n); out = np.zeros(n); seg = 1024
    for i in range(0, n, seg):
        p = i / n if up else 1 - i / n
        fc = 300 * 20 ** p
        out[i:i + seg] = bp_fast(x[i:i + seg], fc * 0.5, min(20000, fc * 1.8))
    e = np.sin(np.pi * t / dur) ** 2
    return out * e

def blip(m, dur=0.09):
    n = int(dur * SR); t = t_arr(n)
    return np.sin(2 * np.pi * midi(m) * t) * np.exp(-t * 40) * 0.5

def scan_tone(dur):
    # LiDAR scan: FM chirp per sweep
    n = int(dur * SR); t = t_arr(n)
    f = 900 + 600 * np.sin(2 * np.pi * 4 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08 * np.sin(np.pi * t / dur)


PROG = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67])]
PROG_B = [(50, [53, 57, 62, 65]), (53, [53, 57, 60, 64]), (57, [57, 60, 64, 67]), (52, [52, 56, 59, 64])]
events = []
def section_base(s):
    if s < 4: return 'intro'
    if s < 24: return 'a'
    if s < 46: return 'b'
    if s < 56: return 'c'
    if s < 66: return 'brk'
    if s < 88: return 'd'
    if s < 106: return 'b'
    if s < 118: return 'brk'
    if s < 124: return 'c'
    if s < 128: return 'build'
    return 'end'
NB = int(DUR // 2)
for bar in range(NB):
    t0 = bar * 2.0
    tb, ins = r2b(t0 + 0.01)
    sec = 'explain' if ins else section_base(tb)
    prog = PROG_B if sec == 'brk' else PROG
    root, chord = prog[bar % 4]
    if sec != 'end':
        add(pad(chord, 2.3, bright={'intro': 0.2, 'brk': 0.4, 'explain': 0.35}.get(sec, 0.8)), t0, pan=-0.2, gain=0.16 if sec not in ('intro', 'explain') else 0.2)
        add(pad([c + 12 for c in chord[1:3]], 2.3, 0.5), t0, pan=0.3, gain=0.06)
    for b in range(4):
        tb_ = t0 + b * BEAT
        if sec in ('a', 'b', 'c', 'd'):
            add(kick(), tb_, gain=0.9); events.append([round(tb_, 4), 'kick'])
            if b in (1, 3): add(clap(), tb_, pan=0.05, gain=0.42); add(snare(), tb_, gain=0.18)
            add(hat(), tb_ + BEAT / 2, pan=0.35, gain=0.55)
            if sec in ('b', 'd'): add(hat(), tb_ + BEAT / 4, pan=0.45, gain=0.25); add(hat(), tb_ + 3 * BEAT / 4, pan=0.45, gain=0.25)
            if sec == 'd' and b == 3: add(hat(True), tb_ + BEAT / 2, pan=0.4, gain=0.35)
        elif sec == 'brk':
            if b == 0: add(kick(), tb_, gain=0.85); events.append([round(tb_, 4), 'kick'])
            if b == 2: add(clap(), tb_, gain=0.45); add(snare(), tb_, gain=0.2)
            add(hat(), tb_ + BEAT / 2, pan=0.3, gain=0.3)
            add(blip(81 + (b % 2) * 3, 0.06), tb_ + BEAT * 0.25, pan=-0.5, gain=0.25)
        elif sec == 'explain':
            # calm "thinking" bed: no drums, soft ticks and a slow pluck motif
            add(hat(), tb_ + BEAT / 2, pan=0.3, gain=0.12)
            add(pluck(chord[(b * 2) % 4] + 24, 0.6, 0.25), tb_, pan=0.5 * np.sin(bar + b), gain=0.06)
        elif sec == 'build':
            add(kick(), tb_, gain=0.85); events.append([round(tb_, 4), 'kick'])
            add(snare(), tb_ + BEAT / 2, gain=0.15)
    if sec in ('a', 'b', 'c', 'd', 'build'):
        for p in ([0, 0.75, 1.5, 2.5, 3.0, 3.5] if sec in ('b', 'd') else [0, 1.5, 2.5, 3.5]):
            add(sub_bass(root - 12, 0.32 if p % 1 else 0.45), t0 + p * BEAT, gain=0.38)
    elif sec in ('brk', 'explain'):
        add(sub_bass(root - 12, 1.9), t0, gain=0.3 if sec == 'brk' else 0.22)
    if sec in ('b', 'c', 'd'):
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 12, chord[1] + 12, chord[3] + 12, chord[2] + 24]
        for k in range(16): add(pluck(arp[k % 8], 0.3, 0.6 + 0.4 * (k % 4 == 0)), t0 + k * BEAT / 4, pan=0.5 * np.sin(k * 0.9), gain=0.11 if sec != 'c' else 0.13)

R_ = b2r
MEL = {4.0: 76, 14.0: 72, 24.0: 76, 30.0: 79, 38.0: 74, 46.0: 79, 56.0: 74, 66.0: 76, 72.0: 72, 82.0: 69, 88.0: 81, 93.0: 76, 99.0: 79, 107.0: 74, 117.0: 72, 124.0: 79}
for t, m in MEL.items(): add(bell(m), R_(t), pan=0.2, gain=0.3); add(bell(m + 7, 1.2), R_(t) + BEAT, pan=-0.2, gain=0.18)
for t in [4.0, 24.0, 66.0, 88.0, 128.0]:
    d = 3.5 if t == 4.0 else 2.0
    add(riser(d), R_(t) - d, gain=0.22); add(impact(), R_(t), gain=0.55); events.append([R_(t), 'impact'])
for t in [14.0, 30.0, 38.0, 46.0, 56.0, 72.0, 82.0, 93.0, 99.0, 103.0, 107.0, 117.0, 124.0]:
    add(whoosh(0.7, True), R_(t) - 0.55, pan=-0.4, gain=0.35); add(whoosh(0.5, False), R_(t) - 0.05, pan=0.4, gain=0.25)
add(whoosh(1.2, True), R_(10.4), gain=0.2); add(whoosh(0.9, False), R_(13.0), gain=0.18)
for k in range(6): add(scan_tone(0.45), R_(24.3) + k * 0.5, pan=-0.6 + 0.24 * k, gain=0.6)
add(whoosh(1.4, False), R_(27.7), pan=0.2, gain=0.3)
for k in range(32): add(blip(84 + [0, 3, 7, 10][k % 4], 0.04), R_(30.6) + k * 0.125, pan=np.sin(k * 0.7) * 0.6, gain=0.1)
for t, m in [(40.5, 84), (43.5, 88), (49.5, 83), (52.5, 86)]: add(blip(m, 0.15), R_(t), gain=0.38)
for k in range(24): add(blip(93 + (k % 3), 0.03), R_(67.5) + k * 0.125, pan=0.3, gain=0.12)
for k in range(12): add(blip(64 + [0, 3, 5, 7, 10, 12][k % 6], 0.08), R_(72.6) + k * BEAT / 2, pan=np.sin(k), gain=0.25)
add(bell(79, 1.4), R_(75.8), gain=0.25); add(bell(83, 1.6), R_(77.4), gain=0.28)
add(whoosh(2.4, True), R_(82.6), gain=0.22)
for k in range(16): add(blip(88 + (k % 5), 0.04), R_(89.0) + k * 0.22, pan=0.4 * np.sin(k), gain=0.1)
add(scan_tone(1.6), R_(93.4), gain=0.5)
for k in range(8): add(blip(60 + k * 2, 0.08), R_(99.6) + k * 0.25, gain=0.22)
for k, m in enumerate([67, 71, 74, 79]): add(bell(m, 0.8), R_(103.3) + k * 0.9, gain=0.2)
n = int(9 * SR); tt = t_arr(n); add(lp_fast(rng.standard_normal(n), 300) * np.sin(np.pi * tt / 9) * 0.12, R_(107.5))
for k in range(10): add(blip(84 + (k % 5) * 2, 0.06), R_(118.0) + k * 0.4, pan=0.4, gain=0.18)
for t, m in [(124.5, 76), (125.5, 79), (126.5, 83)]: add(bell(m, 0.9), R_(t), gain=0.22)
T_END = R_(128.0)
add(pad([45, 57, 60, 64, 69, 72], 4.0, 0.9), T_END, gain=0.28); add(bell(81, 3.5), T_END, gain=0.35); add(bell(76, 3.5), T_END + 0.5, gain=0.2); add(sub_bass(33, 2.5), T_END, gain=0.45)
# insert cues: soft swell in, a tick per explanation step, a "click" when parts reassemble
acc = 0
for i in INS:
    s = i['at'] + acc
    add(whoosh(1.0, True), s - 0.2, gain=0.16); add(bell(84, 1.2), s + 0.3, gain=0.16)
    for k, st in enumerate(i['steps']): add(blip(79 + [0, 3, 5, 7, 10][k % 5], 0.12), s + st, pan=0.2, gain=0.24)
    add(blip(72, 0.1), s + i['dur'] - 1.0, gain=0.25); add(whoosh(0.8, False), s + i['dur'] - 0.9, gain=0.14)
    acc += i['dur']
n = int(4 * SR); add(lp_fast(rng.standard_normal(n), 400) * np.linspace(0, 1, n) * 0.15, 0)
for k in range(4): add(blip(69 + [0, 7, 12, 7][k], 0.12), 0.5 + k * 0.75, pan=-0.3 + 0.2 * k, gain=0.3)
# ---------- master: sidechain-ish ducking, simple reverb, limiter ----------
duck = np.ones(N)
for t, k in events:
    if k == 'kick':
        i = int(t * SR); n = int(0.3 * SR); tt = t_arr(min(n, N - i))
        duck[i:i + len(tt)] = np.minimum(duck[i:i + len(tt)], 1 - 0.35 * np.exp(-tt * 12))

def reverb(x):
    out = x.copy()
    for d, g in [(0.031, 0.35), (0.047, 0.3), (0.071, 0.26), (0.113, 0.2), (0.167, 0.15), (0.229, 0.1)]:
        k = int(d * SR); y = np.zeros_like(x); y[k:] = x[:-k] * g; out += lp_fast(y, 5000)
    return out

L = reverb(L) * duck; R = reverb(R) * duck
fade = np.ones(N); fn = int(1.2 * SR); fade[-fn:] = np.linspace(1, 0, fn) ** 2
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.4) / np.tanh(1.4) * 0.92
R = np.tanh(R / peak * 1.4) / np.tanh(1.4) * 0.92

pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

# per-frame energy envelope (24 fps) for audio-reactive visuals
fps = 24; hop = SR // fps
mono = (L + R) / 2
low = lp_fast(mono, 150); high = hp_fast(mono, 4000)
bands = {'low': [], 'high': [], 'rms': []}
for f in range(int(DUR * fps)):
    s = slice(f * hop, (f + 1) * hop)
    bands['low'].append(round(float(np.sqrt(np.mean(low[s] ** 2))), 4))
    bands['high'].append(round(float(np.sqrt(np.mean(high[s] ** 2))), 4))
    bands['rms'].append(round(float(np.sqrt(np.mean(mono[s] ** 2))), 4))
for k in bands:
    m = max(bands[k]) or 1; bands[k] = [round(v / m, 3) for v in bands[k]]
json.dump({'events': sorted(events), 'bands': bands}, open('audio.json', 'w'))
print('ok', len(events))

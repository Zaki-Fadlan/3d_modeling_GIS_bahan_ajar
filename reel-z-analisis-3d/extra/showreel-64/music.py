"""Reel X "Z" score — 120 BPM, 32 bars (64 s), A minor.
Pure numpy synthesis: no samples. Every act change on the picture has a sound event.

Acts (seconds):  0 intro | 4 rise-to-Z | 10 dimensions | 18 data models | 28 surface
                 36 viewshed (half-time tension) | 44 cut&fill | 50 city | 56 workflow | 60 end
"""
import numpy as np, json, wave, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 64.0
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

# ---------- harmony ----------
# Am | F | C | G  (bar = 2 s)
PROG = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67])]
PROG_B = [(50, [53, 57, 62, 65]), (53, [53, 57, 60, 64]), (57, [57, 60, 64, 67]), (52, [52, 56, 59, 64])]  # Dm F Am E

events = []  # for visuals: list of [time, kind]

def section(bar):
    s = bar * 2
    if s < 4: return 'intro'
    if s < 18: return 'a'
    if s < 28: return 'b'
    if s < 36: return 'c'
    if s < 44: return 'brk'
    if s < 56: return 'd'
    if s < 60: return 'build'
    return 'end'

for bar in range(32):
    t0 = bar * 2.0
    sec = section(bar)
    prog = PROG_B if sec in ('brk',) else PROG
    root, chord = prog[bar % 4]
    # pads everywhere except last 2 bars handled separately
    if sec != 'end':
        add(pad(chord, 2.3, bright={'intro': 0.2, 'brk': 0.4}.get(sec, 0.8)), t0, pan=-0.2,
            gain=0.16 if sec != 'intro' else 0.22)
        add(pad([c + 12 for c in chord[1:3]], 2.3, 0.5), t0, pan=0.3, gain=0.06)
    # drums
    for b in range(4):
        tb = t0 + b * BEAT
        if sec in ('a', 'b', 'c', 'd'):
            add(kick(), tb, gain=0.9); events.append([round(tb, 4), 'kick'])
            if b in (1, 3): add(clap(), tb, pan=0.05, gain=0.42); add(snare(), tb, gain=0.18); events.append([round(tb, 4), 'snare'])
            add(hat(), tb + BEAT / 2, pan=0.35, gain=0.55); events.append([round(tb + BEAT / 2, 4), 'hat'])
            if sec in ('b', 'd'):
                add(hat(), tb + BEAT / 4, pan=0.45, gain=0.25); add(hat(), tb + 3 * BEAT / 4, pan=0.45, gain=0.25)
            if sec == 'd' and b == 3: add(hat(True), tb + BEAT / 2, pan=0.4, gain=0.35)
        elif sec == 'brk':
            if b == 0: add(kick(), tb, gain=0.85); events.append([round(tb, 4), 'kick'])
            if b == 2: add(clap(), tb, gain=0.45); add(snare(), tb, gain=0.2); events.append([round(tb, 4), 'snare'])
            add(hat(), tb + BEAT / 2, pan=0.3, gain=0.3)
            # ticking viewshed pulse
            add(blip(81 + (b % 2) * 3, 0.06), tb + BEAT * 0.25, pan=-0.5, gain=0.25)
        elif sec == 'build':
            n16 = 4 if bar == 28 else 8
            for k in range(n16 // 2 if b < 2 else n16):
                pass
            add(kick(), tb, gain=0.85); events.append([round(tb, 4), 'kick'])
            if bar == 29:
                for k in range(4): add(snare(), tb + k * BEAT / 4, gain=0.12 + 0.05 * (b * 4 + k) / 16)
            else:
                add(snare(), tb + BEAT / 2, gain=0.15)
    # bass
    if sec in ('a', 'b', 'c', 'd', 'build'):
        pattern = [0, 0.75, 1.5, 2.5, 3.0, 3.5] if sec in ('b', 'd') else [0, 1.5, 2.5, 3.5]
        for p in pattern:
            add(sub_bass(root - 12, 0.32 if p % 1 else 0.45), t0 + p * BEAT, gain=0.38)
    elif sec == 'brk':
        add(sub_bass(root - 12, 1.9), t0, gain=0.34)
    # arp from data models onward
    if sec in ('b', 'c', 'd'):
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 12, chord[1] + 12, chord[3] + 12, chord[2] + 24]
        for k in range(16):
            add(pluck(arp[k % 8], 0.3, 0.6 + 0.4 * (k % 4 == 0)), t0 + k * BEAT / 4,
                pan=0.5 * np.sin(k * 0.9), gain=0.11 if sec != 'c' else 0.13)
    if sec == 'brk':
        for k in range(8):
            add(pluck(chord[k % 4] + 24, 0.5, 0.3), t0 + k * BEAT / 2, pan=0.6 * np.sin(k), gain=0.07)

# melody bells on key concept reveals
MEL = {4.0: 76, 10.0: 72, 18.0: 76, 28.0: 79, 36.0: 74, 44.0: 76, 50.0: 72, 56.0: 79}
for t, m in MEL.items():
    add(bell(m), t, pan=0.2, gain=0.3); add(bell(m + 7, 1.2), t + BEAT, pan=-0.2, gain=0.18)

# transitions: riser before, impact on
for t in [4.0, 18.0, 44.0, 60.0]:
    d = 3.5 if t == 4.0 else 2.0
    add(riser(d), t - d, pan=0, gain=0.22)
    add(impact(), t, gain=0.55); events.append([t, 'impact'])
for t in [10.0, 28.0, 36.0, 50.0, 56.0]:
    add(whoosh(0.7, True), t - 0.55, pan=-0.4, gain=0.35)
    add(whoosh(0.5, False), t - 0.05, pan=0.4, gain=0.25); events.append([t, 'whoosh'])

# LiDAR scan chirps 18–21
for k in range(6):
    add(scan_tone(0.45), 18.2 + k * 0.5, pan=-0.6 + 0.24 * k, gain=0.6)
# data-model switch blips (TIN 21, DEM 24, voxel 26)
for t, m in [(21.0, 84), (24.0, 86), (26.0, 88)]:
    add(blip(m, 0.15), t, gain=0.4); add(blip(m + 12, 0.1), t + 0.08, gain=0.25); events.append([t, 'blip'])
# slope/aspect/hillshade switches
for t, m in [(31.0, 83), (33.5, 86)]:
    add(blip(m, 0.15), t, gain=0.35); events.append([t, 'blip'])
# cut/fill counter ticks
for k in range(24):
    add(blip(93 + (k % 3), 0.03), 45.5 + k * 0.125, pan=0.3, gain=0.12)
# building pops 50–53
for k in range(12):
    add(blip(64 + [0, 3, 5, 7, 10, 12][k % 6], 0.08), 50.6 + k * BEAT / 2, pan=np.sin(k), gain=0.25)
# workflow steps
for t, m in [(56.5, 76), (57.5, 79), (58.5, 83)]:
    add(bell(m, 0.9), t, gain=0.22); events.append([t, 'step'])

# end: big chord + tail
add(pad([45, 57, 60, 64, 69, 72], 4.0, 0.9), 60.0, gain=0.28)
add(bell(81, 3.5), 60.0, gain=0.35); add(bell(76, 3.5), 60.5, gain=0.2); add(bell(69, 3.5), 61.0, gain=0.18)
add(sub_bass(33, 2.5), 60.0, gain=0.45)

# intro texture
add(lp_fast(rng.standard_normal(int(4 * SR)), 400) * np.linspace(0, 1, int(4 * SR)) * 0.15, 0)
for k in range(4):
    add(blip(69 + [0, 7, 12, 7][k], 0.12), 0.5 + k * 0.75, pan=-0.3 + 0.2 * k, gain=0.3)

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

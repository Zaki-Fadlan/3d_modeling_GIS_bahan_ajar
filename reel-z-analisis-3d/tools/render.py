"""Render index.html menjadi MP4 1920x1080 di komputer sendiri (Playwright + Chromium + ffmpeg).

    python tools/render.py                         # seluruh video -> out/reel-z.mp4
    python tools/render.py --fps 30 --crf 16       # 30 fps, kualitas lebih tinggi
    python tools/render.py --start 140 --end 205   # potong satu bagian (detik)
    python tools/render.py --png                   # frame PNG lossless (lebih lambat, file besar)
    python tools/render.py --cpu                   # paksa render CPU (SwiftShader) jika GPU bermasalah
    python tools/render.py --page showreel-64.html --out out/showreel.mp4

Cara kerja: setiap frame dipanggil window.frameAt(t) (deterministik, tidak bergantung jam),
canvas diambil sebagai gambar dan dikirim ke ffmpeg lewat pipa, lalu musik dimux di akhir.
Frame juga bisa disimpan (--keep-frames) supaya render yang terputus bisa dilanjutkan (--resume).
"""
import argparse, base64, pathlib, shutil, subprocess, sys, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--page', default='index.html')
ap.add_argument('--out', default='out/reel-z.mp4')
ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--start', type=float, default=0.0)
ap.add_argument('--end', type=float, default=None)
ap.add_argument('--crf', type=int, default=17)
ap.add_argument('--preset', default='slow')
ap.add_argument('--png', action='store_true')
ap.add_argument('--cpu', action='store_true')
ap.add_argument('--headful', action='store_true', help='buka jendela Chromium (kadang GPU lebih stabil)')
ap.add_argument('--keep-frames', action='store_true')
ap.add_argument('--resume', action='store_true')
a = ap.parse_args()

if not shutil.which('ffmpeg'):
    sys.exit('ffmpeg tidak ditemukan di PATH. Install dulu (lihat README).')
from playwright.sync_api import sync_playwright

page_path = (ROOT / a.page).resolve()
if not page_path.exists():
    sys.exit(f'{page_path.name} belum ada. Jalankan dulu: python tools/build.py')
out = (ROOT / a.out).resolve(); out.parent.mkdir(parents=True, exist_ok=True)
frames_dir = out.with_suffix('') .parent / (out.stem + '_frames')
audio = ROOT / ('audio/score.wav' if (ROOT / 'audio/score.wav').exists() else 'audio/score.mp3')
if 'showreel' in a.page:
    audio = ROOT / 'extra/showreel-64/score.mp3'

args = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
args += ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if a.cpu else ['--use-gl=angle', '--enable-webgl']
mime, ext = ('image/png', 'png') if a.png else ('image/jpeg', 'jpg')

with sync_playwright() as p:
    b = p.chromium.launch(headless=not a.headful, args=args)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page_path.as_uri())
    pg.evaluate("document.documentElement.classList.add('render')")
    pg.evaluate('window.reelReady')
    renderer = pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('webgl');if(!c)return 'tidak ada WebGL';const e=c.getExtension('WEBGL_debug_renderer_info');return e?c.getParameter(e.UNMASKED_RENDERER_WEBGL):c.getParameter(c.RENDERER)})()")
    print('WebGL renderer:', renderer)
    dur = pg.evaluate('window.REEL.DUR_REAL || window.REEL.DUR')
    end = min(a.end if a.end is not None else dur, dur)
    # warm-up: build GL scenes and let textures (Mask R-CNN class map) finish loading
    for t in [5, dur * 0.7, a.start]:
        pg.evaluate(f'window.frameAt({t})')
    pg.wait_for_timeout(1500)
    if errs: print('Peringatan JS:', errs[:3])

    f0, f1 = int(round(a.start * a.fps)), int(round(end * a.fps))
    n = f1 - f0
    print(f'Render {n} frame ({a.start:.1f}–{end:.1f} s, {a.fps} fps) -> {out.name}')
    if a.keep_frames or a.resume: frames_dir.mkdir(exist_ok=True)
    ff = None
    if not (a.keep_frames or a.resume):
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(a.fps), '-i', '-',
                               '-ss', f'{a.start:.3f}', '-t', f'{end - a.start:.3f}', '-i', str(audio),
                               '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-pix_fmt', 'yuv420p',
                               '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(out)], stdin=subprocess.PIPE)
    t0 = time.time()
    q = 0.95 if not a.png else 1
    for k in range(n):
        fr = f0 + k
        fp = frames_dir / f'{fr:06d}.{ext}'
        if a.resume and fp.exists():
            continue
        data = pg.evaluate(f"(()=>{{window.frameAt({fr / a.fps});return document.getElementById('stage').toDataURL('{mime}',{q})}})()")
        img = base64.b64decode(data.split(',', 1)[1])
        if ff: ff.stdin.write(img)
        else: fp.write_bytes(img)
        if k % 48 == 0 or k == n - 1:
            el = time.time() - t0; rate = (k + 1) / el if el > 0 else 0
            eta = (n - k - 1) / rate if rate else 0
            print(f'  frame {k + 1}/{n}  {rate:.1f} fps  sisa ±{eta / 60:.0f} menit', flush=True)
    b.close()
    if errs: print('Error JS selama render:', errs[:5])

if ff:
    ff.stdin.close(); ff.wait()
else:
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(a.fps), '-start_number', str(f0), '-i', str(frames_dir / f'%06d.{ext}'),
                    '-ss', f'{a.start:.3f}', '-t', f'{end - a.start:.3f}', '-i', str(audio), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k',
                    '-shortest', '-movflags', '+faststart', str(out)], check=True)
print('Selesai:', out)

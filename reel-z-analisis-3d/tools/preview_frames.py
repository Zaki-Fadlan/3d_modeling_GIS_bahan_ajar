"""Cek cepat beberapa frame sebelum render penuh: python tools/preview_frames.py 10 60 150 200
Hasil: out/contact_sheet.jpg (grid 3 kolom)."""
import base64, io, pathlib, sys
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
times = [float(x) for x in sys.argv[1:]] or [6, 45, 75, 150, 190]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--ignore-gpu-blocklist', '--use-gl=angle'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((ROOT / 'index.html').resolve().as_uri())
    pg.evaluate("document.documentElement.classList.add('render')"); pg.evaluate('window.reelReady')
    pg.evaluate('window.frameAt(150)'); pg.wait_for_timeout(1000)
    ims = []
    for t in times:
        d = pg.evaluate(f"(()=>{{window.frameAt({t});return document.getElementById('stage').toDataURL('image/jpeg',0.85)}})()")
        ims.append(Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).resize((640, 360)))
    b.close()
cols = 3; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 640, rows * 360))
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 640, (i // cols) * 360))
(ROOT / 'out').mkdir(exist_ok=True); sheet.save(ROOT / 'out/contact_sheet.jpg', quality=88)
print('out/contact_sheet.jpg')

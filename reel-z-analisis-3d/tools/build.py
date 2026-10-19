"""Gabungkan semua sumber menjadi satu file HTML yang bisa diputar.

    python tools/build.py              -> index.html (three.js lokal dari vendor/, bisa offline)
    python tools/build.py --cdn        -> index.html memuat three.js dari jsDelivr
    python tools/build.py --showreel   -> showreel-64.html (versi showreel 64 detik, 2D)

Urutan gabungan JS: src/core.js, lalu src/inserts.js + src/ui/uiscene.js + src/gl.js
disisipkan tepat sebelum penanda "/* ---------------- post ---------------- */" di core.js.
"""
import base64, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = [('Unbounded', 'unbounded', [700, 800]), ('IBM Plex Sans', 'ibm-plex-sans', [400, 500, 600]), ('IBM Plex Mono', 'ibm-plex-mono', [500, 600])]
MARK = '/* ---------------- post ---------------- */'


def b64(p):
    return base64.b64encode(p.read_bytes()).decode()


def font_css():
    out = []
    for fam, slug, ws in FONTS:
        for w in ws:
            f = ROOT / 'fonts' / f'{slug}-latin-{w}-normal.woff2'
            out.append(f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;"
                       f"src:url(data:font/woff2;base64,{b64(f)}) format('woff2')}}")
    return '\n'.join(out)


def build_class(cdn):
    core = (ROOT / 'src/core.js').read_text(encoding='utf-8')
    extra = '\n'.join((ROOT / p).read_text(encoding='utf-8') for p in ['src/inserts.js', 'src/ui/uiscene.js', 'src/gl.js'])
    assert MARK in core, 'penanda post tidak ditemukan di core.js'
    js = core.replace(MARK, extra + '\n' + MARK, 1)
    html = (ROOT / 'src/shell.html').read_text(encoding='utf-8')
    three = ('<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>' if cdn
             else '<script>' + (ROOT / 'vendor/three.min.js').read_text(encoding='utf-8') + '</script>')
    rep = {
        '/*__FONTS__*/': font_css(),
        '<!--THREE-->': three,
        '/*__TL__*/': (ROOT / 'data/timeline.json').read_text(encoding='utf-8'),
        '/*__UIDATA__*/': (ROOT / 'data/ui_data.js').read_text(encoding='utf-8'),
        '/*__AUDIOJSON__*/': (ROOT / 'audio/audio.json').read_text(encoding='utf-8'),
        '/*__REEL__*/': js,
        '/*__MP3__*/': 'data:audio/mpeg;base64,' + b64(ROOT / 'audio/score.mp3'),
    }
    # the MP3/three placeholders must be replaced after the JS so their contents are never scanned again
    for k in ['/*__FONTS__*/', '/*__TL__*/', '/*__UIDATA__*/', '/*__AUDIOJSON__*/', '/*__MP3__*/', '<!--THREE-->', '/*__REEL__*/']:
        html = html.replace(k, rep[k], 1)
    out = ROOT / 'index.html'
    out.write_text(html, encoding='utf-8')
    return out


def build_showreel():
    d = ROOT / 'extra/showreel-64'
    html = (d / 'shell.html').read_text(encoding='utf-8')
    html = html.replace('/*__FONTS__*/', font_css(), 1)
    html = html.replace('/*__AUDIOJSON__*/', (d / 'audio.json').read_text(encoding='utf-8'), 1)
    html = html.replace('/*__MP3__*/', 'data:audio/mpeg;base64,' + b64(d / 'score.mp3'), 1)
    html = html.replace('/*__REEL__*/', (d / 'reel64.js').read_text(encoding='utf-8'), 1)
    out = ROOT / 'showreel-64.html'
    out.write_text(html, encoding='utf-8')
    return out


if __name__ == '__main__':
    out = build_showreel() if '--showreel' in sys.argv else build_class('--cdn' in sys.argv)
    print(f'{out.name}: {out.stat().st_size / 1e6:.1f} MB')

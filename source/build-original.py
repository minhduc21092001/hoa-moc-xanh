"""Create a standalone, local copy from the two public HTML snapshots."""
from pathlib import Path
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
import re, html, hashlib, json, subprocess, tempfile

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)
BASE = 'https://chungdoi.com'
manifest = {}

def download(url):
    url = html.unescape(url)
    if url in manifest: return manifest[url]
    ext = Path(urlparse(url).path).suffix or '.png'
    path = 'assets/' + hashlib.sha256(url.encode()).hexdigest()[:18] + ext
    dest = DIST / path
    dest.parent.mkdir(exist_ok=True)
    if not dest.exists():
        subprocess.run(['curl.exe', '-f', '-sS', '-L', '--retry', '2', url, '-o', str(dest)], check=True)
    manifest[url] = path
    return path

def demo(h):
    start = h.index('<div class="demo-page">')
    depth = 0
    for m in re.finditer(r'</?div\b[^>]*>', h[start:]):
        depth += -1 if m.group().startswith('</') else 1
        if depth == 0: return h[start:start+m.end()]
    raise ValueError('Unclosed page')

cover = demo((ROOT/'source'/'cover.html').read_text(encoding='utf-8'))
opened = demo((ROOT/'source'/'opened.html').read_text(encoding='utf-8'))
cover = re.sub(r'<audio\b.*?</audio>', '', cover)
opened = re.sub(r'<audio\b.*?</audio>', '', opened)
body = '<div id="cover">'+cover+'</div><div id="invitation" hidden>'+opened+'</div>'
urls = set()
for tag in re.findall(r'<(?:img|source)\b[^>]*>', body):
    for u in re.findall(r'\bsrc="([^"]+)"', tag): urls.add(urljoin(BASE,html.unescape(u)))
for u in re.findall(r'url\([\'\"]?([^\)\'\"]+)', html.unescape(body)):
    if not u.startswith('data:'): urls.add(urljoin(BASE,u))
urls.add('https://cdn.chungdoi.com/music/my-love-westlife.mp3')
css_urls = ['https://chungdoi.com/_next/static/css/a9853113b7c91de6.css','https://chungdoi.com/_next/static/css/08fc569d88870472.css']
css = ''
for u in css_urls:
    p = download(u)
    source = (DIST/p).read_text(encoding='utf-8')
    source = re.sub(r'url\(([^)]+)\)', lambda m: 'url('+urljoin(u,m[1].strip('\"\''))+')' if not m[1].strip('\"\'').startswith('data:') else m[0],source)
    css += source+'\n'
for u in re.findall(r'url\((https?[^)]+)\)',css): urls.add(u)
with ThreadPoolExecutor(max_workers=10) as pool: list(pool.map(download,urls))
for url,path in sorted(manifest.items(),key=lambda x:-len(x[0])):
    css=css.replace(url,'./'+path)
    body=body.replace(html.escape(url,quote=True), './'+path).replace(url,'./'+path)
    if url.startswith(BASE+'/'):
        rel=url[len(BASE):]
        body=body.replace(html.escape(rel,quote=True),'./'+path).replace('"'+rel+'"','"./'+path+'"')
(DIST/'original.css').write_text(css,encoding='utf-8')
# An embed without the original site's API key keeps directions usable on localhost.
body = re.sub(r'https://www.google.com/maps/embed/v1/place\?[^\"]+', 'https://maps.google.com/maps?q=Ti%E1%BB%87c%20C%C6%B0%E1%BB%9Bi%20Ho%C3%A0ng%20Gia%20Nguy%E1%BB%85n%20Th%E1%BB%8B%20%C4%90%E1%BB%8Bnh%20H%C3%A0%20N%E1%BB%99i&amp;output=embed',body)
audio = manifest['https://cdn.chungdoi.com/music/my-love-westlife.mp3']
page='<!doctype html><html lang="vi" data-theme="garden"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Minh Quân & Thu Hà — Hoa Mộc Xanh</title><link rel="stylesheet" href="./original.css"><link rel="stylesheet" href="./local.css"></head><body class="font-sans">'+body+'<audio id="music" loop preload="none" src="./'+audio+'"></audio><script src="./local.js"></script></body></html>'
(DIST/'index.html').write_text(page,encoding='utf-8')
(ROOT/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Saved {len(manifest)} assets; HTML {len(page)} characters')

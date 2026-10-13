from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,re
root=Path('hoa-moc-xanh/source/opening-reference');root.mkdir(exist_ok=True)
h=Path('hoa-moc-xanh/source/cover.html').read_text(encoding='utf-8')
urls=list(dict.fromkeys(re.findall(r'<script[^>]+src="([^"]+)"',h)))
def fetch(u):
 p=root/u.split('/')[-1]
 if not p.exists():subprocess.run(['curl.exe','-f','-sS','-L','https://chungdoi.com'+u,'-o',str(p)],check=True)
 s=p.read_text(encoding='utf-8')
 if any(x in s for x in ['353cb38c53e4a74a','seal-pulse','ambient-fall']):print(p)
with ThreadPoolExecutor(max_workers=10) as pool:list(pool.map(fetch,urls))

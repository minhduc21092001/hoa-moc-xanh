"""Validate and optionally package the Markdown-powered local invitation."""
from pathlib import Path
import argparse, subprocess, zipfile
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--package',action='store_true',help='Create hoa-moc-xanh-local.zip after validation')
args=parser.parse_args()
subprocess.run(['node','check-content.cjs'],cwd=root,check=True)
subprocess.run(['node','--test','tests/content.test.cjs'],cwd=root,check=True)
if args.package:
    archive=root/'hoa-moc-xanh-local.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for folder in ['dist','tests']:
            for f in (root/folder).rglob('*'):
                if f.is_file():z.write(f,f.relative_to(root))
        for name in ['README.md','server.cjs','start.cmd','build.py','check-content.cjs','asset-manifest.json','preview.jpg','preview-markdown.jpg','preview-opening.jpg','preview-corner-flowers.jpg']:
            z.write(root/name,name)
    with zipfile.ZipFile(archive) as z:
        if z.testzip():raise RuntimeError('Archive verification failed')
    print(archive)

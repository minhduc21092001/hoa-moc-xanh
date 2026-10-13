const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'dist');
const {create,parse}=require('./dist/content-core.js');
const markdown=fs.readFileSync(path.join(root,'noi-dung.md'),'utf8');
const content=create(markdown);
const layout=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'local.js'),'utf8');
const paths=new Set();
function file(value){
 if(/^(https?:|mailto:|tel:|\?|#)/i.test(value))return;
 const target=path.resolve(root,decodeURIComponent(value.split(/[?#]/)[0]));
 if(!target.startsWith(root+path.sep))throw new Error('Tài nguyên phải nằm trong thư mục dist: '+value);
 if(!fs.existsSync(target)||!fs.statSync(target).isFile())throw new Error('Thiếu tài nguyên: '+value);
 paths.add(target);
}
for(const match of layout.matchAll(/data-text="([^"]+)"/g))content.text(match[1]);
for(const match of layout.matchAll(/data-attr-(?:aria-label|placeholder|title)="([^"]+)"/g))content.text(match[1]);
for(const match of layout.matchAll(/data-media="([^"]+)"/g))file(content.media(match[1]).src);
for(const match of layout.matchAll(/data-(?:href|src)="([^"]+)"/g))content.url(match[1]);
for(const key of new Set([...runtime.matchAll(/['"]((?:ui|nhan)\.[\w.-]+)['"]/g)].map(match=>match[1])))content.text(key,{so:1});
content.album.forEach(photo=>file(photo.src));
for(const match of fs.readFileSync(path.join(root,'original.css'),'utf8').matchAll(/url\(\.\/([^\)]+)\)/g))file(match[1]);
console.log(`Markdown hợp lệ: ${Object.keys(parse(markdown).fields).length} trường có thể sửa, ${content.album.length} ảnh album, ${paths.size} tài nguyên local.`);

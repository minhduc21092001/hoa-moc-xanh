const fs=require('fs'),path=require('path');
const root=path.resolve('hoa-moc-xanh'),dist=path.join(root,'dist');
// parse() does not need defaults, but content-core's CommonJS loader needs the file.
const defaultPath=path.join(dist,'content-defaults.js');
if(!fs.existsSync(defaultPath))fs.writeFileSync(defaultPath,'module.exports={fields:{},tables:{},aliases:{}};');
const {parse}=require('./dist/content-core.js');
const file=path.join(dist,'noi-dung.md'),original=fs.readFileSync(file,'utf8').replace(/\r\n?/g,'\n'),data=parse(original);
fs.writeFileSync(path.join(root,'source','before-simplifying-content.md'),original);
const keep=new Set(['chu-re.ten-ngan','chu-re.ho-ten','chu-re.vai-ve','co-dau.ten-ngan','co-dau.ho-ten','co-dau.vai-ve','nha-trai.bo','nha-trai.me','nha-trai.dia-chi','nha-gai.bo','nha-gai.me','nha-gai.dia-chi','le-cuoi.ngay','le-cuoi.gio','le-cuoi.am-lich','le-cuoi.dia-diem','tiec-cuoi.ngay','tiec-cuoi.gio','tiec-cuoi.ket-thuc','tiec-cuoi.don-khach','tiec-cuoi.am-lich','tiec-cuoi.dia-diem','loi-moi','loi-cam-on','nhan.than-moi','nhan.trang-phuc-du-tiec','lien-ket.ban-do','lien-ket.chi-duong','lien-ket.lich','lien-ket.chat','chat.hien-thi','nhac.hien-thi','ngan-hang.chu-re.ten','ngan-hang.chu-re.so-tai-khoan','ngan-hang.chu-re.chu-tai-khoan','ngan-hang.co-dau.ten','ngan-hang.co-dau.so-tai-khoan','ngan-hang.co-dau.chu-tai-khoan','media.chu-re','media.co-dau','media.qr-chu-re','media.qr-co-dau','media.nhac-nen']);
const keptTables=new Set(['Album ảnh','Lịch trình','Màu trang phục']);
const photos=new Set(['media.chu-re','media.co-dau'].map(k=>/^!\[[^\]]*\]\((.+)\)$/.exec(data.fields[k])[1]));
for(const row of data.tables['Album ảnh'])photos.add(row[0]);
const imageRoot=path.resolve(dist,'anh-cuoi');if(!imageRoot.startsWith(dist+path.sep))throw Error('Invalid photo directory');fs.mkdirSync(imageRoot,{recursive:true});
const moved={};
for(const url of photos){
 if(/^https?:/.test(url))continue;
 const source=path.resolve(dist,url),destination=path.join(imageRoot,path.basename(source));
 if(!source.startsWith(path.resolve(dist,'asset')+path.sep))throw Error('Unexpected source photo: '+source);
 if(fs.existsSync(source)){if(fs.existsSync(destination))throw Error('Photo name already exists: '+destination);fs.renameSync(source,destination);}else if(!fs.existsSync(destination))throw Error('Missing photo: '+url);moved[url]='./anh-cuoi/'+path.basename(source);
}
const replacePaths=s=>Object.entries(moved).reduce((text,[from,to])=>text.split(from).join(to),s);
const defaults={fields:{},tables:{},aliases:data.aliases};
for(const [key,value] of Object.entries(data.fields))if(!keep.has(key))defaults.fields[key]=value;
for(const [name,rows] of Object.entries(data.tables))if(!keptTables.has(name))defaults.tables[name]=rows;
const defaultsSource='// Fixed interface labels and decoration. Personal content is in noi-dung.md.\n(function(root){const defaults='+JSON.stringify(defaults,null,2)+';if(typeof module!=="undefined"&&module.exports)module.exports=defaults;else root.WeddingContentDefaults=defaults;})(typeof globalThis!=="undefined"?globalThis:this);\n';
fs.writeFileSync(defaultPath,defaultsSource);
const labels=Object.fromEntries(Object.entries(data.aliases).map(([label,key])=>[key,label]));
let text='# Nội dung thiệp cưới\n\nSửa nội dung dưới tiêu đề, lưu tệp rồi nhấn F5. Giữ nguyên tiêu đề và dòng chú thích ngay bên dưới.\n\n- **Ảnh cô dâu, chú rể và album:** đặt trong thư mục `anh-cuoi`, cùng vị trí với tệp này. Ví dụ: `![Ảnh chú rể](./anh-cuoi/chu-re.jpg)`.\n- **Nhạc và ảnh QR:** đặt trong thư mục `asset`.\n- Cụm `{{Tên chú rể}}` lấy nội dung từ mục cùng tên, bạn có thể giữ nguyên hoặc thay bằng chữ riêng.\n- Ngày nhập dạng `2027-12-20`; giờ nhập dạng `18:00`. Ngày âm lịch nhập riêng.\n- `true` là bật, `false` là tắt. Liên kết `tu-dong` được tạo từ địa điểm và ngày giờ tiệc cưới.\n- Khi đổi tài khoản ngân hàng, cần thay ảnh QR tương ứng.\n- Thêm hoặc xóa dòng bảng để chỉnh album và lịch trình. Dùng `\\|` để viết ký tự `|` trong ô.\n\n';
const group=(title,keys)=>{text+='## '+title+'\n\n';for(const key of keys)text+='### '+labels[key]+'\n<!-- Trường dữ liệu: '+key+' -->\n\n'+replacePaths(data.fields[key])+'\n\n';};
group('Cô dâu và chú rể',[...keep].filter(k=>k.startsWith('chu-re.')||k.startsWith('co-dau.')));
group('Thông tin hai gia đình',[...keep].filter(k=>k.startsWith('nha-')));
group('Lễ cưới và tiệc cưới',[...keep].filter(k=>k.startsWith('le-cuoi.')||k.startsWith('tiec-cuoi.')));
group('Lời mời và lời cảm ơn',['nhan.than-moi','loi-moi','loi-cam-on','nhan.trang-phuc-du-tiec']);
group('Ảnh chân dung',['media.chu-re','media.co-dau']);
group('Nhạc nền và liên kết',[...keep].filter(k=>k.startsWith('lien-ket.')||k.startsWith('chat.')||k.startsWith('nhac.')||k==='media.nhac-nen'));
group('Tài khoản và mã QR nhận quà',[...keep].filter(k=>k.startsWith('ngan-hang.')||k.startsWith('media.qr-')));
// Capture entire table sections independently of multiline "$" matching.
for(const name of keptTables){const start=original.indexOf('## '+name+'\n');let end=original.indexOf('\n## ',start+4);if(end<0)end=original.length;text+=replacePaths(original.slice(start,end).trim())+'\n\n';}
fs.writeFileSync(file,text);
const manifestPath=path.join(root,'asset-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
for(const key of Object.keys(manifest))if(moved['./'+manifest[key]])manifest[key]=moved['./'+manifest[key]].slice(2);
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
const fixture=path.join(root,'tests','fixture.md');fs.writeFileSync(fixture,replacePaths(fs.readFileSync(fixture,'utf8')));
console.log(`Moved ${Object.keys(moved).length} photos. Editable fields: ${keep.size}, previously ${Object.keys(data.fields).length}.`);

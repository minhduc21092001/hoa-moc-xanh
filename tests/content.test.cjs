const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {create,parse}=require('../dist/content-core.js');
const {coordinates,isGoogleMapsUrl,resolveGoogleMapsEmbed}=require('../server.cjs');
const source=fs.readFileSync(path.join(__dirname,'fixture.md'),'utf8');
function edit(markdown,key,value){const expression=new RegExp('(### '+key.replace(/[.]/g,'\\.')+'\\s*\\n)[\\s\\S]*?(?=\\n##|$)');return markdown.replace(expression,(_,heading)=>heading+'\n'+value+'\n');}

test('Changing a name updates references and the generated calendar URL',()=>{
 const content=create(edit(edit(source,'chu-re.ten-ngan','Anh Dũng'),'chu-re.ho-ten','Nguyễn Anh Dũng'));
 assert.match(content.text('website.tieu-de'),/Anh Dũng/);
 assert.match(content.rows('Gợi ý lời chúc',1)[1][0],/Anh Dũng/);
 assert.equal(new URL(content.url('lien-ket.lich')).searchParams.get('text'),'Nguyễn Anh Dũng & Nguyễn Thu Hà');
});
test('Editing the wedding date updates month, weekday and UTC calendar times',()=>{
 let markdown=edit(source,'tiec-cuoi.ngay','2027-02-14');markdown=edit(markdown,'tiec-cuoi.gio','23:30');markdown=edit(markdown,'tiec-cuoi.ket-thuc','01:00');
 const content=create(markdown);
 assert.equal(content.text('tiec-cuoi.thu'),'CHỦ NHẬT');assert.equal(content.text('lich.tieu-de'),'Tháng 2 / 2027');
 assert.equal(new URL(content.url('lien-ket.lich')).searchParams.get('dates'),'20270214T163000Z/20270214T180000Z');
 assert.equal(content.text('le-cuoi.ngay'),'2026-05-24');
});
test('A custom link overrides automatic generation',()=>{
 const content=create(edit(source,'lien-ket.chi-duong','https://example.com/new-location'));
 assert.equal(content.url('lien-ket.chi-duong'),'https://example.com/new-location');
});
test('Vietnamese Google Maps headings map to the correct links',()=>{
 let markdown=source.replace('### lien-ket.ban-do','### Link Google Maps hiển thị bản đồ trong thiệp');
 markdown=markdown.replace('### lien-ket.chi-duong','### Link Google Maps cho nút Chỉ đường');
 markdown=edit(markdown,'Link Google Maps hiển thị bản đồ trong thiệp','https://maps.google.com/maps?q=Ha+Noi&output=embed');
 markdown=edit(markdown,'Link Google Maps cho nút Chỉ đường','https://maps.app.goo.gl/example');
 const content=create(markdown);
 assert.equal(content.url('lien-ket.ban-do'),'https://maps.google.com/maps?q=Ha+Noi&output=embed');
 assert.equal(content.url('lien-ket.chi-duong'),'https://maps.app.goo.gl/example');
});
test('The single Google Maps heading controls the directions link',()=>{
 const markdown=source.replace('### lien-ket.chi-duong','### Link Google Maps');
 assert.equal(create(edit(markdown,'Link Google Maps','https://maps.app.goo.gl/example')).url('lien-ket.chi-duong'),'https://maps.app.goo.gl/example');
});
test('Optional sections accept only true or false',()=>{
 const hidden=create(source+'\n## Ẩn hoặc hiện các phần\n\n### Hiện dress code\n\nfalse\n');
 assert.equal(hidden.enabled('hien-thi.dress-code'),false);
 assert.equal(create(source).enabled('hien-thi.dress-code'),true);
 assert.throws(()=>create(source+'\n## Ẩn hoặc hiện các phần\n\n### Hiện lịch trình\n\ncó\n').enabled('hien-thi.lich-trinh'),/true hoặc false/);
});
test('The map remains enabled while the invitation cover is still closed',()=>{
 const content=create(edit(source,'lien-ket.chi-duong','https://maps.app.goo.gl/example'));
 assert.equal(content.enabled('hien-thi.ban-do'),true);
 assert.match(content.url('lien-ket.chi-duong'),/^https:\/\/maps\.(?:app\.)?goo/);
});
test('Google Maps links can be converted to an embed URL',async()=>{
 assert.deepEqual(coordinates('https://www.google.com/maps/place/Test/@21.1263792,105.4780907,17z'),['21.1263792','105.4780907']);
 assert.deepEqual(coordinates('https://www.google.com/maps/place/Test/@1,2,17z/data=!3d21.1263792!4d105.4780907'),['21.1263792','105.4780907']);
 assert.equal(isGoogleMapsUrl('https://maps.app.goo.gl/example'),true);
 assert.equal(isGoogleMapsUrl('https://example.com/maps'),false);
 assert.equal(await resolveGoogleMapsEmbed('https://www.google.com/maps/place/Test/@21.1263792,105.4780907,17z'),'https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s21.1263792,105.4780907!6i17');
});
test('The Markdown parser preserves multiline text and escaped table separators',()=>{
 const result=parse('## Lời mời\n### loi-moi\n\nDòng một\nDòng hai\n\n## Album ảnh\n| Ảnh | Mô tả | Vị trí ảnh |\n| --- | --- | --- |\n| ./asset/a.jpg | A \\| B | 50% 50% |\n');
 assert.equal(result.fields['loi-moi'],'Dòng một\nDòng hai');assert.equal(result.tables['Album ảnh'][0][1],'A | B');
});
test('Adding an album row does not require HTML changes',()=>{
 const markdown=source.replace('## Lịch trình','| ./anh-cuoi/chu-re.webp | Ảnh mới | 50% 50% |\n\n## Lịch trình');
 assert.equal(create(markdown).album.length,9);
});
test('Invalid dates, duplicate fields and circular references show actionable errors',()=>{
 assert.throws(()=>create(edit(source,'tiec-cuoi.ngay','2027-02-30')),/ngày không hợp lệ/);
 assert.throws(()=>create(source+'\n### chu-re.ten-ngan\nKhác\n'),/Khóa bị trùng/);
 assert.throws(()=>create(edit(source,'chu-re.ten-ngan','{{website.tieu-de}}')).text('website.tieu-de'),/Tham chiếu vòng/);
});
test('Executable URL schemes cannot be injected through Markdown',()=>{
 assert.throws(()=>create(edit(source,'lien-ket.chat','javascript:alert(1)')).url('lien-ket.chat'),/Đường dẫn không hợp lệ/);
});
test('Vietnamese headings and references resolve to the same internal values',()=>{
 let markdown=source.replace('### chu-re.ten-ngan','### Tên chú rể\n<!-- Trường dữ liệu: chu-re.ten-ngan -->');
 markdown=markdown.replaceAll('{{chu-re.ten-ngan}}','{{Tên chú rể}}');
 const content=create(markdown);
 assert.equal(content.text('Tên chú rể'),content.text('chu-re.ten-ngan'));
 assert.equal(content.text('website.tieu-de'),create(source).text('website.tieu-de'));
 assert.equal(content.rows('Gợi ý lời chúc',1)[1][0],create(source).rows('Gợi ý lời chúc',1)[1][0]);
});
test('A blank optional link can hide the footer or chat',()=>{
 const content=create(edit(source,'lien-ket.footer',''));
 assert.equal(content.url('lien-ket.footer'),'');
});
test('Personal content renders with fixed UI fields omitted from Markdown',()=>{
 const reduced=source.replace(/\n### (?:ui\.|nhan\.)[^\n]+\n[\s\S]*?(?=\n##|$)/g,'\n');
 const content=create(reduced);
 assert.equal(content.text('chu-re.ho-ten'),create(source).text('chu-re.ho-ten'));
 assert.equal(content.text('ui.phat-nhac'),'Phát nhạc');
 assert.equal(content.text('nhan.hop-qua-mung'),'Hộp Quà Mừng');
 assert.equal(content.album.length,8);
});
test('Vietnamese headings work without technical comments',()=>{
 let markdown=source.replace('### co-dau.vai-ve','### Vai vế của cô dâu trong gia đình');
 markdown=markdown.replace('### chu-re.ten-ngan','### Tên chú rể').replaceAll('{{chu-re.ten-ngan}}','{{Tên chú rể}}');
 const content=create(markdown);
 assert.equal(content.text('co-dau.vai-ve'),create(source).text('co-dau.vai-ve'));
 assert.equal(content.text('website.tieu-de'),create(source).text('website.tieu-de'));
 assert.equal(parse(markdown).fields['chu-re.ten-ngan'],parse(source).fields['chu-re.ten-ngan']);
});

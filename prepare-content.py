"""One-time migration of the retained invitation into an editable Markdown source."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import html, json, re, shutil, unicodedata

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Node:
    def __init__(self, tag='', attrs=None, text='', kind='tag', parent=None):
        self.tag, self.attrs, self.text, self.kind, self.parent = tag, dict(attrs or []), text, kind, parent
        self.children=[]
    def descendants(self):
        yield self
        for c in self.children: yield from c.descendants()
    def ancestors(self):
        p=self.parent
        while p: yield p; p=p.parent
    def content(self):
        return self.text if self.kind=='text' else ''.join(c.content() for c in self.children)
    def render(self):
        if self.kind=='text': return self.text if self.parent and self.parent.tag in ['style','script'] else html.escape(self.text,quote=False)
        if self.kind=='comment':return '<!--'+self.text+'-->'
        if self.kind=='doctype':return '<!'+self.text+'>'
        if not self.tag:return ''.join(c.render() for c in self.children)
        names={'viewbox':'viewBox','preserveaspectratio':'preserveAspectRatio','gradientunits':'gradientUnits','gradienttransform':'gradientTransform'}
        attrs=''.join(' '+names.get(k,k)+(('="'+html.escape(v,quote=True)+'"') if v is not None else '') for k,v in self.attrs.items())
        return '<'+self.tag+attrs+'>'+('' if self.tag in VOID else ''.join(c.render() for c in self.children)+'</'+self.tag+'>')

class Parser(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
    def add(self,n):n.parent=self.stack[-1];n.parent.children.append(n)
    def handle_starttag(self,t,a):
        n=Node(t,a);self.add(n)
        if t not in VOID:self.stack.append(n)
    def handle_startendtag(self,t,a):self.add(Node(t,a))
    def handle_endtag(self,t):
        if any(n.tag==t for n in self.stack):
            while self.stack[-1].tag!=t:self.stack.pop()
            self.stack.pop()
    def handle_data(self,d):self.add(Node(text=d,kind='text'))
    def handle_comment(self,d):self.add(Node(text=d,kind='comment'))
    def handle_decl(self,d):self.add(Node(text=d,kind='doctype'))

original=DIST/'index.html'
backup=ROOT/'source'/'before-markdown.html'
if backup.exists():raise SystemExit('Migration already applied; edit dist/noi-dung.md instead.')
shutil.copy2(original,backup)
parser=Parser();parser.feed(original.read_text(encoding='utf-8'));root=parser.root
nodes=list(root.descendants())
manifest=json.loads((ROOT/'asset-manifest.json').read_text(encoding='utf-8'))
old_asset=(DIST/'assets').resolve();new_asset=(DIST/'asset').resolve()
assert old_asset.parent==DIST.resolve() and new_asset.parent==DIST.resolve()
old_asset.rename(new_asset)
aliases={}
for n in nodes:
    src=n.attrs.get('src','')
    if not src.startswith('./assets/'):continue
    alt=n.attrs.get('alt','')
    if alt=='Minh Quân':name='chu-re.webp'
    elif alt=='Thu Hà':name='co-dau.webp'
    elif alt.startswith('Wedding photo '):name='album-'+alt.split()[-1]+'.webp'
    elif alt.startswith('QR - Chú Rể'):name='qr-chu-re.png'
    elif alt.startswith('QR - Cô Dâu'):name='qr-co-dau.png'
    elif n.tag=='audio':name='nhac-nen.mp3'
    else:
        url=next((u for u,p in manifest.items() if './'+p==src),'')
        if '/images/' in url:
            parts=unquote(url.split('/images/')[1]).split('/')
            name='trang-tri-'+'-'.join(parts[-2:])
        else:continue
    aliases.setdefault(src,'./asset/'+name)
for old,new in aliases.items():
    src=new_asset/Path(old).name;dest=DIST/new[2:]
    if src!=dest:src.rename(dest)
for n in nodes:
    for attr,value in list(n.attrs.items()):
        if value:
            for old,new in aliases.items():value=value.replace(old,new)
            n.attrs[attr]=value.replace('./assets/','./asset/')
css=(DIST/'original.css').read_text(encoding='utf-8').replace('./assets/','./asset/')
(DIST/'original.css').write_text(css,encoding='utf-8')
for u,p in manifest.items():manifest[u]=aliases.get('./'+p,'./'+p.replace('assets/','asset/'))[2:]
(ROOT/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

fields={
 'website.tieu-de':'{{chu-re.ten-ngan}} & {{co-dau.ten-ngan}} — Hoa Mộc Xanh',
 'chu-re.ten-ngan':'Minh Quân','chu-re.ho-ten':'Trần Minh Quân','chu-re.vai-ve':'Trưởng Nam',
 'co-dau.ten-ngan':'Thu Hà','co-dau.ho-ten':'Nguyễn Thu Hà','co-dau.vai-ve':'Út Nữ',
 'nha-trai.bo':'Trần Văn Hùng','nha-trai.me':'Hạm Thị Lan','nha-trai.dia-chi':'25 Ngõ 12 Đặng Văn Ngữ, Đống Đa, Hà Nội',
 'nha-gai.bo':'Nguyễn Văn Bình','nha-gai.me':'Phan Thị Hương','nha-gai.dia-chi':'18 Ngõ 86 Chùa Hà, Cầu Giấy, Hà Nội',
 'le-cuoi.ngay':'2026-05-24','le-cuoi.gio':'09:00','le-cuoi.am-lich':'Tức ngày 8 tháng 4 năm Bính Ngọ',
 'le-cuoi.dia-diem':'LỄ THÀNH HÔN ĐƯỢC CỬ HÀNH TẠI\nTƯ GIA',
 'tiec-cuoi.ngay':'2026-05-24','tiec-cuoi.gio':'18:00','tiec-cuoi.ket-thuc':'20:00','tiec-cuoi.don-khach':'17:30',
 'tiec-cuoi.am-lich':'{{le-cuoi.am-lich}}','tiec-cuoi.dia-diem':'Tiệc Cưới Hoàng Gia, Ngõ 74 P. Nguyễn Thị Định, Nhân Chính, Thanh Xuân, Hà Nội',
 'loi-moi':'TRÂN TRỌNG BÁO TIN\nLỄ THÀNH HÔN CỦA CON CHÚNG TÔI',
 'loi-cam-on':'Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!',
 'lien-ket.mo-thiep':'?open=1','lien-ket.ban-do':'tu-dong','lien-ket.chi-duong':'tu-dong','lien-ket.lich':'tu-dong',
 'lien-ket.footer':'https://chungdoi.com','footer.ten':'chungdoi.com','lien-ket.chat':'https://m.me/470216759513444',
 'chat.hien-thi':'true','nhac.hien-thi':'true',
 'ngan-hang.chu-re.tieu-de':'Chú Rể - {{ngan-hang.chu-re.chu-tai-khoan}}','ngan-hang.chu-re.ten':'Vietcombank',
 'ngan-hang.chu-re.so-tai-khoan':'0000000000','ngan-hang.chu-re.chu-tai-khoan':'THIEP CUOI DEMO',
 'ngan-hang.co-dau.tieu-de':'Cô Dâu - {{co-dau.ho-ten}}','ngan-hang.co-dau.ten':'BIDV',
 'ngan-hang.co-dau.so-tai-khoan':'6665558888','ngan-hang.co-dau.chu-tai-khoan':'{{co-dau.ho-ten}}',
 'ui.phat-nhac':'Phát nhạc','ui.dung-nhac':'Tạm dừng nhạc','ui.nut-nhac':'♫','ui.loi-phat-nhac':'Nhấn để phát nhạc.',
 'ui.xem-anh':'Xem ảnh cưới {{so}}','ui.anh-cuoi':'Ảnh cưới {{so}}','ui.anh-nho':'Thumbnail {{so}}',
 'ui.ten':'Tên của bạn','ui.loi-chuc':'Lời chúc của bạn','ui.goi-y':'Gợi ý lời chúc',
 'ui.loi-chuc-thanh-cong':'Đã lưu lời chúc trên trình duyệt này.','ui.loi-chuc-loi':'Không lưu được lời chúc. Vui lòng kiểm tra dung lượng trình duyệt.',
 'ui.rsvp.tieu-de':'Xác nhận tham dự','ui.rsvp.mo-ta':'Sự hiện diện của bạn là niềm vinh hạnh cho gia đình chúng tôi. Xin xác nhận để chúng tôi chuẩn bị chu đáo nhất.',
 'ui.rsvp.cau-hoi':'Bạn sẽ đến chứ?','ui.rsvp.co':'Tôi sẽ đến','ui.rsvp.khong':'Rất tiếc, tôi không thể đến',
 'ui.rsvp.so-nguoi':'Số người tham dự','ui.rsvp.gui':'Gửi xác nhận','ui.rsvp.ghi-chu':'Thông tin được lưu trên trình duyệt này.',
 'ui.rsvp.thanh-cong':'Đã lưu xác nhận tham dự trên trình duyệt này.','ui.rsvp.loi':'Không lưu được xác nhận.',
 'ui.dong':'Đóng','ui.chat':'Chat với Chung Đôi','ui.an-chat':'Ẩn chat','ui.ten-file-qr':'ma-qr-mung-cuoi.png',
 'ui.dem-nguoc':'Cùng đếm ngược','ui.ngay':'Ngày','ui.gio':'Giờ','ui.phut':'Phút','ui.giay':'Giây',
 'ui.thang':'Tháng','ui.ngay-tuan':'T2, T3, T4, T5, T6, T7, CN',
 'ui.thu-day-du':'CHỦ NHẬT, THỨ HAI, THỨ BA, THỨ TƯ, THỨ NĂM, THỨ SÁU, THỨ BẢY',
}
text_map={
 'Minh Quân':'chu-re.ten-ngan','Thu Hà':'co-dau.ten-ngan','Trần Minh Quân':'chu-re.ho-ten','Nguyễn Thu Hà':'co-dau.ho-ten',
 'Trưởng Nam':'chu-re.vai-ve','Út Nữ':'co-dau.vai-ve','Trần Văn Hùng':'nha-trai.bo','Hạm Thị Lan':'nha-trai.me',
 'Nguyễn Văn Bình':'nha-gai.bo','Phan Thị Hương':'nha-gai.me',
 fields['nha-trai.dia-chi']:'nha-trai.dia-chi',fields['nha-gai.dia-chi']:'nha-gai.dia-chi',
 fields['loi-moi']:'loi-moi',fields['loi-cam-on']:'loi-cam-on',fields['le-cuoi.dia-diem']:'le-cuoi.dia-diem',
 fields['tiec-cuoi.dia-diem']:'tiec-cuoi.dia-diem',
 '09:00':'le-cuoi.gio','17:30':'tiec-cuoi.don-khach','18:00':'tiec-cuoi.gio',
 '24 tháng 5, 2026':'bia.ngay','CHỦ NHẬT':'ngay.thu','24':'ngay.so','THÁNG 05':'ngay.thang','2026':'ngay.nam',
 'Tức ngày 8 tháng 4 năm Bính Ngọ':'ngay.am-lich','Tháng 5 / 2026':'lich.thang',
 'Chú Rể - THIEP CUOI DEMO':'ngan-hang.chu-re.tieu-de','Vietcombank':'ngan-hang.chu-re.ten',
 '0000000000':'ngan-hang.chu-re.so-tai-khoan','THIEP CUOI DEMO':'ngan-hang.chu-re.chu-tai-khoan',
 'Cô Dâu - Nguyễn Thu Hà':'ngan-hang.co-dau.tieu-de','BIDV':'ngan-hang.co-dau.ten','6665558888':'ngan-hang.co-dau.so-tai-khoan',
 'chungdoi.com':'footer.ten','Cùng đếm ngược':'ui.dem-nguoc',
}
fields['bia.ngay']='{{tiec-cuoi.ngay-dai}}'

def slug(s):
    s=unicodedata.normalize('NFKD',s.lower().replace('đ','d'))
    s=''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')[:65] or 'ky-hieu'

def new_field(value,prefix='nhan'):
    for k,v in fields.items():
        if v==value:return k
    key=prefix+'.'+slug(value);base=key;i=2
    while key in fields:key=base+'-'+str(i);i+=1
    fields[key]=value;return key

# Mark repeatable blocks before clearing the template text.
timeline=next(n for n in nodes if n.tag=='ol');timeline.attrs['data-timeline']=''
timeline_rows=[]
for n in timeline.children:
    if n.tag=='li':
        texts=[x.text.strip() for x in n.descendants() if x.kind=='text' and x.text.strip()]
        timeline_rows.append(texts)
guestbook=next(n for n in nodes if n.attrs.get('data-landing-screenshot-id')=='invite-guestbook')
guest_form=next(n for n in guestbook.children if n.tag=='form')
wishes=guestbook.children[guestbook.children.index(guest_form)+1];wishes.attrs['data-wishes']=''
wish_rows=[]
for card in wishes.children:
    if card.tag=='div':
        texts=[x.text.strip() for x in card.descendants() if x.kind=='text' and x.text.strip()]
        texts[1]=texts[1].replace('6:','13:',1);wish_rows.append(texts)
calendar_title=next(n for n in nodes if n.kind=='text' and n.text=='Tháng 5 / 2026').parent
calendar=calendar_title.parent;calendar.attrs['data-calendar']=''
calendar_title.attrs['data-calendar-title']=''
grid=next(n for n in calendar.children if 'grid-cols-7' in n.attrs.get('class',''));grid.attrs['data-calendar-grid']=''
countdown=next(n for n in nodes if n.kind=='text' and n.text=='Đang tính toán...').parent.parent.parent
countdown.attrs['data-countdown']=''
dress=next(n for n in nodes if n.kind=='text' and n.text=='DRESS CODE')
dress_root=next(n for n in dress.ancestors() if n.tag=='div' and 'py-10' in n.attrs.get('class',''));dress_root.attrs['data-dress-code']=''
colors=[n.attrs.get('style','') for n in dress_root.descendants() if 'background-color:' in n.attrs.get('style','')]
dress_colors=[re.search(r'background-color:([^;]+)',s)[1] for s in colors]

photo_nodes=[n for n in nodes if n.tag=='img' and n.attrs.get('alt','').startswith('Wedding photo ')]
gallery=photo_nodes[0].parent.parent;gallery.attrs['data-gallery']=''
gallery.parent.parent.children[-1].attrs['data-gallery-counter']=''
lightbox=next(n for n in nodes if n.tag=='button' and n.attrs.get('aria-label')=='Close lightbox')
lightbox_dialog=next(n for n in lightbox.ancestors() if n.tag=='dialog');lightbox_dialog.attrs['data-lightbox']=''
light_image=next(n for n in lightbox_dialog.descendants() if n.tag=='img' and n.attrs.get('alt','').startswith('Ảnh cưới'))
light_image.attrs['data-lightbox-image']=''
thumbnails=next(n for n in lightbox_dialog.descendants() if n.tag=='button' and n.attrs.get('aria-label','').startswith('View image')).parent
thumbnails.attrs['data-thumbnails']=''
light_counter=next(n for n in lightbox_dialog.descendants() if 'bg-black/40' in n.attrs.get('class',''));light_counter.attrs['data-lightbox-counter']=''
gift_button=next(n for n in nodes if n.attrs.get('aria-label')=='Mở hộp mừng cưới');gift_button.attrs['data-open-gift']=''
gift_dialog=next(n for n in gift_button.parent.children if n.tag=='dialog');gift_dialog.attrs['data-gift-dialog']=''
rsvp_button=next(n for n in nodes if n.kind=='text' and n.text=='XÁC NHẬN THAM DỰ')
next(n for n in rsvp_button.ancestors() if n.tag=='button').attrs['data-open-rsvp']=''
cover_link=next(n for n in nodes if n.tag=='a' and n.attrs.get('href')=='?open=1');cover_link.attrs['data-open-invitation']=''
album=[]
for img in photo_nodes:
    album.append([img.attrs['src'],img.attrs['alt'],img.attrs.get('style','').split('object-position:')[-1]])

media={}
for n in nodes:
    if n.tag not in ['img','audio']:continue
    src=n.attrs.get('src','')
    if n in photo_nodes or any(p==lightbox_dialog for p in n.ancestors()):continue
    name=Path(src).stem
    key='media.'+name
    if key not in media:media[key]='!['+(n.attrs.get('alt',''))+']('+src+')'
    n.attrs['data-media']=key;n.attrs['src']=''
    if n.tag=='img':n.attrs['alt']=''

for n in nodes:
    if n.tag=='a':
        href=n.attrs.get('href','')
        key='lien-ket.mo-thiep' if n==cover_link else 'lien-ket.lich' if '/calendar/' in href else 'lien-ket.chi-duong' if '/maps/dir' in href else 'lien-ket.footer'
        n.attrs['data-href']=key;n.attrs['href']='#'
    if n.tag=='iframe':n.attrs['data-src']='lien-ket.ban-do';n.attrs['src']='about:blank';n.attrs['title']=''
    for attr in ['placeholder','aria-label','title']:
        value=n.attrs.get(attr,'')
        if value and n.tag not in ['link']:
            key=new_field(value,'nhan');n.attrs['data-attr-'+attr]=key;n.attrs[attr]=''

skip_roots=[timeline,wishes,grid,gallery,thumbnails,light_counter,countdown]
for n in nodes:
    if n.kind!='text' or not n.text.strip():continue
    ancestors=list(n.ancestors())
    if any(p.tag in ['style','script','svg'] for p in ancestors):continue
    if any(p in skip_roots for p in ancestors):continue
    if n.parent.tag=='title':n.parent.attrs['data-text']='website.tieu-de';n.text='';continue
    value=n.text.strip();key=text_map.get(value)
    reception=any(p.attrs.get('data-landing-screenshot-id')=='invite-reception' for p in ancestors)
    if key and key.startswith('ngay.'):
        suffix={'thu':'thu','so':'ngay-so','thang':'thang-nhan','nam':'nam','am-lich':'am-lich'}[key.split('.')[-1]]
        key=('tiec-cuoi.' if reception else 'le-cuoi.')+suffix
    elif key=='lich.thang':key='lich.tieu-de'
    if not key:key=new_field(value)
    if key not in fields:fields[key]=value
    if n.parent.tag=='span' and len([c for c in n.parent.children if c.kind=='text' and c.text.strip()])==1:
        n.parent.attrs['data-text']=key;n.text=''
    else:
        binding=Node('span',{'data-text':key},parent=n.parent)
        n.parent.children[n.parent.children.index(n)]=binding

# Clear all repeatable seed values; their sources live in the Markdown tables.
for block in skip_roots:
    for n in block.descendants():
        if n.kind=='text' and not any(p.tag in ['svg','style'] for p in n.ancestors()):n.text=''
        if n.tag=='img':n.attrs['src']='';n.attrs['alt']=''

script=next(n for n in nodes if n.tag=='script' and n.attrs.get('src')=='./local.js')
script.attrs['type']='module';script.attrs['src']='./content-loader.js'
html_node=next(n for n in nodes if n.tag=='html');html_node.attrs['data-content-loading']='true'
root_text=root.render()
original.write_text(root_text,encoding='utf-8')
(ROOT/'source'/'layout-markdown.html').write_text(root_text,encoding='utf-8')

intro='''# Nội dung thiệp cưới Hoa Mộc Xanh

Sửa nội dung bên dưới các dòng `###`, lưu file rồi tải lại trang (F5).
Giữ nguyên tên khóa sau `###`. Giá trị có thể nhiều dòng. `{{...}}` lấy nội dung từ khóa khác: đổi tên một lần sẽ cập nhật các vị trí liên quan.
Ảnh và nhạc đặt trong thư mục `asset` ngay cạnh file này. Đường dẫn viết `./asset/ten-file.webp`, `./asset/ten-file.jpg`, `./asset/nhac.mp3`.
Tên file có khoảng trắng nên thay bằng dấu gạch ngang. Dữ liệu văn bản hiển thị nguyên văn, không chèn HTML.
Ngày dùng `YYYY-MM-DD`; giờ dùng `HH:MM` theo giờ Việt Nam. Ngày, thứ, lịch tháng và liên kết lịch được tính tự động. Ngày âm lịch nhập thủ công.
Các liên kết bản đồ/chỉ đường/lịch có giá trị `tu-dong` sẽ được tạo từ thông tin tiệc; có thể thay bằng URL riêng.
QR được đọc từ ảnh: khi đổi tài khoản ngân hàng, cần thay ảnh QR tương ứng.
Các bảng có thể thêm hoặc xóa dòng. Giữ nguyên dòng tiêu đề và các cột; dùng `\\|` nếu nội dung cần ký tự `|`.

'''
out=[intro]
groups=[('Thông tin cô dâu, chú rể và gia đình',lambda k:k.startswith(('website.','chu-re.','co-dau.','nha-trai.','nha-gai.'))),
 ('Ngày giờ và lời mời',lambda k:k.startswith(('le-cuoi.','tiec-cuoi.','bia.')) or k in ['loi-moi','loi-cam-on']),
 ('Liên kết và hiển thị',lambda k:k.startswith(('lien-ket.','chat.','nhac.','footer.'))),
 ('Ngân hàng',lambda k:k.startswith('ngan-hang.')),
 ('Nhãn giao diện và thông báo',lambda k:k.startswith(('ui.','nhan.')))]
derived=['le-cuoi.thu','le-cuoi.ngay-so','le-cuoi.thang-nhan','le-cuoi.nam','tiec-cuoi.thu','tiec-cuoi.ngay-so','tiec-cuoi.thang-nhan','tiec-cuoi.nam','lich.tieu-de']
for title,pred in groups:
    out.append('## '+title+'\n\n')
    for k,v in fields.items():
        if pred(k) and k not in derived:out.append('### '+k+'\n\n'+v+'\n\n')
out.append('## Ảnh và nhạc\n\n<!-- Mỗi ảnh là ![mô tả](đường-dẫn). Nhạc dùng cùng cú pháp. -->\n\n')
for k,v in media.items():out.append('### '+k+'\n\n'+v+'\n\n')
def cell(s):return s.replace('|','\\|').replace('\n','<br>')
def table(title,cols,rows):
    out.append('## '+title+'\n\n| '+' | '.join(cols)+' |\n| '+' | '.join('---' for _ in cols)+' |\n')
    for row in rows:out.append('| '+' | '.join(cell(str(c)) for c in row)+' |\n')
    out.append('\n')
table('Album ảnh',['Ảnh','Mô tả','Vị trí ảnh'],album)
table('Lịch trình',['Giờ','Hoạt động'],timeline_rows)
table('Lời chúc ban đầu',['Tên','Thời gian','Lời chúc'],wish_rows)
table('Gợi ý lời chúc',['Lời chúc'],[
 ['Chúc hai bạn trăm năm hạnh phúc, luôn yêu thương và đồng hành cùng nhau!'],
 ['Chúc {{chu-re.ten-ngan}} và {{co-dau.ten-ngan}} một đời bình an, hạnh phúc và ngập tràn tiếng cười!'],
 ['Mừng ngày trọng đại! Chúc hai bạn mãi giữ trọn tình yêu như thuở ban đầu.']])
table('Màu trang phục',['Màu'],[[c] for c in dress_colors])
(DIST/'noi-dung.md').write_text(''.join(out),encoding='utf-8')
print(f'Migrated {len(fields)} text settings, {len(media)} media settings, {len(album)} album images.')

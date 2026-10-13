"""Give the editable Markdown clear Vietnamese labels without changing its values."""
from pathlib import Path
import json, re
root=Path(__file__).resolve().parent
target=root/'dist'/'noi-dung.md'
original=target.read_text(encoding='utf-8')
labels={
'website.tieu-de':'Tiêu đề của trang web',
'chu-re.ten-ngan':'Tên chú rể','chu-re.ho-ten':'Họ và tên chú rể','chu-re.vai-ve':'Vai vế của chú rể trong gia đình',
'co-dau.ten-ngan':'Tên cô dâu','co-dau.ho-ten':'Họ và tên cô dâu','co-dau.vai-ve':'Vai vế của cô dâu trong gia đình',
'nha-trai.bo':'Họ và tên bố chú rể','nha-trai.me':'Họ và tên mẹ chú rể','nha-trai.dia-chi':'Địa chỉ nhà trai',
'nha-gai.bo':'Họ và tên bố cô dâu','nha-gai.me':'Họ và tên mẹ cô dâu','nha-gai.dia-chi':'Địa chỉ nhà gái',
'le-cuoi.ngay':'Ngày tổ chức lễ cưới','le-cuoi.gio':'Giờ tổ chức lễ cưới','le-cuoi.am-lich':'Ngày âm lịch của lễ cưới','le-cuoi.dia-diem':'Nơi cử hành lễ cưới',
'tiec-cuoi.ngay':'Ngày tổ chức tiệc cưới','tiec-cuoi.gio':'Giờ bắt đầu tiệc cưới','tiec-cuoi.ket-thuc':'Giờ kết thúc tiệc cưới','tiec-cuoi.don-khach':'Giờ đón khách dự tiệc',
'tiec-cuoi.am-lich':'Ngày âm lịch của tiệc cưới','tiec-cuoi.dia-diem':'Địa điểm và địa chỉ tổ chức tiệc cưới',
'loi-moi':'Lời mời dự lễ cưới','loi-cam-on':'Lời cảm ơn cuối thiệp','bia.ngay':'Ngày hiển thị trên bìa thiệp',
'lien-ket.mo-thiep':'Liên kết khi mở thiệp','lien-ket.ban-do':'Liên kết bản đồ địa điểm','lien-ket.chi-duong':'Liên kết chỉ đường đến tiệc cưới',
'lien-ket.lich':'Liên kết thêm sự kiện vào lịch','lien-ket.footer':'Liên kết ở cuối trang','footer.ten':'Tên hiển thị ở cuối trang',
'lien-ket.chat':'Liên kết trò chuyện','chat.hien-thi':'Bật hoặc tắt nút trò chuyện','nhac.hien-thi':'Bật hoặc tắt nhạc nền',
'ngan-hang.chu-re.tieu-de':'Tiêu đề tài khoản nhận quà của chú rể','ngan-hang.chu-re.ten':'Tên ngân hàng của chú rể',
'ngan-hang.chu-re.so-tai-khoan':'Số tài khoản ngân hàng của chú rể','ngan-hang.chu-re.chu-tai-khoan':'Tên chủ tài khoản của chú rể',
'ngan-hang.co-dau.tieu-de':'Tiêu đề tài khoản nhận quà của cô dâu','ngan-hang.co-dau.ten':'Tên ngân hàng của cô dâu',
'ngan-hang.co-dau.so-tai-khoan':'Số tài khoản ngân hàng của cô dâu','ngan-hang.co-dau.chu-tai-khoan':'Tên chủ tài khoản của cô dâu',
'ui.phat-nhac':'Chữ trên nút phát nhạc','ui.dung-nhac':'Chữ trên nút tạm dừng nhạc','ui.nut-nhac':'Biểu tượng của nút nhạc',
'ui.loi-phat-nhac':'Thông báo khi cần nhấn để phát nhạc','ui.xem-anh':'Tên nút xem ảnh cưới','ui.anh-cuoi':'Mô tả ảnh cưới phóng to','ui.anh-nho':'Mô tả ảnh thu nhỏ',
'ui.ten':'Nhãn ô nhập tên khách mời','ui.loi-chuc':'Nhãn ô nhập lời chúc','ui.goi-y':'Tên nút gợi ý lời chúc',
'ui.loi-chuc-thanh-cong':'Thông báo lưu lời chúc thành công','ui.loi-chuc-loi':'Thông báo khi không lưu được lời chúc',
'ui.rsvp.tieu-de':'Tiêu đề hộp xác nhận tham dự','ui.rsvp.mo-ta':'Lời nhắn trong hộp xác nhận tham dự','ui.rsvp.cau-hoi':'Câu hỏi xác nhận khách có đến hay không',
'ui.rsvp.co':'Lựa chọn xác nhận sẽ đến','ui.rsvp.khong':'Lựa chọn xác nhận không thể đến','ui.rsvp.so-nguoi':'Nhãn số người tham dự',
'ui.rsvp.gui':'Chữ trên nút gửi xác nhận','ui.rsvp.ghi-chu':'Ghi chú dưới mẫu xác nhận tham dự','ui.rsvp.thanh-cong':'Thông báo lưu xác nhận thành công','ui.rsvp.loi':'Thông báo khi không lưu được xác nhận',
'ui.dong':'Tên nút đóng hộp thoại','ui.chat':'Tên nút trò chuyện','ui.an-chat':'Tên nút ẩn trò chuyện','ui.ten-file-qr':'Tên tệp khi tải ảnh mã QR',
'ui.dem-nguoc':'Tiêu đề phần đếm ngược đến tiệc cưới','ui.ngay':'Tên đơn vị ngày trong đếm ngược','ui.gio':'Tên đơn vị giờ trong đếm ngược',
'ui.phut':'Tên đơn vị phút trong đếm ngược','ui.giay':'Tên đơn vị giây trong đếm ngược','ui.thang':'Tên đơn vị tháng trong lịch',
'ui.ngay-tuan':'Tên viết tắt của các ngày trong tuần','ui.thu-day-du':'Tên đầy đủ của các ngày trong tuần',
'nhan.previous-photo':'Tên nút chuyển đến ảnh trước trong album','nhan.next-photo':'Tên nút chuyển đến ảnh tiếp theo trong album',
'nhan.nhap-ten-cua-ban':'Chữ gợi ý trong ô nhập tên','nhan.nhap-loi-chuc-cua-ban':'Chữ gợi ý trong ô nhập lời chúc','nhan.tao-loi-chuc-bang-ai':'Chú thích của nút gợi ý lời chúc',
'nhan.mo-hop-mung-cuoi':'Tên nút mở hộp mừng cưới','nhan.close-lightbox':'Tên nút đóng ảnh phóng to',
'nhan.previous-image':'Tên nút ảnh trước khi xem phóng to','nhan.next-image':'Tên nút ảnh tiếp theo khi xem phóng to',
'nhan.ky-hieu':'Dấu nối giữa tên cô dâu và chú rể','nhan.ky-hieu-2':'Biểu tượng trang trí trên bìa thiệp',
'nhan.than-moi':'Lời chào trên bìa thiệp','nhan.mo-thiep':'Chữ trên nút mở thiệp','nhan.thong-tin-le-cuoi':'Tiêu đề phần thông tin lễ cưới',
'nhan.ong-ba':'Cách xưng hô với bố mẹ hai bên','nhan.vao-luc':'Chữ đứng trước giờ cử hành lễ cưới',
'nhan.ky-hieu-3':'Dấu phân cách trong ngày cưới','nhan.ky-hieu-4':'Dấu mở ngoặc cho ngày âm lịch','nhan.ky-hieu-5':'Dấu đóng ngoặc cho ngày âm lịch',
'nhan.album-anh':'Tiêu đề album ảnh cưới','nhan.ky-hieu-6':'Dấu phân cách số ảnh',
'nhan.thong-tin-tiec-cuoi':'Tiêu đề phần thông tin tiệc cưới','nhan.tiec-cuoi-se-dien-ra-vao-luc':'Lời dẫn thời gian tổ chức tiệc',
'nhan.don-khach':'Nhãn giờ đón khách','nhan.khai-tiec':'Nhãn giờ khai tiệc','nhan.them-vao-lich':'Chữ trên nút thêm vào lịch',
'nhan.xac-nhan-tham-du':'Chữ trên nút mở xác nhận tham dự','nhan.tiec-cuoi-se-to-chuc-tai':'Lời dẫn địa điểm tổ chức tiệc',
'nhan.chi-duong':'Chữ trên nút chỉ đường','nhan.dress-code':'Tiêu đề phần quy định trang phục','nhan.trang-phuc-du-tiec':'Lời nhắn về trang phục dự tiệc',
'nhan.lich-trinh-ngay-cuoi':'Tiêu đề lịch trình ngày cưới','nhan.so-luu-but':'Tiêu đề sổ lưu bút','nhan.ky-hieu-7':'Biểu tượng nút gợi ý lời chúc',
'nhan.gui-loi-chuc':'Chữ trên nút gửi lời chúc','nhan.hop-qua-mung':'Tiêu đề hộp quà mừng cưới','nhan.ky-hieu-8':'Biểu tượng lấp lánh của hộp quà',
'nhan.nhan-de-mo':'Lời nhắc nhấn mở hộp quà','nhan.luu-qr':'Chữ trên nút lưu mã QR','nhan.close':'Chữ trên nút đóng nền hộp thoại',
'nhan.ky-hieu-9':'Biểu tượng trái tim ở cuối trang','nhan.ky-hieu-10':'Biểu tượng đóng ảnh phóng to',
'nhan.ky-hieu-11':'Biểu tượng mũi tên chuyển ảnh trước','nhan.ky-hieu-12':'Biểu tượng mũi tên chuyển ảnh tiếp theo',
'media.trang-tri-boho-floral-green-flower':'Ảnh hoa trang trí ở hai góc thiệp','media.trang-tri-boho-floral-green-decoration_bar':'Ảnh dải trang trí màu xanh',
'media.chu-re':'Ảnh chân dung chú rể','media.co-dau':'Ảnh chân dung cô dâu',
'media.trang-tri-mini-porcelain_blue':'Ảnh hộp quà nhỏ màu xanh trắng','media.trang-tri-mini-dragon_phoenix_v4_red':'Ảnh hộp quà nhỏ màu đỏ họa tiết rồng phượng',
'media.trang-tri-mini-lien_hoa_v2_green':'Ảnh hộp quà nhỏ màu xanh họa tiết hoa sen','media.trang-tri-mini-minimalism_green':'Ảnh hộp quà nhỏ màu xanh đơn giản',
'media.trang-tri-giftbox-boho_floral_green':'Ảnh hộp quà mừng cưới chính','media.trang-tri-mini-royal_v2_green':'Ảnh hộp quà nhỏ họa tiết hoàng gia',
'media.trang-tri-mini-hoa_tinh_red':'Ảnh hộp quà nhỏ họa tiết hoa màu đỏ','media.trang-tri-mini-minimalism_darkblue':'Ảnh hộp quà nhỏ màu xanh đậm',
'media.qr-chu-re':'Ảnh mã QR nhận quà của chú rể','media.qr-co-dau':'Ảnh mã QR nhận quà của cô dâu','media.nhac-nen':'Tệp nhạc nền của thiệp',
}
keys=re.findall(r'^### ([\w.-]+)$',original,re.M)
missing=[k for k in keys if k not in labels]
if missing:raise SystemExit('Missing labels: '+str(missing))
if len(set(labels.values()))!=len(labels):raise SystemExit('Duplicate Vietnamese label')
backup=root/'source'/'before-vietnamese-headings.md'
if not backup.exists():backup.write_text(original,encoding='utf-8')
# Store old data for the equivalence check; the website does not read this backup.
special={'tiec-cuoi.ngay-dai':'Ngày tiệc cưới viết đầy đủ','le-cuoi.ngay-dai':'Ngày lễ cưới viết đầy đủ','so':'Số thứ tự ảnh'}
text=re.sub(r'\{\{([^{}]+)\}\}',lambda m:'{{'+labels.get(m[1],special.get(m[1],m[1]))+'}}',original)
text=re.sub(r'^### ([\w.-]+)$',lambda m:'### '+labels[m[1]]+'\n<!-- Trường dữ liệu: '+m[1]+' -->',text,flags=re.M)
intro='''# Nội dung thiệp cưới Hoa Mộc Xanh

Bạn chỉ cần sửa nội dung bên dưới tiêu đề, lưu tệp rồi nhấn F5 trên website.
Giữ nguyên tiêu đề và dòng chú thích `<!-- Trường dữ liệu: ... -->`; dòng này giúp website nhận biết nội dung và được ẩn khi xem Markdown.

- Ví dụ: muốn đổi tên chú rể, tìm **Tên chú rể** hoặc **Họ và tên chú rể** rồi sửa dòng bên dưới.
- Những cụm như `{{Tên chú rể}}` tự lấy nội dung từ mục cùng tên. Bạn có thể giữ nguyên hoặc thay bằng chữ muốn hiển thị.
- `{{Ngày tiệc cưới viết đầy đủ}}` tự hiển thị ngày theo dạng “20 tháng 12, 2027”. `{{Số thứ tự ảnh}}` tự điền số ảnh.
- Ảnh và nhạc nằm trong thư mục **asset**, cùng vị trí với tệp này. Ví dụ: `![Ảnh chú rể](./asset/chu-re.jpg)`.
- Ngày nhập theo dạng **năm-tháng-ngày**, ví dụ `2027-12-20`. Giờ nhập dạng `18:00`. Ngày âm lịch cần nhập riêng.
- Với nút nhạc và trò chuyện: `true` nghĩa là **bật**, `false` nghĩa là **tắt**.
- Với liên kết bản đồ, chỉ đường và lịch: `tu-dong` nghĩa là **tự tạo từ thông tin tiệc cưới**; bạn cũng có thể dán đường dẫn riêng.
- Khi đổi tài khoản ngân hàng, hãy thay cả ảnh mã QR tương ứng.
- Với bảng album, lịch trình hoặc lời chúc: thêm/xóa dòng để thêm/xóa mục. Giữ nguyên tên bảng và dòng tên cột. Dùng `\\|` nếu cần ký tự `|`, dùng `<br>` để xuống dòng trong ô.

'''
text=intro+text[text.index('## Thông tin cô dâu'):]
text=re.sub(r'\n{3,}','\n\n',text)
target.write_text(text,encoding='utf-8')
print('Đã đổi '+str(len(keys))+' tiêu đề sang tiếng Việt có dấu.')

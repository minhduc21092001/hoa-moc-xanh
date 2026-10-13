# Thiệp cưới — hướng dẫn cập nhật nội dung

## Khởi chạy

Nhấp đúp `start.cmd`, hoặc chạy `node server.cjs` trong thư mục này.
Mở http://127.0.0.1:4173. Dừng máy chủ bằng Ctrl+C.

## Các tệp bạn cần sửa

- **`dist/noi-dung.md`**: thông tin cô dâu, chú rể, gia đình, ngày giờ, địa điểm, lời mời, nhạc, liên kết, ngân hàng, ảnh, album và lịch trình.
- **`dist/anh-cuoi/`**: toàn bộ ảnh chân dung cô dâu, chú rể và ảnh album cưới.
- **`dist/asset/`**: nhạc, ảnh mã QR, font và ảnh trang trí của giao diện.

Sửa nội dung dưới tiêu đề tiếng Việt, lưu tệp rồi nhấn **F5**. Giữ nguyên các tiêu đề tiếng Việt. Không cần build hoặc khởi động lại máy chủ.

## Thay ảnh cô dâu hoặc chú rể

1. Chép ảnh mới vào `dist/anh-cuoi/`, ví dụ `chu-re-moi.jpg`.
2. Trong Markdown, tìm **Ảnh chân dung chú rể** hoặc **Ảnh chân dung cô dâu**.
3. Thay đường dẫn bên trong dấu ngoặc tròn:

```markdown
![Ảnh chú rể](./anh-cuoi/chu-re-moi.jpg)
```

Các ảnh album cũng đặt trong `dist/anh-cuoi/`. Thêm/xóa dòng trong bảng **Album ảnh** để thêm/xóa ảnh:

```markdown
| Ảnh | Mô tả | Vị trí ảnh |
| --- | --- | --- |
| ./anh-cuoi/anh-cuoi-1.jpg | Ảnh cưới của chúng mình | 50% 50% |
```

**Vị trí ảnh** điều chỉnh điểm cắt ảnh theo chiều ngang/dọc; `50% 50%` là giữa ảnh.
Website tự dùng các đường dẫn này cho cả album, ảnh phóng to và ảnh thu nhỏ.

## Lưu ý khi sửa

- Tên gọi và họ tên là hai mục riêng. Những cụm `{{Tên chú rể}}` tự lấy nội dung từ mục cùng tên.
- Ngày dùng `2027-12-20`, giờ dùng `18:00`. Ngày âm lịch nhập riêng.
- Với nút nhạc và trò chuyện: `true` là bật, `false` là tắt.
- Trong nhóm **Ẩn hoặc hiện các phần**, đặt `true` để hiện hoặc `false` để ẩn album ảnh, xác nhận tham dự, bản đồ, dress code, lịch trình, sổ lưu bút hoặc hộp quà mừng.
- Ở mục **Nhạc nền và liên kết**, chỉ cần dán link chia sẻ vào **Link Google Maps**. Website dùng cùng link cho bản đồ và nút **Chỉ đường**; `server.cjs` tự chuyển link rút gọn `maps.app.goo.gl` thành bản đồ nhúng.
- Liên kết lịch có thể để `tu-dong` hoặc dán URL riêng.
- Khi đổi số tài khoản ngân hàng, cần thay cả ảnh mã QR. QR nằm trong `dist/asset/`.
- Màu trang phục chỉnh trong bảng **Màu trang phục**; lịch trình chỉnh bằng cách thêm/xóa/sửa dòng bảng.
- Lời chúc và xác nhận do khách nhập được lưu trong trình duyệt này.

Các nhãn nút, biểu tượng, thông báo và ảnh trang trí cố định nằm trong `dist/content-defaults.js`, không làm dài file nội dung. Các bản trong `source/` và `tests/` phục vụ phát triển, website không đọc nội dung cá nhân từ đó.

## Kiểm tra và đóng gói

```powershell
node check-content.cjs
node --test tests/content.test.cjs
python build.py --package
```

File ZIP chứa đầy đủ Markdown, thư mục ảnh riêng và mã website. Bản đồ, chỉ đường, lịch và các liên kết bên ngoài cần Internet.

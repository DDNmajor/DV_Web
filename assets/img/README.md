# Thư mục hình ảnh

Thư mục này gần như trống — **ảnh trên trang được nhúng trực tiếp từ nguồn ngoài**,
không lưu trong repo:

| Loại ảnh | Nguồn | Dùng ở trang |
|---|---|---|
| 9 tạo hình toàn thân (`pr-img_01…09`) | `hololive.hololivepro.com` | `index.html`, `profile.html`, `gallery.html` |
| 7 artwork + mô hình 3D | `static.wikitide.net` (CDN của hololive.wiki) | `gallery.html` |
| 30 ảnh trang phục, mô hình 3D, sự kiện, linh vật | `static.wikia.nocookie.net` (CDN của Fandom) | `gallery.html` |
| 8 ảnh bìa nhạc | `hololive.hololivepro.com` | `music.html` |

## `placeholder.svg` — đừng xoá

Đây là ảnh dự phòng. Khi một ảnh ngoài tải lỗi (mất mạng, nguồn đổi đường dẫn),
`assets/js/main.js` tự thay `src` bằng file này nên **bố cục không bao giờ vỡ**.

## Vì sao nhúng từ ngoài thay vì tải về?

- Repo nhẹ, không phải commit hàng chục file PNG.
- Ảnh luôn là bản gốc, độ nét cao.
- Đã kiểm tra bằng `curl`: toàn bộ URL trả **HTTP 200**, nguồn không chặn hotlink.
- Mỗi thẻ `<img>` đều có `referrerpolicy="no-referrer"` để tránh bị chặn theo Referer,
  và `loading="lazy"` cho những ảnh nằm dưới màn hình đầu.

**Đánh đổi:** trang cần có mạng thì ảnh mới hiện. Nếu máy chấm bài không nối mạng,
toàn bộ ảnh sẽ rơi về `placeholder.svg`.

## Nếu muốn chuyển sang ảnh lưu trong repo

1. Tải các file PNG từ trang hồ sơ chính thức về thư mục này.
2. Sửa thuộc tính `src` trong HTML từ URL đầy đủ thành đường dẫn tương đối,
   ví dụ `assets/img/pr-img-01.png`.
3. Đặt tên file **toàn chữ thường** — GitHub Pages phân biệt hoa/thường, Windows thì không.

## Bản quyền

Ảnh thuộc bản quyền COVER Corp. và hoạ sĩ Oshioshio. Trang này dùng cho mục đích
học tập, phi thương mại.

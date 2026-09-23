# Thư mục âm thanh & video

Thư mục này chứa **file media mẫu** phục vụ hai thẻ `<video>` và `<audio>` trên
[`media.html`](../../media.html). Đây là **ngoại lệ có chủ đích** của quy ước
"không lưu media trong repo" áp dụng cho thư mục `assets/img/`.

| File | Kích thước | Nguồn | Giấy phép |
|---|---|---|---|
| `demo-video.mp4` | 1,1 MB | `mdn.github.io/shared-assets/videos/flower.mp4` | CC0 (miền công cộng) |
| `demo-video.webm` | 0,5 MB | `mdn.github.io/shared-assets/videos/flower.webm` | CC0 (miền công cộng) |
| `demo-audio.mp3` | 39 KB | `mdn.github.io/shared-assets/audio/t-rex-roar.mp3` | CC0 (miền công cộng) |

Bộ tài nguyên dùng chung của MDN Web Docs, phát hành theo CC0 nên tự do sao chép
và tái phân phối.

## Vì sao tải về chứ không nhúng URL ngoài như ảnh?

- **Tránh lỗi "không đúng định dạng".** Thẻ `<video>` khắt khe hơn `<img>` nhiều:
  sai content-type, thiếu header `Accept-Ranges`, hay bị CORS chặn là trình duyệt
  báo *"Video format or MIME type is not supported"* thay vì chỉ hiện ảnh vỡ.
- **Chạy được khi không có mạng.** Máy chấm bài mất mạng thì ảnh rơi về
  `placeholder.svg`, nhưng video và âm thanh vẫn phát bình thường.
- Tổng ~1,7 MB, vẫn nhẹ so với giới hạn của GitHub Pages.

## Vì sao có cả `.mp4` lẫn `.webm`?

Hai thẻ `<source>` cùng nằm trong một `<video>`; trình duyệt tự chọn định dạng đầu
tiên mà nó giải mã được. WebM đặt trước vì nhẹ hơn một nửa, MP4 đứng sau làm bản
dự phòng cho Safari đời cũ.

## ⚠️ YouTube không dùng được với thẻ `<video>`

Đây là lỗi hay gặp nhất khi làm phần đa phương tiện:

```html
<!-- SAI: báo "Video format or MIME type is not supported" -->
<video src="https://www.youtube.com/watch?v=54TvG--sg8c" controls></video>

<!-- ĐÚNG: YouTube chỉ nhúng được bằng iframe -->
<iframe src="https://www.youtube-nocookie.com/embed/54TvG--sg8c" allowfullscreen></iframe>
```

Lý do: `youtube.com/watch?v=…` trả về một **trang HTML**, không phải file video.
Thẻ `<video>` cần URL trỏ thẳng tới file có content-type dạng `video/*`.

## ⚠️ Bẫy thứ hai: iframe YouTube không chạy qua `file://`

Mở `media.html` bằng cách nháy đúp file sẽ khiến khung YouTube báo lỗi phát,
trong khi `<video>` và `<audio>` vẫn chạy ngon lành. Không phải video hỏng.

Trang mở qua `file://` có **origin là `null`**. YouTube kiểm tra origin của trang
nhúng, thấy `null` thì từ chối phát. Không có thuộc tính nào trên thẻ `<iframe>`
sửa được chuyện này — `allow`, `referrerpolicy`, hay đổi `youtube-nocookie.com`
sang `youtube.com` đều vô ích.

**Cách chạy thử đúng:** dùng Live Server của VS Code
(`http://127.0.0.1:5500/media.html`), hoặc mở bản đã triển khai trên
`https://zephyr224.id.vn/media.html`.

Cách phân biệt nhanh khi gặp lỗi video trên trang:

| Hiện tượng | Kết luận |
|---|---|
| `<video>` lỗi, iframe chạy | Sai đường dẫn file, hoặc file hỏng / tải thiếu |
| `<video>` chạy, iframe lỗi | Đang mở bằng `file://` — phục vụ qua HTTP là hết |
| Cả hai cùng lỗi | Mất mạng, hoặc mở sai file |

Đây cũng là lý do hai file mẫu được tải hẳn về repo: chúng giữ được phần
`<video>`/`<audio>` hoạt động kể cả khi mở offline bằng `file://`.

## Nội dung file không liên quan tới Kanata

Đúng vậy — và đó là chủ ý. Nhạc cùng video của Kanata thuộc bản quyền COVER Corp.,
không được phép tải về rồi host lại. Phần nội dung thật của cô được nhúng bằng
`<iframe>` từ kênh YouTube chính thức, còn hai thẻ `<video>`/`<audio>` dùng file CC0
để minh hoạ kỹ thuật. `media.html` có ghi chú nói rõ điều này cho người đọc.

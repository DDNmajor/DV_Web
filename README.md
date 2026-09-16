# Amane Kanata — 天界学園放送部 Archive

Website **tĩnh** lưu niệm về Amane Kanata (天音かなた), thành viên thế hệ 4 của
hololive, hoạt động từ 27/12/2019 tới khi tốt nghiệp ngày 27/12/2025.

**Sinh viên thực hiện: Lê Quang Huy — MSSV 20225333**

Viết bằng **HTML + CSS + JavaScript thuần** — không thư viện, không build tool,
đẩy thẳng lên **GitHub Pages** là chạy.

🔗 https://ddnmajor.github.io/DV_Web/

---

## 1. Cấu trúc thư mục

```
DV_Web/
├── index.html          Hero, 3 điểm nổi bật, giới thiệu, điều hướng
├── profile.html        Bảng thông số, 6 thẻ tính cách, timeline 11 mốc, câu thoại, bên lề
├── gallery.html        46 ảnh từ 3 nguồn + bộ lọc 5 nhóm + lightbox
├── music.html          18 ca khúc gốc, 2 album, ~150 bài cover/nhóm, nhạc nền stream
├── contact.html        Form 5 trường, kiểm tra dữ liệu bằng JavaScript
├── assets/
│   ├── css/
│   │   ├── style.css       Token màu/chữ, reset, toàn bộ component
│   │   └── responsive.css  Media query 1024 / 768 / 480 + @media print
│   ├── js/
│   │   ├── main.js         Hamburger, reveal khi cuộn, back-to-top, năm, fallback ảnh
│   │   ├── gallery.js      Lọc theo data-tag + lightbox (← → Esc)
│   │   ├── music.js        Trình phát mô phỏng bằng setInterval
│   │   └── contact.js      Kiểm tra dữ liệu form
│   └── img/
│       ├── README.md       Giải thích chuyện nhúng ảnh từ ngoài
│       └── placeholder.svg Ảnh dự phòng khi tải lỗi
├── .nojekyll           Yêu cầu GitHub Pages phục vụ file tĩnh nguyên trạng
└── README.md
```

## 2. Định hướng thiết kế

Trang được dựng như **kho lưu trữ của một câu lạc bộ phát thanh đã đóng cửa** —
ý tưởng lấy từ chính hashtag stream của Kanata: `#天界学園放送部`
(Câu lạc bộ phát thanh Thiên Giới Học Viên). Cách đóng khung này hợp với việc cô
đã tốt nghiệp, và cho một bộ từ vựng cấu trúc có thật: nhãn `OFF AIR`, dải số liệu
kiểu bảng thông số đài phát, dòng thời gian đọc như nhật ký phát sóng.

**Bảng màu lấy từ thiết kế nhân vật**, không phải màu tự nghĩ ra:

| Biến CSS | Mã | Gốc trong thiết kế nhân vật |
|---|---|---|
| `--ink` | `#0E1430` | Navy thiên hà |
| `--cobalt` | `#2B5CE6` | Lớp tóc trong, nơ cổ, tất |
| `--halo` | `#F2C14E` | Hào quang vàng 4 cánh |
| `--blush` | `#F4A7C0` | Highlight hồng trên tóc |
| `--silver` | `#D9DEE9` | Tóc bạc |

**Chữ:** `Be Vietnam Pro` (thân bài, dấu tiếng Việt chuẩn) · `Zen Maru Gothic`
(khối chữ Nhật) · `JetBrains Mono` (ngày tháng, số liệu, nhãn). Khai báo
`font-family: 'Be Vietnam Pro', 'Zen Maru Gothic', sans-serif` để glyph Latin lấy
font đầu, glyph Nhật **tự rơi xuống** font sau.

**Yếu tố chữ ký:** ngôi sao 4 cánh — hào quang của Kanata — vẽ bằng inline SVG và
dùng lại ở logo, dấu đầu dòng timeline, chỉ báo hover ở gallery, và vòng hào quang
lớn xoay chậm sau hero.

**Một chi tiết cố ý:** nơ cổ của Kanata trong thiết kế gốc luôn lệch, nên gạch chân
tiêu đề section cũng cố tình lệch trục và hàng thẻ nổi bật lệch theo chiều dọc.

## 3. Kỹ thuật đã sử dụng

**HTML5 ngữ nghĩa** — `header`, `nav`, `main`, `section`, `article`, `aside`,
`figure`/`figcaption`, `table` có `caption`/`scope`, form nhiều loại input,
`iframe`, `data-*`, meta SEO, thuộc tính ARIA.

**CSS** — biến CSS (`:root`), Flexbox, Grid, `position: sticky`, `aspect-ratio`,
`clip-path` (ngôi sao 4 cánh), `backdrop-filter`, `@keyframes`, `:focus-visible`,
responsive 3 mốc, `@media print`, tôn trọng `prefers-reduced-motion`.

**JavaScript** — DOM, sự kiện (click / keydown / scroll / submit / input / reset),
`IntersectionObserver`, `setInterval`, regex kiểm tra email và số điện thoại,
`classList`, `dataset`, thao tác bảng và danh sách dài.

## 4. Chạy thử

Mở thẳng `index.html` bằng trình duyệt là chạy đủ chức năng — dự án không dùng
`fetch` hay ES module nên không cần server. Nếu muốn giống môi trường thật:

```bash
python -m http.server 8000     # rồi mở http://localhost:8000
```

Hoặc dùng **Live Server** của VS Code.

## 5. Triển khai GitHub Pages

```bash
git add .
git commit -m "Them website tinh Amane Kanata"
git push origin main
```

Trên GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**.
Chờ 1–2 phút là trang lên.

> ⚠️ Mọi đường dẫn nội bộ đều **tương đối** (`assets/css/style.css`, `profile.html`).
> Không đổi sang `/assets/...` vì site nằm trong thư mục con `/DV_Web/` nên sẽ 404.

## 6. Ghi chú quan trọng

- **Trang cần mạng để hiện ảnh.** Ảnh nhân vật và bìa nhạc được nhúng trực tiếp từ
  `hololive.hololivepro.com`, `static.wikitide.net` (hololive.wiki) và
  `static.wikia.nocookie.net` (Fandom) — đã
  kiểm tra tất cả trả HTTP 200. Mất mạng thì `main.js` tự thay bằng `placeholder.svg`,
  bố cục vẫn nguyên vẹn nhưng không có ảnh. Chi tiết: [assets/img/README.md](assets/img/README.md).
- **Form liên hệ không gửi dữ liệu đi đâu** (web tĩnh, không có backend); dữ liệu hợp
  lệ chỉ được in ra Console để minh hoạ.
- **Trình phát nhạc là mô phỏng giao diện**, không kèm file âm thanh — nhưng thời lượng
  lấy đúng từ bản phát hành nên thanh tiến trình chạy hết đúng bằng độ dài thật của bài.

## 7. Nguồn nội dung

- [Hồ sơ chính thức hololive](https://hololive.hololivepro.com/en/talents/amane-kanata/)
  — thông số cơ bản, tính cách, ảnh nhân vật, ảnh bìa nhạc.
- [Virtual YouTuber Wiki](https://virtualyoutuber.fandom.com/wiki/Amane_Kanata)
  — tiểu sử, dòng thời gian, tính cách, và [bộ ảnh trang phục](https://virtualyoutuber.fandom.com/wiki/Amane_Kanata/Gallery).
- [hololive.wiki](https://hololive.wiki/wiki/Amane_Kanata)
  — toàn bộ danh sách nhạc kèm thời lượng, câu thoại quen thuộc, artwork.

Đây là trang fan-made phi lợi nhuận phục vụ học tập, không có liên kết chính thức
với COVER Corp. hay hololive production. Mọi hình ảnh, tên gọi và nhân vật thuộc
bản quyền của chủ sở hữu tương ứng.

# Bài tập 3 — JS thư viện ảnh và tin nhanh

## 3a. Điền vào chỗ trống (js/bai-a-gallery.js)

| Chỗ trống | Đáp án | Giải thích |
|---|---|---|
| (1) | `querySelector` | Trả về phần tử đầu tiên khớp bộ chọn CSS. |
| (2) | `querySelectorAll` | Trả về NodeList mọi phần tử khớp. |
| (3) | `getElementById` | Tìm theo id (không có dấu `#`). |
| (4) | `6` | Trong `#gallery ul` có 6 `<li>`, mỗi `<li>` một `<img>`. |
| (5) | `3` | Con đầu tiên của `<ul>` là khoảng trắng xuống dòng → nút văn bản (TEXT_NODE = 3). |
| (6) | `13` | 6 nút `<li>` + 7 nút văn bản khoảng trắng (trước, giữa và sau các `<li>`). |
| (7) | `parentNode` | Đi lên phần tử cha (`parentElement` cũng được). |
| (8) | `createElement` | Tạo phần tử mới. |
| (9) | `textContent` | Gán văn bản thuần, thẻ HTML không được diễn giải. |
| (10) | `appendChild` | Chèn vào cuối phần tử cha (`append` cũng được). |
| (11) | `!==` | Không phải ảnh thì thoát. |
| (12) | `return` | Thoát hàm, không làm gì cả. |
| (13) | `target` | `e.target` là phần tử thực sự được bấm (ảnh nhỏ). |
| (14) | `of` | `for...of` duyệt NodeList. |
| (15) | `className` | Gán lớp `dang-chon` cho `<li>` chứa ảnh vừa bấm. |
| (16) | `addEventListener` | Đăng ký trình lắng nghe. |
| (17) | `doiAnh` | Truyền tham chiếu hàm, không gọi hàm. |
| (18) | (B) | `doiAnh()` bị gọi ngay khi tải trang với `e` là `undefined` → `e.target` báo `TypeError: Cannot read properties of undefined`. |
| (19) | `focus` | Sự kiện khi ô được chọn để gõ (ngược với `blur`). |
| (20) | `removeEventListener` | Gỡ trình lắng nghe. |
| (21) | `doiAnh` | Phải truyền đúng tham chiếu hàm đã đăng ký thì mới gỡ được. |
| (22) | `click` | `e.type` là tên sự kiện. |
| (23) | `nut-khoa` | `e.target` là nút Khoá thư viện ảnh. |
| (24) | không | Hai hàm mũi tên viết giống nhau nhưng là hai object hàm khác nhau, `removeEventListener` không tìm thấy hàm cần gỡ. |
| (25) | `prepend` | Chèn vào đầu danh sách. |
| (26) | Hiện NGUYÊN cả cặp thẻ `<b>…</b>` | Gán bằng `textContent` nên `<b>` chỉ là ký tự, không thành thẻ. |
| (27) | `3` | 2 mục có sẵn + 1 mục vừa chèn. |

Kết quả trên trang Home: dưới ảnh lớn có chú thích; bấm ảnh nhỏ thì ảnh lớn đổi, chú thích thành `Đang xem: meeting.jpg` / `Đang xem: team-large.jpg` và ảnh nhỏ có viền; ô tìm kiếm ẩn/hiện chữ gợi ý; bấm Khoá thì không đổi ảnh được nữa; cột phải có thêm mục "Khuyến mãi &lt;b&gt;thiệp cưới&lt;/b&gt;" ở đầu.

## 3b. Viết code (js/bai-b-tin-nhanh.js)

```js
const oTimKiem = document.getElementById("o-tim-kiem");
const dsTin = document.getElementById("list");
const boDem = document.getElementById("bo-dem");
const khongThay = document.getElementById("khong-thay");
const oTieuDe = document.getElementById("tin-tieu-de");
const oNoiDung = document.getElementById("tin-noi-dung");
const nutDang = document.getElementById("nut-dang");
const baoLoi = document.getElementById("bao-loi");

// F1. Bộ đếm "Đang hiển thị x/y tin" trong #bo-dem.
function capNhatBoDem() {
	const tatCa = dsTin.querySelectorAll("li");
	const dangHien = dsTin.querySelectorAll("li:not(.an)");
	boDem.textContent = `Đang hiển thị ${dangHien.length}/${tatCa.length} tin`;
}

// F2 + F3. Lọc tin khi gõ vào #o-tim-kiem (sự kiện keyup) và thông báo #khong-thay.
function khopTuKhoa(muc, tuKhoa) {
	const vanBan = muc.querySelector("h3").textContent + " " + muc.querySelector("p").textContent;
	return vanBan.toLowerCase().includes(tuKhoa.toLowerCase());
}

function locTin() {
	const tuKhoa = oTimKiem.value;
	let soKhop = 0;
	for (const muc of dsTin.querySelectorAll("li")) {
		const khop = khopTuKhoa(muc, tuKhoa);
		// toggle(lớp, true) thêm lớp, toggle(lớp, false) bỏ lớp
		muc.classList.toggle("an", !khop);
		if (khop) {
			soKhop++;
		}
	}
	if (soKhop === 0) {
		// textContent để từ khoá như <b>x</b> hiện nguyên văn, không thành thẻ HTML
		khongThay.textContent = `Không tìm thấy tin nào cho "${tuKhoa}"`;
		khongThay.classList.remove("an");
	} else {
		khongThay.classList.add("an");
	}
	capNhatBoDem();
}

oTimKiem.addEventListener("keyup", locTin);

// F4. Nút "Read more >>" / "Thu gọn <<" — MỘT trình lắng nghe đặt trên #list.
dsTin.addEventListener("click", (e) => {
	// Event delegation: chỉ xử lý khi bấm đúng nút .more (kể cả nút của tin đăng sau)
	const nut = e.target.closest("button.more");
	if (nut === null) {
		return;
	}
	const doan = nut.parentNode.querySelector("p");
	const moRong = doan.classList.toggle("day-du");
	nut.textContent = moRong ? "Thu gọn <<" : "Read more >>";
});

// F5. Nút #nut-dang: kiểm tra dữ liệu, tạo <li> mới, chèn vào đầu #list.
nutDang.addEventListener("click", () => {
	const tieuDe = oTieuDe.value;
	const noiDung = oNoiDung.value;
	if (tieuDe === "" || noiDung === "") {
		baoLoi.textContent = "Vui lòng nhập đủ tiêu đề và nội dung.";
		return;
	}

	const muc = document.createElement("li");
	const ngay = document.createElement("span");
	const h3 = document.createElement("h3");
	const doan = document.createElement("p");
	const nut = document.createElement("button");
	ngay.className = "time";
	ngay.textContent = homNay();
	// textContent để nội dung có <img …>, <script> hiện nguyên văn
	h3.textContent = tieuDe;
	doan.textContent = noiDung;
	nut.type = "button";
	nut.className = "more";
	nut.textContent = "Read more >>";
	muc.append(ngay, h3, doan, nut);
	dsTin.prepend(muc);

	oTieuDe.value = "";
	oNoiDung.value = "";
	baoLoi.textContent = "";
	// Lọc lại để tin mới tuân theo từ khoá đang gõ, đồng thời cập nhật bộ đếm
	locTin();
});

capNhatBoDem();
```

### Giải thích

- **F1 Bộ đếm:** `li:not(.an)` đếm các tin đang hiện. Hàm được gọi khi tải trang, cuối mỗi lần lọc và sau mỗi lần đăng tin.
- **F2 Lọc tin:** ghép chữ của `h3` và `p`, đổi cả hai vế sang chữ thường rồi dùng `includes`. Từ khoá rỗng thì `includes("")` luôn `true` nên mọi tin hiện ra. `classList.toggle("an", !khop)` thêm hoặc bỏ lớp `an` theo kết quả.
- **F3 Không tìm thấy:** dùng `textContent` (không dùng `innerHTML`) nên gõ `<b>x</b>` thì hiện đúng 8 ký tự, không tạo thẻ `<b>`. Chỉ đổi nội dung của `#khong-thay` có sẵn, không tạo thêm phần tử.
- **F4 Read more (event delegation):** chỉ một trình lắng nghe trên `#list`. `e.target.closest("button.more")` cho biết có bấm trúng nút không; bấm vào tiêu đề, đoạn văn hay khoảng trống thì được `null` và thoát. Vì lắng nghe ở phần tử cha nên tin đăng sau cũng dùng được nút mà không cần đăng ký thêm. `classList.toggle` trả về `true` khi vừa thêm lớp, dùng để chọn chữ trên nút.
- **F5 Đăng tin:** tạo phần tử bằng `createElement` và gán bằng `textContent` nên `<img …>`, `<script>` của người dùng hiện nguyên văn, không chạy được (chống XSS). `prepend` chèn vào đầu `#list`. Sau khi đăng gọi lại `locTin()` để tin mới tuân theo từ khoá đang gõ và bộ đếm được cập nhật.

Kết quả: mở `news.html`, bấm **Chạy kiểm tra Bài B** → `KIỂM TRA BÀI B: 18/18 đạt`.

/* BÀI B — VIẾT CODE: Lọc tin và đăng tin nhanh (news.html)
   Viết code theo đặc tả.
   Không sửa news.html, không sửa css; chỉ viết JavaScript trong file này. */

// ---------- ĐÃ CHO SẴN (không sửa) ----------
// Chặn việc gửi form tìm kiếm khi nhấn Enter, để trang không bị tải lại.
document.querySelector("#searchbar form").addEventListener("submit", (e) => e.preventDefault());

// ---------- PHẦN BẠN VIẾT ----------

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

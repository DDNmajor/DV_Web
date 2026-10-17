/* BÀI B — VIẾT CODE: Phiếu xác nhận đơn in
   Hoàn thiện 4 hàm bên dưới theo mô tả trong de-bai.md (mục 4).
   Không đổi tên hàm, không đổi tham số, không sửa phần "DỮ LIỆU ĐÃ CHO". */

// ---------- DỮ LIỆU ĐÃ CHO (không sửa) ----------
const TEN_XUONG = "Blakletterpress";
const VAT_PHAN_TRAM = 10;

// Đơn gốc: các số lấy từ form nên đang là CHUỖI.
const donGoc = {
	ma: "BL-001",
	khach: { ten: "Nguyễn An", sdt: "0901234567" },
	soLuong: "250",
	donGia: "1500",
	phiGiao: "30000",
	soLanIn: 0
};

// ---------- PHẦN BẠN VIẾT ----------

// 1. Trả về tổng tiền (kiểu number) = soLuong × donGia + VAT + phiGiao.
function tinhTong(soLuong, donGia, phiGiao) {
	// Dữ liệu từ form là chuỗi → đổi sang number trước khi tính
	const tamTinh = Number(soLuong) * Number(donGia);
	const vat = tamTinh * VAT_PHAN_TRAM / 100;
	return tamTinh + vat + Number(phiGiao);
}

// 2. Trả về chuỗi mô tả số lần in lại.
function moTaInLai(soLan) {
	// == null đúng cho cả null và undefined, nhưng sai với 0
	if (soLan == null) {
		return "Chưa rõ";
	}
	if (soLan === 0) {
		return "In lần đầu";
	}
	return `In lại lần ${soLan}`;
}

// 3. Trả về chuỗi phiếu xác nhận gồm đúng 5 dòng.
function inPhieu(don) {
	return `=== ${TEN_XUONG.toUpperCase()} ===
Mã đơn : ${don.ma}
Khách  : ${don.khach.ten} (${don.khach.sdt})
Tổng   : ${tinhTong(don.soLuong, don.donGia, don.phiGiao)} đ
Ghi chú: ${moTaInLai(don.soLanIn)}`;
}

// 4. Trả về một đơn MỚI để in lại; đơn cũ không được thay đổi.
function taoDonInLai(donCu, sdtMoi) {
	// Sao chép cả object lồng khach, nếu không đơn mới và đơn cũ sẽ dùng chung khach
	return {
		...donCu,
		khach: { ...donCu.khach, sdt: sdtMoi },
		soLanIn: donCu.soLanIn + 1
	};
}

// ---------- CHẠY THỬ (không sửa) ----------
const donInLai = taoDonInLai(donGoc, "0988888888");
hienThi(inPhieu(donGoc));
hienThi("");
hienThi(inPhieu(donInLai));
console.table([donGoc, donInLai]);

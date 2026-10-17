/* ĐÃ CHO SẴN — KHÔNG SỬA FILE NÀY.
   Bộ kiểm tra tự động cho Bài B. Kết quả in ở tab Console (F12) và ở cuối khung "Kết quả". */
(function () {
	const ketQua = [];

	function kiem(ten, ham) {
		let dat = false;
		let loi = "";
		try {
			dat = ham() === true;
		} catch (e) {
			loi = e.message;
		}
		ketQua.push({ "Kiểm tra": ten, "Kết quả": dat ? "✅ Đạt" : "❌ Chưa đạt", "Lỗi": loi });
	}

	function taoDon() {
		return {
			ma: "BL-009",
			khach: { ten: "Trần Bình", sdt: "0911111111" },
			soLuong: "100",
			donGia: "2000",
			phiGiao: "0",
			soLanIn: 0
		};
	}

	// --- tinhTong ---
	kiem("T1  tinhTong nhận số: (250, 1500, 30000) → 442500", () => tinhTong(250, 1500, 30000) === 442500);
	kiem("T2  tinhTong nhận chuỗi: (\"250\", \"1500\", \"30000\") → 442500", () => tinhTong("250", "1500", "30000") === 442500);
	kiem("T3  tinhTong trả về kiểu number", () => typeof tinhTong("100", "2000", "0") === "number");
	kiem("T4  tinhTong(\"100\", \"2000\", \"0\") → 220000", () => tinhTong("100", "2000", "0") === 220000);

	// --- moTaInLai ---
	kiem("T5  moTaInLai(0) → \"In lần đầu\"", () => moTaInLai(0) === "In lần đầu");
	kiem("T6  moTaInLai(2) → \"In lại lần 2\"", () => moTaInLai(2) === "In lại lần 2");
	kiem("T7  moTaInLai(null) và moTaInLai(undefined) → \"Chưa rõ\"", () => moTaInLai(null) === "Chưa rõ" && moTaInLai(undefined) === "Chưa rõ");

	// --- inPhieu ---
	kiem("T8  inPhieu đúng từng ký tự (5 dòng)", () => {
		const mongDoi = "=== BLAKLETTERPRESS ===\nMã đơn : BL-009\nKhách  : Trần Bình (0911111111)\nTổng   : 220000 đ\nGhi chú: In lần đầu";
		return inPhieu(taoDon()) === mongDoi;
	});

	// --- taoDonInLai ---
	kiem("T9  taoDonInLai trả về object MỚI (khác đơn cũ)", () => {
		const cu = taoDon();
		const moi = taoDonInLai(cu, "0999999999");
		return moi !== cu && moi.ma === "BL-009";
	});
	kiem("T10 đơn mới: sdt mới, soLanIn tăng 1", () => {
		const moi = taoDonInLai(taoDon(), "0999999999");
		return moi.khach.sdt === "0999999999" && moi.soLanIn === 1;
	});
	kiem("T11 đơn cũ KHÔNG đổi sdt và soLanIn", () => {
		const cu = taoDon();
		taoDonInLai(cu, "0999999999");
		return cu.khach.sdt === "0911111111" && cu.soLanIn === 0;
	});
	kiem("T12 sửa tên khách trên đơn mới không ảnh hưởng đơn cũ", () => {
		const cu = taoDon();
		const moi = taoDonInLai(cu, "0999999999");
		moi.khach.ten = "Người khác";
		return cu.khach.ten === "Trần Bình";
	});

	const soDat = ketQua.filter(k => k["Kết quả"] === "✅ Đạt").length;
	const tomTat = "KIỂM TRA BÀI B: " + soDat + "/" + ketQua.length + " đạt";
	console.table(ketQua);
	console.log(tomTat);
	if (typeof hienThi === "function") {
		hienThi("");
		hienThi(tomTat);
		for (const k of ketQua) {
			hienThi(k["Kết quả"] + "  " + k["Kiểm tra"] + (k["Lỗi"] ? "  → " + k["Lỗi"] : ""));
		}
	}
})();

/* BÀI B — VIẾT CODE: Giỏ hàng của xưởng in
   Hoàn thiện class GioHang và hàm napGioHang.
   Không đổi tên class, tên phương thức, tên hàm; không sửa phần "DỮ LIỆU ĐÃ CHO". */

// ---------- DỮ LIỆU ĐÃ CHO (không sửa) ----------
const DANH_MUC = [
	{ id: "TC01", ten: "Thiệp cưới cotton", loai: "thiep cuoi", gia: 1500 },
	{ id: "TC02", ten: "Thiệp cưới kraft", loai: "thiep cuoi", gia: 900 },
	{ id: "DT01", ten: "Danh thiếp ép kim", loai: "danh thiep", gia: 1200 },
	{ id: "PB01", ten: "Phong bì lót lụa", loai: "phu kien", gia: 500 }
];

// ---------- PHẦN BẠN VIẾT ----------
class GioHang {
	constructor() {
		// Mỗi dòng của giỏ là một object { id, ten, loai, gia, soLuong }.
		this.dsDong = [];
	}

	// 1. Thêm sản phẩm; trả về true nếu thêm được, false nếu soLuong không hợp lệ.
	them(sanPham, soLuong) {
		// Chỉ nhận number nguyên > 0 (loại cả chuỗi "50", NaN, null, undefined, 2.5)
		if (!Number.isInteger(soLuong) || soLuong <= 0) {
			return false;
		}
		const dong = this.dsDong.find(d => d.id === sanPham.id);
		if (dong) {
			dong.soLuong += soLuong;
		} else {
			// Tạo object mới: không sửa sản phẩm trong DANH_MUC, không giữ tham chiếu ra ngoài
			this.dsDong.push({
				id: sanPham.id,
				ten: sanPham.ten,
				loai: sanPham.loai,
				gia: sanPham.gia,
				soLuong: soLuong
			});
		}
		return true;
	}

	// 2. Xoá dòng có id tương ứng; trả về true nếu có xoá, false nếu không tìm thấy.
	xoa(id) {
		const viTri = this.dsDong.findIndex(d => d.id === id);
		if (viTri === -1) {
			return false;
		}
		this.dsDong.splice(viTri, 1);
		return true;
	}

	// 3. Tổng tiền cả giỏ.
	tongTien() {
		return this.dsDong.reduce((tong, d) => tong + d.gia * d.soLuong, 0);
	}

	// 4. Object thống kê: { "<loai>": tổng tiền của loại đó, ... }.
	thongKeTheoLoai() {
		const thongKe = {};
		for (const d of this.dsDong) {
			thongKe[d.loai] = (thongKe[d.loai] || 0) + d.gia * d.soLuong;
		}
		return thongKe;
	}

	// 5. Dòng có thành tiền lớn nhất (bản sao, có thêm thanhTien); null nếu giỏ rỗng.
	dongDatNhat() {
		const ds = this.layDanhSach();
		if (ds.length === 0) {
			return null;
		}
		// Dùng > (không phải >=) để khi bằng nhau thì giữ dòng đứng trước
		return ds.reduce((max, d) => d.thanhTien > max.thanhTien ? d : max);
	}

	// 6. Mảng BẢN SAO các dòng, mỗi dòng có thêm thuộc tính thanhTien.
	layDanhSach() {
		return this.dsDong.map(d => ({ ...d, thanhTien: d.gia * d.soLuong }));
	}

	// 7. Chuỗi JSON của mảng các dòng.
	xuatJSON() {
		return JSON.stringify(this.dsDong);
	}
}

// 8. Tạo lại một GioHang từ chuỗi JSON do xuatJSON() sinh ra.
function napGioHang(chuoiJSON) {
	// JSON.parse chỉ trả về object thường, phải tạo GioHang mới để có các phương thức
	const gio = new GioHang();
	gio.dsDong = JSON.parse(chuoiJSON).map(d => ({
		id: d.id,
		ten: d.ten,
		loai: d.loai,
		gia: d.gia,
		soLuong: d.soLuong
	}));
	return gio;
}

// ---------- CHẠY THỬ (không sửa) ----------
const gio = new GioHang();
gio.them(DANH_MUC[0], 100);
gio.them(DANH_MUC[3], 200);
gio.them(DANH_MUC[0], 50);
veGioHang(gio.layDanhSach(), gio.tongTien());
console.table(gio.layDanhSach());
hienThi(`JSON gửi lên máy chủ: ${gio.xuatJSON()}`);

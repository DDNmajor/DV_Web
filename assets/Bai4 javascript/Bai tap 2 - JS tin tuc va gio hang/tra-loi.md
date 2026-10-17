# Bài tập 2 — JS tin tức và giỏ hàng

## 2a. Điền vào chỗ trống (js/bai-a-tin-tuc.js)

| Chỗ trống | Đáp án | Giải thích |
|---|---|---|
| (1) | `parse` | `JSON.parse` đổi chuỗi JSON thành mảng object. |
| (2) | `push` | Thêm phần tử vào cuối mảng. |
| (3) | `unshift` | Thêm phần tử vào đầu mảng. |
| (4) | `pop` | Lấy ra và xoá phần tử cuối. |
| (5) | `6` | Phần tử cuối là bài id 6 vừa `push`. |
| (6) | `shift` | Lấy ra và xoá phần tử đầu. |
| (7) | `5` | 5 + 1 (push) + 1 (unshift) − 1 (pop) − 1 (shift) = 5, còn lại id 1..5. |
| (8) | `["tac gia"]` | Khoá có dấu cách phải dùng ký pháp ngoặc vuông. |
| (9) | `delete` | Toán tử `delete` xoá thuộc tính khỏi object. |
| (10) | `undefined` | Thuộc tính đã bị xoá, đọc lại thì được `undefined`. |
| (11) | `[GHIM] Mẫu thiệp cưới mùa thu` | `baiGhim` và `dsBai[1]` cùng trỏ tới một object (kiểu tham chiếu). |
| (12) | `filter` | Giữ các phần tử thoả điều kiện. |
| (13) | `4` | Các bài đã đăng: id 1, 2, 3, 5 (id 4 là nháp). |
| (14) | `map` | Tạo mảng mới cùng độ dài. |
| (15) | `toUpperCase` | Đổi chuỗi sang chữ HOA. |
| (16) | `bai.views` | Cộng dồn lượt xem của từng bài. |
| (17) | `0` | Giá trị khởi tạo của biến tích luỹ. |
| (18) | `2600` | 320 + 870 + 540 + 870. |
| (19) | (B) | Không có giá trị khởi tạo thì `tong` ban đầu là object bài đầu tiên; object + số thành nối chuỗi: `"[object Object]870540870"`. |
| (20) | `>` | Dùng `>` (không dùng `>=`) để khi bằng nhau thì giữ bài đứng trước. |
| (21) | `2` | Bài id 2 và id 5 cùng 870 lượt xem, giữ bài đứng trước là id 2. |
| (22) | `undefined` | Hàm mũi tên có `{ }` mà không `return` thì trả về `undefined`. |
| (23) | `of` | `for...of` duyệt giá trị của mảng. |
| (24) | `the` | Đọc số đếm hiện tại của thẻ (chưa có thì `undefined`, `\|\| 0` thành 0). |
| (25) | `2` | Thẻ "mau moi" có ở bài id 2 và id 5. |
| (26) | `constructor` | Hàm khởi tạo của class. |
| (27) | `this` | Gán thuộc tính cho object đang được tạo. |
| (28) | `new` | Tạo object mới từ class. |
| (29) | `stringify` | `JSON.stringify` đổi object thành chuỗi JSON. |
| (30) | không | JSON chỉ chứa dữ liệu; phương thức nằm ở prototype của class nên không được đưa vào. `guiDi` = `{"title":"Khai trương xưởng in mới","date":"01-03-2012","views":320}`. |

Kết quả trên trang News: hiện 4 bài đã đăng (id 1, 2, 3, 5) và khung Kết quả:

```
Đã đăng: 4 bài — tổng 2600 lượt xem — bài hot: #2
Tiêu đề: KHAI TRƯƠNG XƯỞNG IN MỚI | [GHIM] MẪU THIỆP CƯỚI MÙA THU | HƯỚNG DẪN CHỌN GIẤY COTTON | ƯU ĐÃI IN DANH THIẾP
#su kien: 1 bài
#xuong in: 1 bài
#thiep cuoi: 1 bài
#mau moi: 2 bài
#huong dan: 1 bài
#giay: 1 bài
#khuyen mai: 1 bài
```

## 2b. Viết code (js/bai-b-gio-hang.js)

```js
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
```

### Giải thích

- **them:** `Number.isInteger()` trả về `false` cho chuỗi `"50"`, `NaN`, `null`, `undefined` và `2.5`, nên chỉ cần thêm điều kiện `> 0`. Khi thêm dòng mới, chép từng thuộc tính sang một object mới: giỏ không thêm `soLuong` vào object trong `DANH_MUC`, và sửa `sp.gia` bên ngoài sau đó cũng không ảnh hưởng giỏ.
- **xoa:** `findIndex` tìm vị trí, `splice` xoá đúng một dòng.
- **tongTien / thongKeTheoLoai:** cộng dồn `gia × soLuong`; giỏ rỗng thì `reduce` trả về giá trị khởi tạo `0`, vòng lặp không chạy nên được `{}`.
- **layDanhSach:** `map` tạo mảng mới, spread `{ ...d }` tạo object mới cho mỗi dòng (các thuộc tính đều là kiểu nguyên thuỷ nên sao chép nông là đủ). Sửa hay `pop()` trên kết quả không đụng tới `this.dsDong`.
- **dongDatNhat:** lấy từ `layDanhSach()` nên vốn đã là bản sao có `thanhTien`; dùng `>` để giữ dòng đứng trước khi bằng nhau.
- **xuatJSON:** `stringify` thẳng `this.dsDong`, mỗi dòng đúng 5 khoá, không có `thanhTien`.
- **napGioHang:** `JSON.parse` chỉ cho object thường không có phương thức, nên phải `new GioHang()` rồi gán lại `dsDong`. Thứ tự khoá giữ nguyên nên xuất → nạp → xuất cho cùng một chuỗi.

Kết quả trên trang Home: ô Giỏ hàng hiện 2 dòng và tổng tiền, bộ kiểm tra báo `KIỂM TRA BÀI B: 20/20 đạt`.

```
Thiệp cưới cotton   150 cái — 225000 đ
Phong bì lót lụa    200 cái — 100000 đ
Tổng: 325000 đ
```

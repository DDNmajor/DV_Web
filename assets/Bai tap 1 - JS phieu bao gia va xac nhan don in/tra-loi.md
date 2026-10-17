# Bài tập 1 — JS phiếu báo giá và xác nhận đơn in

## 1a. Điền vào chỗ trống (js/bai-a-bao-gia.js)

| Chỗ trống | Đáp án | Giải thích |
|---|---|---|
| (1) | `const` | Tên xưởng không bao giờ được gán lại. |
| (2) | `let` | `soLuong` được gán lại ở Phần 2 và có phạm vi khối. |
| (3) | `300200` | Số cộng chuỗi thì JavaScript nối chuỗi: `300 + "200"` = `"300200"`. |
| (4) | `true` | `==` tự ép kiểu `"200"` thành `200` rồi mới so sánh. |
| (5) | `false` | `===` so sánh cả kiểu: string khác number. |
| (6) | `let` | `giamGia` được gán lại trong khối `if` và cần dùng sau khối `if`. |
| (7) | `ReferenceError` (lyDo is not defined) | `lyDo` khai báo bằng `const` nên chỉ tồn tại trong khối `if`. |
| (8) | `undefined` | `var` được hoisting: khai báo được đưa lên đầu, giá trị ban đầu là `undefined`. |
| (9) | Báo lỗi `ReferenceError: Cannot access 'maDon' before initialization` | Biến `let` cũng được hoisting nhưng nằm trong vùng TDZ, chưa truy cập được trước dòng khai báo. |
| (10) | `==` | `ghiChu == null` đúng khi `ghiChu` là `null` hoặc `undefined`, sai khi là `""` hoặc `0`. |
| (11) | `500` | `donKhach` và `donMau` cùng trỏ tới một object, sửa `donKhach` thì `donMau` đổi theo. |
| (12) | `true` | Hai biến giữ cùng một tham chiếu. |
| (13) | Dòng (B) `donMau = {};` báo lỗi `TypeError: Assignment to constant variable` | `const` cấm gán lại biến, nhưng vẫn sửa được thuộc tính bên trong object, nên dòng (A) chạy bình thường. |
| (14) | `{` | Dấu mở ngoặc object phải nằm cùng dòng với `return`. |
| (15) | `undefined` | ASI tự chèn dấu `;` ngay sau `return` đứng một mình, nên hàm trả về `undefined`. |
| (16) | `` ` `` (dấu backtick) | Mở và đóng template literal. |
| (17) | `${soLuong}` | Chèn giá trị biến vào template literal. |
| (18) | `log` | `console.log` in thông tin thông thường. |
| (19) | `table` | `console.table` in mảng object dưới dạng bảng. |

Kết quả phiếu báo giá:

```
=== Blakletterpress ===
Số lượng : 500 thiệp
Tạm tính : 600000 đ
Giảm giá : 60000 đ (10 %)
VAT      : 54000 đ
Tổng     : 594000 đ
Ghi chú  : (không có)
```

## 1b. Viết code (js/bai-b-phieu-in.js)

```js
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
```

### Giải thích

- **tinhTong:** tham số lấy từ form là chuỗi. Nếu không đổi bằng `Number()` thì phép `+ phiGiao` sẽ thành nối chuỗi thay vì cộng số.
- **moTaInLai:** dùng `soLan == null` để bắt cả `null` và `undefined` trong một phép so sánh. Số `0` không bằng `null` nên đi tiếp xuống nhánh "In lần đầu".
- **inPhieu:** dùng template literal; dòng 1 lấy `TEN_XUONG` đổi sang chữ in hoa bằng `toUpperCase()`. Chuỗi bắt đầu ngay sau dấu backtick và kết thúc ngay trước dấu backtick đóng, nên không có dòng trống hay khoảng trắng thừa.
- **taoDonInLai:** spread `...donCu` chỉ sao chép nông (shallow copy). Object `khach` nằm bên trong vẫn là tham chiếu chung, nên phải sao chép riêng `khach` bằng `{ ...donCu.khach }`. Nhờ vậy đổi `sdt` hay sửa `khach.ten` trên đơn mới không làm đơn cũ đổi theo.

### Thứ tự nạp file

- `index.html`: `ho-tro.js` → `bai-a-bao-gia.js`
- `about.html`: `ho-tro.js` → `bai-b-phieu-in.js` → `kiem-tra.js`

`ho-tro.js` nạp đầu tiên nên hàm `hienThi` dùng được trong các file sau. `kiem-tra.js` nạp sau `bai-b-phieu-in.js` nên gọi được 4 hàm đã viết. Hai bài nằm ở hai trang khác nhau nên hằng `TEN_XUONG` và `VAT_PHAN_TRAM` khai báo ở cả hai file mà không bị trùng.

Kết quả phiếu xác nhận đơn in:

```
=== BLAKLETTERPRESS ===
Mã đơn : BL-001
Khách  : Nguyễn An (0901234567)
Tổng   : 442500 đ
Ghi chú: In lần đầu

=== BLAKLETTERPRESS ===
Mã đơn : BL-001
Khách  : Nguyễn An (0988888888)
Tổng   : 442500 đ
Ghi chú: In lại lần 1
```

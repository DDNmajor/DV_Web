/* BÀI A — ĐIỀN VÀO CHỖ TRỐNG: Phiếu báo giá in thiệp
   Thay mỗi ___(n)___ bằng đáp án của bạn.
   - Chỗ trống nằm trong CODE: điền từ khoá / toán tử / ký hiệu còn thiếu.
   - Chỗ trống nằm trong CHÚ THÍCH ("in ra: ..."): điền kết quả bạn DỰ ĐOÁN, chưa chạy vội.
   File chỉ chạy được khi mọi chỗ trống trong code đã được điền. */

// ---------- Phần 1: Khai báo ----------
// (1) Tên xưởng không bao giờ được gán lại.
const TEN_XUONG = "Blakletterpress";
const DON_GIA = 1200;        // đồng / thiệp
const VAT_PHAN_TRAM = 10;

// (2) Số lượng sẽ được cập nhật ở Phần 2, và chỉ được dùng trong phạm vi khối (block scope).
let soLuong = 300;

// ---------- Phần 2: Kiểu dữ liệu & so sánh ----------
// Giá trị lấy từ ô nhập của form LUÔN là chuỗi.
const nhapThem = "200";

console.log(soLuong + nhapThem);    // in ra: 300200  (chuỗi "300200" — số + chuỗi thành nối chuỗi)
console.log(nhapThem == 200);       // in ra: true    (== tự ép kiểu "200" → 200)
console.log(nhapThem === 200);      // in ra: false   (=== so cả kiểu: string khác number)

soLuong = soLuong + Number(nhapThem);   // Number("200") đổi chuỗi thành số → soLuong = 500

// ---------- Phần 3: Scope ----------
// (6) giamGia được gán lại bên trong khối if và phải dùng được SAU khối if.
let giamGia = 0;
if (soLuong >= 500) {
	giamGia = 10;                        // giảm 10 %
	const lyDo = "Đơn từ 500 thiệp";
}
// Nếu bỏ dấu chú thích ở dòng dưới, trình duyệt báo lỗi loại gì?  → ReferenceError: lyDo is not defined (const chỉ sống trong khối if)
// console.log(lyDo);

// ---------- Phần 4: Hoisting ----------
console.log(maDon);                 // in ra: undefined  (var được hoisting, khởi tạo sẵn là undefined)
var maDon = "BL-001";
// Nếu đổi `var` thành `let` ở dòng trên thì dòng console.log(maDon) sẽ: báo lỗi ReferenceError: Cannot access 'maDon' before initialization (vùng TDZ)

// ---------- Phần 5: null / undefined ----------
let ghiChu;                         // khách không nhập ghi chú
// (10) Điều kiện phải ĐÚNG khi ghiChu là null HOẶC undefined,
//      SAI khi ghiChu là "" hoặc 0, và chỉ dùng MỘT phép so sánh.
if (ghiChu == null) {
	ghiChu = "(không có)";
}

// ---------- Phần 6: Kiểu tham chiếu ----------
const donMau = { giay: "Cotton 300gsm", soLuong: 100 };
const donKhach = donMau;
donKhach.soLuong = soLuong;

console.log(donMau.soLuong);        // in ra: 500   (donKhach và donMau trỏ cùng một object)
console.log(donMau === donKhach);   // in ra: true  (cùng tham chiếu)
// Trong hai dòng sau, dòng nào báo lỗi?  (A) donMau.giay = "Kraft";   (B) donMau = {};   → (B) — TypeError: Assignment to constant variable (const cấm gán lại biến, nhưng vẫn sửa được thuộc tính)

// ---------- Phần 7: ASI (tự chèn dấu chấm phẩy) ----------
function tinhTien(sl, giam) {
	const tamTinh = sl * DON_GIA;
	const tienGiam = tamTinh * giam / 100;
	const vat = (tamTinh - tienGiam) * VAT_PHAN_TRAM / 100;
	return {
		tamTinh: tamTinh,
		tienGiam: tienGiam,
		vat: vat,
		tong: tamTinh - tienGiam + vat
	};
}
// Nếu viết `return` một mình một dòng rồi mới xuống dòng mở ngoặc, tinhTien(500, 10) trả về: undefined (ASI chèn ";" ngay sau return)

// ---------- Phần 8: Template literal ----------
const tien = tinhTien(soLuong, giamGia);

const phieu = `=== ${TEN_XUONG} ===
Số lượng : ${soLuong} thiệp
Tạm tính : ${tien.tamTinh} đ
Giảm giá : ${tien.tienGiam} đ (${giamGia} %)
VAT      : ${tien.vat} đ
Tổng     : ${tien.tong} đ
Ghi chú  : ${ghiChu}`;

// ---------- Phần 9: Console ----------
console.log(phieu);                                        // in thông tin thông thường
console.table([donMau, { giay: "Kraft", soLuong: 200 }]);    // in mảng object dưới dạng BẢNG

hienThi(phieu);

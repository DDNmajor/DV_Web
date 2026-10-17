/* ĐÃ CHO SẴN — KHÔNG SỬA FILE NÀY.
   Hàm hienThi(noiDung) in một đoạn văn bản vào khung "Kết quả" trên trang,
   để bạn nhìn thấy kết quả mà chưa cần học DOM. */
function hienThi(noiDung) {
	const khung = document.getElementById("ket-qua");
	khung.textContent = khung.textContent + noiDung + "\n";
}

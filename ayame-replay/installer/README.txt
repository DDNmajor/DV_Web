AYAME INSTALLER — cài replay Idol Showdown từ web vào game bằng 1 nút bấm
=========================================================================

CÀI ĐẶT (chỉ làm 1 lần)
  1. Giải nén toàn bộ file AyameInstaller.zip (chuột phải > Extract All).
  2. Chạy setup.cmd trong thư mục vừa giải nén.
     Nếu Windows hiện "Windows protected your PC", bấm More info > Run anyway.
  3. Thấy thông báo "Đã cài xong" là được. Có thể xoá thư mục vừa giải nén.

SỬ DỤNG
  Trên web, mở một replay và bấm "Cài vào game". Trình duyệt sẽ hỏi có mở
  Windows PowerShell không — chọn Mở. Replay được chép vào thư mục Archive
  của game; mở Idol Showdown > Archive để xem.

GỠ CÀI ĐẶT
  Chạy %LOCALAPPDATA%\AyameInstaller\uninstall.cmd
  (dán đường dẫn này vào thanh địa chỉ của File Explorer).

TRÌNH CÀI LÀM GÌ TRÊN MÁY BẠN
  - Chép ayame-handler.ps1 và config.json vào %LOCALAPPDATA%\AyameInstaller
  - Đăng ký link ayame:// cho tài khoản Windows của bạn
    (HKEY_CURRENT_USER\Software\Classes\ayame), không cần quyền Administrator
  - Tạo lối tắt "Idol Showdown - Replay Archive" trong Start Menu
  Khi bấm "Cài vào game", script chỉ tải file từ địa chỉ server ghi trong
  config.json, kiểm tra đúng là file replay, rồi ghi vào thư mục
  %USERPROFILE%\AppData\LocalLow\BestoGameStudios\Idol Showdown\Archive
  — không ghi đè file có sẵn. Mở ayame-handler.ps1 bằng Notepad để xem toàn bộ.

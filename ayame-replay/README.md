# Ayame Replay

Web chia sẻ replay `.ayame` của **Idol Showdown**. Người dùng đăng replay, web hiển thị thông tin trận, người xem bấm **Cài vào game** để replay vào thẳng mục Archive của game.

Web không phát lại trận trên trình duyệt. File `.ayame` chỉ chứa nút bấm từng frame, hình ảnh do chính game dựng lại, nên người xem dùng game của họ để xem. Web không chứa hình ảnh hay dữ liệu nào của game.

## Chạy

Cần Node.js ≥ 22.13. Dự án dùng `node:sqlite` có sẵn, không cần build native.

```bash
cd ayame-replay
npm install
npm start            # http://localhost:3000
npm run selftest     # đọc thử mọi replay trong thư mục Archive của máy này
```

Biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng HTTP |
| `AYAME_DATA_DIR` | `server/data` | Nơi lưu `replays.db` và file replay (`files/<id>.ayame.gz`) |
| `PUBLIC_URL` | lấy từ request | Địa chỉ web ghi vào `config.json` của trình cài, ví dụ `https://replay.example.com` |
| `TRUST_PROXY` | — | Đặt `1` khi chạy sau reverse proxy (HTTPS) |

## Cấu trúc

```
server/
  server.js     Express: REST API + phục vụ public/ + tạo AyameInstaller.zip
  db.js         Schema SQLite (users, sessions, replays)
  auth.js       Mật khẩu scrypt, session token trong cookie HttpOnly, giới hạn số lần thử
  zip.js        Tạo file zip trình cài (không cần thư viện)
  selftest.js   Kiểm tra parser trên replay thật
public/
  index.html    Danh sách + bộ lọc (nhân vật, stage, chế độ, phiên bản)
  replay.html   Chi tiết trận, diễn biến từng round, nút Cài vào game / Tải
  upload.html   Chọn thư mục Archive / mở thư mục / kéo thả → tick chọn → đăng
  user.html     Hồ sơ người đăng
  install.html  Hướng dẫn cài Ayame Installer
  help.html     Câu hỏi thường gặp
  js/ayame-format.js  Đọc định dạng .ayame — dùng chung cho trình duyệt và server
installer/
  ayame-handler.ps1   Toàn bộ logic trình cài (đăng ký ayame://, tải, kiểm tra, chép vào Archive)
  setup.cmd / uninstall.cmd / README.txt
```

## Định dạng `.ayame`

Đây là dump .NET `BinaryWriter`:
- Số nguyên là little-endian.
- String gồm độ dài dạng varint 7-bit, theo sau là các byte UTF-8.
- Enum được ghi bằng tên.
- Không có magic, không nén, không checksum.

Nguồn: `GameDemo.Serialize`, `PVPGameState.Serialize` trong game.

**Header**, theo thứ tự:
- `startTime`, `endTime`, `gameVersion` (`"ver:6.0.2"`)
- `frameCount`, `debugFrameCount`¹
- `gameMode`
- `p1Character`, `p1Collab`, `p1Cosplay`, `p2Character`, `p2Collab`, `p2Cosplay`
- `stage`, `stageVariant`, `song`, `fightInfo`²
- `gameRules` (JSON), `gameStateType`
- `p1Wins`, `p2Wins`, `p1Name`, `p2Name`
- `roundStartMarks[]`

¹ Không có ở bản 4.x. ² Không có ở bản 4.x và 5.0.x. Parser tự thử cả 3 kiểu.

**Phần thân** gồm hai khối, mỗi khối là `int32` độ dài rồi tới dữ liệu: các frame chính, sau đó là các frame debug (chỉ có ở replay online).

Mỗi frame chính gồm:
- `frame`
- `uint64` input của P1 và P2
- hai chuỗi trạng thái dạng `"FR: .. X: .. HP: .. SM: .."`

Server dùng các chuỗi trạng thái này để dựng lại diễn biến máu từng round. Đã kiểm tra trên 1.695 replay thật:
- Đọc được 1.694 file; file còn lại là replay rỗng.
- Kết quả từng round khớp tỉ số trong file ở khoảng 98% trường hợp.

Game chỉ mở replay **cùng phiên bản** (`ArchiveManager`: so khớp `gameVersion`), nên web luôn hiện phiên bản và cảnh báo nếu đã có bản mới hơn.

## API

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | JSON `{username, password}` |
| GET | `/api/auth/me` | |
| GET | `/api/replays?char=&collab=&stage=&mode=&version=&user=&q=&sort=new\|played\|views\|downloads&page=` | 24 replay/trang |
| POST | `/api/replays?title=&description=&name=` | Cần đăng nhập. Body: file `.ayame` đã **gzip** (client nén bằng `CompressionStream`). Trả 409 kèm `id` nếu đã có. |
| POST | `/api/replays/check` | `{fingerprints: [...]}` → những replay trong thư mục người dùng đã có trên web |
| GET | `/api/replays/:id` | Chi tiết (tăng lượt xem) |
| PATCH / DELETE | `/api/replays/:id` | Chỉ người đăng |
| GET | `/api/replays/:id/file` | File gốc. Header: `X-Ayame-Filename`, `X-Ayame-Sha256`, `X-Ayame-Title` |
| GET | `/api/users/:name`, `/api/facets` | |
| GET | `/download/AyameInstaller.zip` | Trình cài, có sẵn địa chỉ web trong `config.json` |

## Trình cài (Windows)

`setup.cmd` chạy `ayame-handler.ps1 -Install`, làm các việc sau:
- Đăng ký giao thức `ayame://` trong `HKCU`, nên không cần quyền admin.
- Chép script vào `%LOCALAPPDATA%\AyameInstaller`.
- Tạo lối tắt tới thư mục Archive trong Start Menu.

Link `ayame://install/<id>` được xử lý như sau:
- Chỉ chấp nhận id gồm 10 ký tự chữ/số.
- Chỉ tải từ server ghi trong `config.json`.
- Kiểm tra SHA-256 và header của file replay.
- Không ghi đè file đã có.
- Báo "đã có" nếu replay đã nằm trong game.

`ayame://open-archive` mở thư mục Archive.

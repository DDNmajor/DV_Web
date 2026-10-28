// Trang tĩnh (hướng dẫn, trợ giúp, 404): chỉ cần header/footer và nút copy đường dẫn.
import { ARCHIVE_PATH, copyText, mountLayout, storageSet } from '../ui.js';

mountLayout();

for (const node of document.querySelectorAll('[data-archive-path]')) node.textContent = ARCHIVE_PATH;
for (const button of document.querySelectorAll('[data-copy-archive]')) {
  button.addEventListener('click', () => copyText(ARCHIVE_PATH, 'Đã copy đường dẫn'));
}
for (const link of document.querySelectorAll('[data-installer-download]')) {
  // Ẩn gợi ý "Lần đầu dùng?" trên trang replay sau khi người dùng đã tải trình cài.
  link.addEventListener('click', () => storageSet('ayame.installer', '1'));
}

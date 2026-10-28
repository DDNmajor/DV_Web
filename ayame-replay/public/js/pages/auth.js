import { api } from '../api.js';
import { $, mountLayout, safeNext } from '../ui.js';

const form = $('#auth-form');
const mode = form.dataset.mode;
const error = $('#form-error');
const next = safeNext();

// Giữ trang đích khi chuyển qua lại giữa đăng nhập và đăng ký.
$('#switch-link').href += `?next=${encodeURIComponent(next)}`;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';
  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    error.textContent = 'Hãy nhập tên đăng nhập và mật khẩu.';
    return;
  }
  if (mode === 'register') {
    if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(username)) {
      error.textContent = 'Tên đăng nhập dài 3–24 ký tự, chỉ gồm chữ, số và dấu _ . -';
      return;
    }
    if (password.length < 8) {
      error.textContent = 'Mật khẩu cần ít nhất 8 ký tự.';
      return;
    }
    if (password !== form.password2.value) {
      error.textContent = 'Hai mật khẩu không khớp.';
      return;
    }
  }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    await api.post(`/api/auth/${mode}`, { username, password });
    location.href = next;
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
  }
});

const user = await mountLayout();
if (user) location.replace(next);

// Phần dùng chung giữa các trang: header/footer, tạo phần tử, định dạng số liệu, thẻ replay.
// Mọi dữ liệu người dùng đều được đưa vào DOM qua textContent — không dùng innerHTML.
import { api, getMe } from './api.js';
import {
  characterName, collabName, compareVersions, modeName, stageName, versionNumber,
} from './ayame-format.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'style') node.style.cssText = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

export const $ = (selector, root = document) => root.querySelector(selector);

export const ARCHIVE_PATH = '%USERPROFILE%\\AppData\\LocalLow\\BestoGameStudios\\Idol Showdown\\Archive';

// ---- Định dạng -------------------------------------------------------------------

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "2026-07-05 14:11:30" (giờ máy người chơi) → "05/07/2026 14:11"
export function fmtPlayedAt(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(value || '');
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : value || '';
}

// created_at của SQLite là UTC "YYYY-MM-DD HH:MM:SS"
export function fmtRelative(sqliteUtc) {
  const t = Date.parse(`${String(sqliteUtc).replace(' ', 'T')}Z`);
  if (Number.isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(t).toLocaleDateString('vi-VN');
}

export function fmtBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const fmtNumber = (n) => Number(n || 0).toLocaleString('vi-VN');

// Màu riêng cho mỗi nhân vật, suy ra từ tên — không dùng hình ảnh của game.
export function characterHue(character) {
  let h = 0;
  for (const c of String(character)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function avatar(character, size = '') {
  const name = characterName(character);
  const initials = name.replace(/[^A-Za-z ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2) || '?';
  return el('span', {
    class: `avatar ${size}`,
    style: `--hue:${characterHue(character)}`,
    title: name,
    'aria-hidden': 'true',
  }, initials);
}

export function versionBadge(version, latest) {
  const outdated = latest && compareVersions(version, latest) < 0;
  return el('span', {
    class: `badge ${outdated ? 'badge-old' : 'badge-version'}`,
    title: outdated ? `Phiên bản mới nhất trên web là ${versionNumber(latest)}` : 'Phiên bản game',
  }, `v${versionNumber(version)}${outdated ? ' · cũ' : ''}`);
}

export const modeBadge = (mode) => el('span', { class: `badge badge-${mode === 'onlinePVP' ? 'online' : 'local'}` }, modeName(mode));

// ---- Thẻ replay trong danh sách --------------------------------------------------

function side(player, which) {
  return el('div', { class: `card-side ${which}` },
    avatar(player.character),
    el('div', { class: 'card-side-text' },
      el('strong', {}, characterName(player.character)),
      el('span', { class: 'muted small' }, `+ ${collabName(player.collab)}`),
      el('span', { class: 'player-name' }, player.name || '—')));
}

export function replayCard(item, latestVersion) {
  return el('a', { class: 'replay-card', href: `/replay?id=${encodeURIComponent(item.id)}` },
    el('div', { class: 'card-versus' },
      side(item.p1, 'p1'),
      el('div', { class: 'card-score' },
        el('span', { class: item.p1.wins > item.p2.wins ? 'win' : '' }, item.p1.wins),
        el('span', { class: 'vs' }, 'VS'),
        el('span', { class: item.p2.wins > item.p1.wins ? 'win' : '' }, item.p2.wins)),
      side(item.p2, 'p2')),
    el('div', { class: 'card-body' },
      el('h3', { class: 'card-title' }, item.title),
      el('div', { class: 'card-tags' },
        modeBadge(item.mode),
        versionBadge(item.version, latestVersion),
        el('span', { class: 'tag' }, stageName(item.stage)),
        el('span', { class: 'tag mono' }, fmtDuration(item.durationSec))),
      el('div', { class: 'card-meta' },
        el('span', {}, 'bởi ', el('b', {}, item.uploader), ` · ${fmtRelative(item.createdAt)}`),
        el('span', { class: 'mono' }, `👁 ${fmtNumber(item.views)} · ⬇ ${fmtNumber(item.downloads)}`))));
}

// ---- Thông báo nhỏ ---------------------------------------------------------------

export function toast(message, kind = 'info', ms = 4000) {
  let box = $('#toasts');
  if (!box) {
    box = el('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const item = el('div', { class: `toast toast-${kind}` }, message);
  box.append(item);
  setTimeout(() => item.remove(), ms);
}

export async function copyText(text, label = 'Đã copy') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} ✓`, 'ok', 2500);
  } catch {
    window.prompt('Copy dòng dưới đây:', text);
  }
}

export function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* chế độ riêng tư */ }
}

// ---- Header & footer -------------------------------------------------------------

const NAV = [
  { href: '/', label: 'Replay' },
  { href: '/upload', label: 'Đăng replay' },
  { href: '/install', label: 'Cài vào game' },
  { href: '/help', label: 'Trợ giúp' },
];

export async function mountLayout() {
  const here = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
  const header = el('header', { class: 'site-header' },
    el('div', { class: 'wrap header-inner' },
      el('a', { class: 'logo', href: '/' },
        el('span', { class: 'logo-mark', 'aria-hidden': 'true' }, '▶'),
        el('span', {}, 'Ayame', el('b', {}, 'Replay'))),
      el('nav', { class: 'nav', 'aria-label': 'Chính' },
        NAV.map((n) => el('a', { href: n.href, class: here === n.href ? 'active' : '' }, n.label))),
      el('div', { class: 'nav-user', id: 'nav-user' })));
  document.body.prepend(header);

  document.body.append(el('footer', { class: 'site-footer' },
    el('div', { class: 'wrap' },
      el('p', {}, 'Ayame Replay — nơi chia sẻ replay .ayame của Idol Showdown. Dự án của người hâm mộ, '
        + 'không liên kết với Besto Game Studios hay COVER Corp.'),
      el('p', { class: 'muted small' }, 'Web không chứa hình ảnh hay dữ liệu của game — replay được phát lại bằng chính game của bạn.'))));

  const user = await getMe();
  const box = $('#nav-user');
  if (user) {
    box.append(
      el('a', { href: `/user?name=${encodeURIComponent(user.username)}`, class: 'nav-me' }, avatar(user.username, 'xs'), user.username),
      el('button', {
        class: 'btn-link',
        onclick: async () => {
          await api.post('/api/auth/logout');
          location.reload();
        },
      }, 'Đăng xuất'));
  } else {
    const next = encodeURIComponent(location.pathname + location.search);
    box.append(
      el('a', { href: `/login?next=${next}` }, 'Đăng nhập'),
      el('a', { href: `/register?next=${next}`, class: 'btn btn-small' }, 'Đăng ký'));
  }
  return user;
}

// Chỉ cho phép chuyển hướng nội bộ sau khi đăng nhập.
export function safeNext(fallback = '/') {
  const next = new URLSearchParams(location.search).get('next') || '';
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

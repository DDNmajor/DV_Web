import { api } from '../api.js';
import { $, avatar, el, fmtNumber, mountLayout, replayCard } from '../ui.js';

const name = new URLSearchParams(location.search).get('name') || '';
const head = $('#profile-head');
const grid = $('#grid');
const pager = $('#pager');
let page = 1;
let latestVersion = null;

async function loadReplays() {
  const data = await api.get(`/api/replays?user=${encodeURIComponent(name)}&page=${page}`);
  grid.replaceChildren(...data.items.map((item) => replayCard(item, latestVersion)));
  const pages = Math.ceil(data.total / data.pageSize);
  pager.replaceChildren();
  if (pages > 1) {
    const go = (p) => () => {
      page = p;
      loadReplays();
      window.scrollTo({ top: 0 });
    };
    pager.append(
      el('button', { class: 'btn btn-small', disabled: page <= 1, onclick: go(page - 1) }, '← Trước'),
      el('span', { class: 'muted mono' }, `${page} / ${pages}`),
      el('button', { class: 'btn btn-small', disabled: page >= pages, onclick: go(page + 1) }, 'Sau →'));
  }
  return data;
}

async function main() {
  mountLayout();
  let profile;
  try {
    [profile, { latestVersion }] = await Promise.all([
      api.get(`/api/users/${encodeURIComponent(name)}`),
      api.get('/api/facets').catch(() => ({})),
    ]);
  } catch (err) {
    head.replaceChildren(el('div', { class: 'empty', style: 'width:100%' },
      el('h2', {}, err.status === 404 ? 'Không tìm thấy người dùng' : 'Không tải được trang'),
      el('a', { class: 'btn', href: '/' }, '← Về danh sách')));
    return;
  }
  document.title = `${profile.username} — Ayame Replay`;
  head.replaceChildren(
    avatar(profile.username, 'lg'),
    el('div', {},
      el('h1', { style: 'margin:0' }, profile.username),
      el('p', { class: 'muted', style: 'margin:0' }, `Tham gia ${new Date(`${profile.createdAt.replace(' ', 'T')}Z`).toLocaleDateString('vi-VN')}`)),
    el('div', { class: 'stats', style: 'margin-left:auto' },
      el('div', {}, el('b', {}, fmtNumber(profile.replays)), el('span', {}, 'replay')),
      el('div', {}, el('b', {}, fmtNumber(profile.views)), el('span', {}, 'lượt xem')),
      el('div', {}, el('b', {}, fmtNumber(profile.downloads)), el('span', {}, 'lượt tải'))));

  const data = await loadReplays();
  if (!data.total) {
    grid.replaceChildren(el('div', { class: 'empty', style: 'grid-column:1/-1' },
      el('h2', {}, 'Chưa đăng replay nào'),
      profile.isMe ? el('a', { class: 'btn btn-primary', href: '/upload' }, 'Đăng replay đầu tiên') : null));
  } else if (profile.isMe) {
    head.append(el('p', { class: 'muted small', style: 'width:100%;margin:0' }, 'Mở một replay để sửa tiêu đề, mô tả hoặc xoá.'));
  }
}

main();

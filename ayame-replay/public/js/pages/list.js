import { api } from '../api.js';
import { characterName, stageName, versionNumber } from '../ayame-format.js';
import { $, el, fmtNumber, mountLayout, replayCard } from '../ui.js';

const form = $('#filters');
const grid = $('#grid');
const pager = $('#pager');
const count = $('#result-count');
let facets = { latestVersion: null };
let page = 1;

function fillSelect(name, values, label) {
  const select = form.elements[name];
  for (const v of values) select.append(el('option', { value: v }, label(v)));
}

// Bộ lọc được giữ trên URL để có thể copy link danh sách đã lọc.
function readUrl() {
  const params = new URLSearchParams(location.search);
  for (const field of form.elements) {
    if (field.name && params.has(field.name)) field.value = params.get(field.name);
  }
  page = Math.max(1, parseInt(params.get('page'), 10) || 1);
}

function currentParams() {
  const params = new URLSearchParams();
  for (const field of form.elements) {
    if (field.name && field.value && !(field.name === 'sort' && field.value === 'new')) params.set(field.name, field.value);
  }
  if (page > 1) params.set('page', page);
  return params;
}

async function load() {
  const params = currentParams();
  history.replaceState(null, '', params.size ? `?${params}` : location.pathname);
  grid.replaceChildren(...Array.from({ length: 6 }, () => el('div', { class: 'skeleton' })));
  pager.replaceChildren();
  try {
    const data = await api.get(`/api/replays?${params}`);
    renderResults(data);
  } catch (err) {
    grid.replaceChildren(el('div', { class: 'empty' }, el('h2', {}, 'Không tải được danh sách'), el('p', {}, err.message)));
  }
}

function renderResults({ items, total, pageSize }) {
  const filtered = [...currentParams().keys()].some((k) => k !== 'page');
  count.textContent = total ? `${fmtNumber(total)} replay` : '';
  if (!items.length) {
    grid.replaceChildren(el('div', { class: 'empty', style: 'grid-column:1/-1' },
      el('h2', {}, filtered ? 'Không có replay nào khớp bộ lọc' : 'Chưa có replay nào'),
      el('p', {}, filtered ? 'Thử bỏ bớt điều kiện lọc.' : 'Hãy là người đầu tiên chia sẻ một trận đấu!'),
      el('a', { class: 'btn btn-primary', href: '/upload' }, 'Đăng replay')));
    return;
  }
  grid.replaceChildren(...items.map((item) => replayCard(item, facets.latestVersion)));

  const pages = Math.ceil(total / pageSize);
  if (pages > 1) {
    const go = (p) => () => {
      page = p;
      load();
      window.scrollTo({ top: 0 });
    };
    pager.replaceChildren(
      el('button', { class: 'btn btn-small', disabled: page <= 1, onclick: go(page - 1) }, '← Trước'),
      el('span', { class: 'muted mono' }, `${page} / ${pages}`),
      el('button', { class: 'btn btn-small', disabled: page >= pages, onclick: go(page + 1) }, 'Sau →'));
  }
}

let typing;
form.addEventListener('input', (e) => {
  page = 1;
  clearTimeout(typing);
  typing = setTimeout(load, e.target.type === 'search' ? 300 : 0);
});
form.addEventListener('submit', (e) => e.preventDefault());

mountLayout();
try {
  facets = await api.get('/api/facets');
  fillSelect('char', facets.characters, characterName);
  fillSelect('stage', facets.stages, stageName);
  fillSelect('version', facets.versions, (v) => `v${versionNumber(v)}`);
} catch {
  // Không có bộ lọc vẫn xem danh sách được.
}
readUrl();
load();

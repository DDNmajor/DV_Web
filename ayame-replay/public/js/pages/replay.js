import { api } from '../api.js';
import {
  FPS, characterName, collabName, compareVersions, modeName, stageName, versionNumber,
} from '../ayame-format.js';
import {
  $, ARCHIVE_PATH, avatar, copyText, el, fmtBytes, fmtDuration, fmtNumber, fmtPlayedAt, fmtRelative,
  mountLayout, storageGet, toast, versionBadge,
} from '../ui.js';

const page = $('#page');
const id = new URLSearchParams(location.search).get('id') || '';

function sideBlock(player, which) {
  return el('div', { class: `match-side ${which}` },
    avatar(player.character, 'lg'),
    el('div', {},
      el('div', { class: 'side-label' }, which.toUpperCase()),
      el('h2', {}, characterName(player.character)),
      el('div', { class: 'muted' }, `Collab: ${collabName(player.collab)} · Trang phục #${player.cosplay + 1}`),
      el('div', { class: 'player' }, player.name || '—')));
}

function hero(r) {
  const rules = r.rules || {};
  return el('section', { class: 'match-hero' },
    el('div', { class: 'match-versus' },
      sideBlock(r.p1, 'p1'),
      el('div', { class: 'match-score' },
        el('div', { class: 'digits' },
          el('span', { class: r.p1.wins > r.p2.wins ? 'win' : '' }, r.p1.wins),
          el('span', { class: 'muted' }, ' – '),
          el('span', { class: r.p2.wins > r.p1.wins ? 'win' : '' }, r.p2.wins)),
        el('div', { class: 'muted small' }, rules.numRoundsToWin ? `Thắng ${rules.numRoundsToWin} round` : '')),
      sideBlock(r.p2, 'p2')),
    el('div', { class: 'match-bar' },
      el('span', {}, 'Stage ', el('b', {}, stageName(r.stage))),
      el('span', {}, 'Chế độ ', el('b', {}, modeName(r.mode))),
      el('span', {}, 'Phiên bản ', el('b', { class: 'mono' }, versionNumber(r.version))),
      el('span', {}, 'Ngày đấu ', el('b', {}, fmtPlayedAt(r.playedAt))),
      el('span', {}, 'Thời lượng ', el('b', { class: 'mono' }, fmtDuration(r.durationSec))),
      el('span', {}, 'Thời gian round ', el('b', {}, rules.isInfiniteTime ? '∞' : `${rules.timeLimit ?? 99}s`))));
}

function hpCell(hp, max, which) {
  if (hp === null || !max) return el('td', { class: 'muted' }, '—');
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return el('td', {},
    el('div', { class: 'row', style: 'gap:8px;flex-wrap:nowrap' },
      el('div', { class: `hpbar ${which}`, style: 'flex:1', title: `${Math.round(hp)} / ${max}` }, el('i', { style: `width:${pct}%` })),
      el('span', { class: 'mono small', style: 'min-width:3.2em;text-align:right' }, `${Math.round(pct)}%`)));
}

const RESULT = { ko: 'KO', timeout: 'Hết giờ', double: 'Double KO', unfinished: 'Bỏ dở' };

function roundsPanel(r) {
  const [max1, max2] = r.maxHp || [];
  const rows = (r.rounds || []).map((round) => el('tr', {},
    el('td', { class: 'mono' }, round.round),
    el('td', {}, round.winner
      ? el('span', { class: `winner-chip p${round.winner}` }, round.winner === 1 ? characterName(r.p1.character) : characterName(r.p2.character))
      : el('span', { class: 'muted' }, '—')),
    el('td', {}, RESULT[round.result] || ''),
    hpCell(round.hp1, max1, 'p1'),
    hpCell(round.hp2, max2, 'p2'),
    el('td', { class: 'num' }, fmtDuration(round.frames / FPS))));

  return el('section', { class: 'panel' },
    el('h2', {}, 'Diễn biến từng round'),
    rows.length
      ? el('div', { style: 'overflow-x:auto' }, el('table', { class: 'data-table' },
        el('thead', {}, el('tr', {},
          el('th', {}, '#'), el('th', {}, 'Thắng'), el('th', {}, 'Kết quả'),
          el('th', {}, `Máu ${characterName(r.p1.character)}`), el('th', {}, `Máu ${characterName(r.p2.character)}`),
          el('th', { style: 'text-align:right' }, 'Thời lượng'))),
        el('tbody', {}, rows)))
      : el('p', { class: 'muted' }, 'Không có dữ liệu round.'),
    el('p', { class: 'muted small', style: 'margin:12px 0 0' },
      'Ước tính từ dữ liệu máu ghi trong replay; tỉ số chính thức là tỉ số ở trên.'));
}

function infoPanel(r) {
  const panel = el('section', { class: 'panel stack' });
  const title = el('h1', { style: 'font-size:1.5rem;margin:0' }, r.title);
  const by = el('p', { class: 'muted', style: 'margin:0' },
    'Đăng bởi ', el('a', { href: `/user?name=${encodeURIComponent(r.uploader)}` }, r.uploader),
    ` · ${fmtRelative(r.createdAt)} · 👁 ${fmtNumber(r.views)} lượt xem · ⬇ ${fmtNumber(r.downloads)} lượt tải`);
  const desc = r.description ? el('p', { class: 'description', style: 'margin:0' }, r.description) : null;
  panel.append(title, by, ...(desc ? [desc] : []));

  if (r.isOwner) {
    const form = el('form', { class: 'stack hidden' },
      el('div', {}, el('label', { for: 'edit-title' }, 'Tiêu đề'), el('input', { id: 'edit-title', type: 'text', maxlength: 120, value: r.title, required: true })),
      el('div', {}, el('label', { for: 'edit-desc' }, 'Mô tả'), el('textarea', { id: 'edit-desc', maxlength: 1000 }, r.description)),
      el('div', { class: 'row' },
        el('button', { class: 'btn btn-blue', type: 'submit' }, 'Lưu'),
        el('button', { class: 'btn', type: 'button', onclick: () => form.classList.add('hidden') }, 'Huỷ')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.patch(`/api/replays/${r.id}`, { title: $('#edit-title').value, description: $('#edit-desc').value });
        location.reload();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    panel.append(
      el('div', { class: 'row' },
        el('button', { class: 'btn btn-small', onclick: () => form.classList.toggle('hidden') }, '✎ Sửa'),
        el('button', {
          class: 'btn btn-small btn-danger',
          onclick: async () => {
            if (!confirm('Xoá replay này khỏi web? Không thể hoàn tác.')) return;
            try {
              await api.del(`/api/replays/${r.id}`);
              location.href = `/user?name=${encodeURIComponent(r.uploader)}`;
            } catch (err) {
              toast(err.message, 'error');
            }
          },
        }, '🗑 Xoá')),
      form);
  }
  return panel;
}

function installPanel(r, latestVersion) {
  const outdated = latestVersion && compareVersions(r.version, latestVersion) < 0;
  const hint = el('div', { class: 'notice notice-info hidden' },
    el('div', {},
      el('p', {}, 'Trình duyệt sẽ hỏi có mở ', el('b', {}, 'Windows PowerShell'), ' không — chọn ', el('b', {}, 'Mở'), '. Vài giây sau sẽ có thông báo "Đã cài replay vào game".'),
      el('p', {}, 'Không thấy gì xảy ra? Bạn cần ', el('a', { href: '/install' }, 'cài Ayame Installer'), ' (chỉ 1 lần), hoặc tải file và cài thủ công bên dưới.')));

  const installed = storageGet('ayame.installer') === '1';
  return el('aside', { class: 'panel install-box' },
    el('h2', { style: 'margin:0' }, 'Xem trận này trong game'),
    el('button', {
      class: 'btn btn-primary btn-big',
      onclick: () => {
        hint.classList.remove('hidden');
        location.href = `ayame://install/${r.id}`;
      },
    }, '🎮 Cài vào game'),
    hint,
    installed ? null : el('p', { class: 'muted small', style: 'margin:0' },
      'Lần đầu dùng? ', el('a', { href: '/install' }, 'Cài Ayame Installer'), ' — mất khoảng 1 phút, chỉ làm một lần.'),
    el('div', { class: 'row' },
      el('a', { class: 'btn', style: 'flex:1', href: `/api/replays/${r.id}/file`, download: r.fileName }, '⬇ Tải .ayame'),
      el('button', { class: 'btn', style: 'flex:1', onclick: () => copyText(location.href, 'Đã copy link') }, '🔗 Copy link')),
    el('div', { class: outdated ? 'notice' : 'notice notice-info' },
      el('div', {},
        el('p', {}, 'Replay ghi ở phiên bản ', versionBadge(r.version, latestVersion), '. Game chỉ mở được replay ', el('b', {}, 'cùng phiên bản'), ' với bản bạn đang chơi.'),
        outdated ? el('p', {}, 'Đã có phiên bản mới hơn, nên bản game mới nhất có thể báo replay này là "corrupted".') : null)),
    el('details', {},
      el('summary', { class: 'muted', style: 'cursor:pointer' }, 'Cài thủ công (không cần trình cài)'),
      el('ol', { class: 'small', style: 'padding-left:20px;margin:10px 0 0' },
        el('li', {}, 'Bấm ', el('b', {}, 'Tải .ayame'), ' ở trên.'),
        el('li', {}, 'Bấm phím ', el('b', {}, 'Windows + R'), ', dán đường dẫn sau rồi Enter:',
          el('div', { class: 'path-row', style: 'margin:6px 0' },
            el('span', { class: 'path' }, ARCHIVE_PATH),
            el('button', { class: 'btn btn-small', onclick: () => copyText(ARCHIVE_PATH, 'Đã copy đường dẫn') }, 'Copy'))),
        el('li', {}, 'Kéo file vừa tải vào cửa sổ thư mục đó, rồi mở game → Archive.'))),
    el('dl', { class: 'kv small', style: 'margin:8px 0 0' },
      el('dt', {}, 'Tên file'), el('dd', { class: 'mono' }, r.fileName),
      el('dt', {}, 'Kích thước'), el('dd', {}, fmtBytes(r.size)),
      el('dt', {}, 'Số frame'), el('dd', { class: 'mono' }, fmtNumber(r.frames))));
}

async function main() {
  mountLayout();
  let replay;
  let facets = {};
  try {
    [replay, facets] = await Promise.all([
      api.get(`/api/replays/${encodeURIComponent(id)}`),
      api.get('/api/facets').catch(() => ({})),
    ]);
  } catch (err) {
    page.replaceChildren(el('div', { class: 'empty' },
      el('h2', {}, err.status === 404 ? 'Không tìm thấy replay' : 'Không tải được replay'),
      el('p', {}, err.status === 404 ? 'Replay có thể đã bị người đăng xoá.' : err.message),
      el('a', { class: 'btn', href: '/' }, '← Về danh sách')));
    return;
  }

  document.title = `${replay.title} — Ayame Replay`;
  page.replaceChildren(
    hero(replay),
    el('div', { class: 'detail-grid' },
      el('div', { class: 'stack' }, infoPanel(replay), roundsPanel(replay)),
      installPanel(replay, facets.latestVersion)));
}

main();

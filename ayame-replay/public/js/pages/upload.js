import { ApiError, api, uploadReplay } from '../api.js';
import {
  AyameFormatError, FINGERPRINT_BYTES, FPS, MAX_REPLAY_BYTES, characterName, describeError, fingerprint,
  parseHeader, readHeaderFromBlob, stageName,
} from '../ayame-format.js';
import {
  $, ARCHIVE_PATH, copyText, el, fmtDuration, fmtNumber, fmtPlayedAt, modeBadge, mountLayout, toast,
  versionBadge,
} from '../ui.js';

const FILE_NAME_RE = /^[A-Za-z0-9_]{1,120}\.ayame$/;
const MAX_BATCH = 50;

const entries = new Map(); // key -> entry
let user = null;
let latestVersion = null;
let uploading = false;

// ---- Ghi nhớ thư mục đã chọn (IndexedDB, chỉ Chrome/Edge hỗ trợ lưu handle) ----------

function idb(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('ayame-replay', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const saveFolder = (handle) => idb('readwrite', (s) => s.put(handle, 'folder')).catch(() => {});
const loadFolder = () => idb('readonly', (s) => s.get('folder')).catch(() => null);

// ---- Thu thập file từ các nguồn ---------------------------------------------------

async function filesFromHandle(dir, depth = 0, out = []) {
  for await (const handle of dir.values()) {
    if (handle.kind === 'file' && handle.name.toLowerCase().endsWith('.ayame')) out.push(await handle.getFile());
    // Cho phép chọn nhầm thư mục cha (vd. "Idol Showdown") — vẫn tìm thấy Archive bên trong.
    else if (handle.kind === 'directory' && depth < 3) await filesFromHandle(handle, depth + 1, out);
  }
  return out;
}

function readAllEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries((batch) => {
      if (!batch.length) return resolve(all);
      all.push(...batch);
      next();
    }, reject);
    next();
  });
}

async function filesFromEntry(entry, depth = 0, out = []) {
  if (entry.isFile) {
    if (entry.name.toLowerCase().endsWith('.ayame')) out.push(await new Promise((res, rej) => entry.file(res, rej)));
  } else if (entry.isDirectory && depth < 4) {
    for (const child of await readAllEntries(entry.createReader())) await filesFromEntry(child, depth + 1, out);
  }
  return out;
}

async function pickFolder() {
  if (!window.showDirectoryPicker) {
    $('#folder-input').click();
    return;
  }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ id: 'ayame-archive', mode: 'read' });
  } catch (err) {
    if (err.name === 'AbortError') return;
    toast('Trình duyệt không mở được thư mục này, thử cách chọn khác…', 'error');
    $('#folder-input').click();
    return;
  }
  saveFolder(handle);
  await scanFolderHandle(handle);
}

async function scanFolderHandle(handle) {
  showResults(`Đang tìm replay trong thư mục "${handle.name}"…`);
  try {
    await addFiles(await filesFromHandle(handle), true);
  } catch {
    setStatus('Không đọc được thư mục này. Hãy thử lại hoặc dùng cách kéo thả.');
  }
}

// ---- Đọc header từng file -----------------------------------------------------------

function defaultTitle(meta) {
  const who = (p) => {
    const named = p.name && !/^P[12]$/.test(p.name);
    return named ? `${characterName(p.character)} (${p.name})` : characterName(p.character);
  };
  return `${who(meta.p1)} vs ${who(meta.p2)}`;
}

async function inspect(file) {
  const entry = { file, key: `${file.name}|${file.size}|${file.lastModified}`, selected: false, status: 'idle' };
  if (file.size > MAX_REPLAY_BYTES) {
    entry.error = 'Replay quá lớn (tối đa 40MB).';
    return entry;
  }
  try {
    const head = new Uint8Array(await file.slice(0, FINGERPRINT_BYTES).arrayBuffer());
    try {
      entry.meta = parseHeader(head).meta;
    } catch (err) {
      if (!(err instanceof AyameFormatError) || err.message !== 'truncated') throw err;
      entry.meta = await readHeaderFromBlob(file);
    }
    entry.fingerprint = await fingerprint(head, file.size);
    entry.title = defaultTitle(entry.meta);
  } catch (err) {
    entry.error = describeError(err);
  }
  return entry;
}

async function addFiles(files, fromFolder = false) {
  const fresh = files.filter((f) => f.name.toLowerCase().endsWith('.ayame'));
  const skipped = files.length - fresh.length;
  if (!fresh.length) {
    if (fromFolder || !entries.size) {
      showResults('');
      showEmptyHelp(skipped > 0);
    } else if (skipped) {
      toast('Chỉ nhận file .ayame — các file khác đã được bỏ qua.', 'error');
    }
    return;
  }
  showResults('');
  const todo = fresh.filter((f) => !entries.has(`${f.name}|${f.size}|${f.lastModified}`));
  let done = 0;
  const found = [];
  const worker = async () => {
    while (todo.length) {
      const entry = await inspect(todo.shift());
      found.push(entry);
      if (++done % 25 === 0) setStatus(`Đang đọc ${fmtNumber(done)} / ${fmtNumber(done + todo.length)} replay…`);
    }
  };
  setStatus(`Đang đọc ${fmtNumber(todo.length)} replay…`);
  await Promise.all(Array.from({ length: 6 }, worker));

  const fingerprints = found.filter((e) => e.fingerprint).map((e) => e.fingerprint);
  if (fingerprints.length) {
    try {
      const { found: posted } = await api.post('/api/replays/check', { fingerprints });
      for (const entry of found) if (posted[entry.fingerprint]) entry.postedId = posted[entry.fingerprint];
    } catch {
      // Không kiểm tra được thì vẫn cho đăng; server sẽ báo nếu trùng.
    }
  }
  for (const entry of found) entries.set(entry.key, entry);
  if (skipped) toast(`Đã bỏ qua ${skipped} file không phải .ayame.`);
  render();
}

// ---- Danh sách -----------------------------------------------------------------------

function showResults(status) {
  $('#results').classList.remove('hidden');
  setStatus(status);
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStatus(text) {
  $('#scan-status').textContent = text;
}

function showEmptyHelp(onlyOtherFiles) {
  $('#local-list').replaceChildren(el('div', { class: 'empty' },
    el('h2', {}, 'Không tìm thấy replay nào'),
    el('p', {}, onlyOtherFiles
      ? 'Các file bạn chọn không phải replay .ayame của Idol Showdown.'
      : 'Thư mục này không có file .ayame. Có thể bạn chọn nhầm thư mục, hoặc game chưa lưu replay nào.'),
    el('p', {}, 'Game chỉ lưu replay khi bạn bật ', el('b', {}, 'Settings → Auto Save VOD'),
      ', hoặc bấm ', el('b', {}, 'Save VOD'), ' ở màn hình sau trận. ',
      el('a', { href: '/help#luu-replay' }, 'Xem hướng dẫn'))));
}

function rowFor(entry) {
  const { meta } = entry;
  if (!meta) {
    return el('div', { class: 'local-row disabled' },
      el('span', {}, '⚠'),
      el('div', { class: 'local-error' }, `${entry.file.name}: ${entry.error}`));
  }
  const checkbox = el('input', {
    type: 'checkbox',
    'aria-label': `Chọn trận ${entry.title}`,
    checked: entry.selected,
    disabled: Boolean(entry.postedId) || entry.status === 'done' || uploading,
  });
  const titleInput = el('input', { type: 'text', maxlength: 120, value: entry.title, 'aria-label': 'Tiêu đề khi đăng' });
  titleInput.addEventListener('input', () => { entry.title = titleInput.value; });
  titleInput.addEventListener('click', (e) => e.stopPropagation());

  const [day, time] = fmtPlayedAt(meta.startTime).split(' ');
  const statusTag = entry.postedId
    ? el('a', { class: 'badge badge-posted', href: `/replay?id=${entry.postedId}`, onclick: (e) => e.stopPropagation() }, '✓ Đã đăng')
    : entry.status === 'uploading' ? el('span', { class: 'badge' }, 'Đang tải lên…') : null;

  const row = el('div', { class: `local-row${entry.selected ? ' selected' : ''}${entry.postedId ? ' disabled' : ''}` },
    checkbox,
    el('div', { class: 'local-date' }, day, el('br'), time),
    el('div', { class: 'local-match' },
      el('span', { class: 'who p1n' }, characterName(meta.p1.character)),
      el('span', { class: 'muted small' }, meta.p1.name),
      el('span', { class: 'score' }, `${meta.p1.wins}–${meta.p2.wins}`),
      el('span', { class: 'who p2n' }, characterName(meta.p2.character)),
      el('span', { class: 'muted small' }, meta.p2.name)),
    el('div', { class: 'local-tags' },
      statusTag,
      el('span', { class: 'tag' }, stageName(meta.stage)),
      modeBadge(meta.gameMode),
      versionBadge(meta.gameVersion, latestVersion),
      el('span', { class: 'tag mono' }, fmtDuration(meta.frameCount / FPS))),
    entry.selected && !entry.postedId ? el('div', { class: 'local-title' }, titleInput) : null,
    entry.uploadError ? el('div', { class: 'local-error' }, entry.uploadError) : null);

  const toggle = () => {
    if (checkbox.disabled) return;
    entry.selected = !entry.selected;
    render();
  };
  row.addEventListener('click', (e) => {
    if (e.target !== checkbox) toggle();
  });
  checkbox.addEventListener('change', () => {
    entry.selected = checkbox.checked;
    render();
  });
  return row;
}

function visibleEntries() {
  const q = $('#local-search').value.trim().toLowerCase();
  const mode = $('#local-mode').value;
  const hidePosted = $('#hide-posted').checked;
  return sortedEntries().filter((e) => {
    if (!e.meta) return !q && !mode;
    if (hidePosted && e.postedId && !e.justPosted) return false;
    if (mode && e.meta.gameMode !== mode) return false;
    if (!q) return true;
    const hay = [e.meta.p1.character, e.meta.p2.character, characterName(e.meta.p1.character), characterName(e.meta.p2.character),
      e.meta.p1.name, e.meta.p2.name, stageName(e.meta.stage)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function sortedEntries() {
  return [...entries.values()].sort((a, b) => {
    if (!a.meta || !b.meta) return a.meta ? -1 : b.meta ? 1 : 0;
    return b.meta.startTime.localeCompare(a.meta.startTime);
  });
}

function render() {
  const all = [...entries.values()];
  const valid = all.filter((e) => e.meta);
  const posted = valid.filter((e) => e.postedId).length;
  const broken = all.length - valid.length;
  $('#results-title').textContent = `Tìm thấy ${fmtNumber(valid.length)} replay`;
  setStatus([
    posted ? `${fmtNumber(posted)} trận đã có trên web` : '',
    broken ? `${fmtNumber(broken)} file không đọc được` : '',
    'Mới nhất ở trên cùng. Bấm vào một dòng để chọn.',
  ].filter(Boolean).join(' · '));

  const rows = visibleEntries();
  $('#local-list').replaceChildren(...(rows.length
    ? rows.map(rowFor)
    : [el('div', { class: 'empty' }, el('p', {}, valid.length && posted === valid.length
      ? 'Tất cả replay trong thư mục này đã được đăng. Bỏ tick "Ẩn trận đã đăng" để xem lại.'
      : 'Không có trận nào khớp bộ lọc.'))]));

  const selected = all.filter((e) => e.selected && !e.postedId);
  $('#selected-count').textContent = selected.length ? `Đã chọn ${selected.length} trận` : 'Chưa chọn trận nào';
  const btn = $('#upload-btn');
  btn.disabled = uploading || !selected.length;
  btn.textContent = user ? (selected.length > 1 ? `Đăng ${selected.length} replay` : 'Đăng lên web') : 'Đăng nhập để đăng';
}

function selectEntries(list) {
  const pickable = list.filter((e) => e.meta && !e.postedId);
  if (pickable.length > MAX_BATCH) toast(`Chỉ chọn được tối đa ${MAX_BATCH} trận mỗi lần.`);
  for (const e of pickable.slice(0, MAX_BATCH)) e.selected = true;
  render();
}

// ---- Upload --------------------------------------------------------------------------

async function gzip(file) {
  return new Response(file.stream().pipeThrough(new CompressionStream('gzip'))).blob();
}

async function uploadSelected() {
  if (!user) {
    if (confirm('Bạn cần đăng nhập để đăng replay. Danh sách đang chọn sẽ cần chọn lại sau khi đăng nhập. Tiếp tục?')) {
      location.href = '/login?next=/upload';
    }
    return;
  }
  const queue = [...entries.values()].filter((e) => e.selected && !e.postedId);
  if (!queue.length) return;
  uploading = true;
  const bar = $('#overall-progress');
  bar.classList.remove('hidden');
  let ok = 0;
  const failed = [];

  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    entry.status = 'uploading';
    entry.uploadError = null;
    render();
    $('#selected-count').textContent = `Đang đăng ${i + 1} / ${queue.length}…`;
    try {
      const blob = await gzip(entry.file);
      const params = { title: entry.title || defaultTitle(entry.meta) };
      if (FILE_NAME_RE.test(entry.file.name)) params.name = entry.file.name;
      const { id } = await uploadReplay(blob, params, (p) => {
        bar.firstElementChild.style.width = `${((i + p) / queue.length) * 100}%`;
      });
      entry.postedId = id;
      entry.justPosted = true;
      entry.status = 'done';
      ok++;
    } catch (err) {
      entry.status = 'error';
      if (err instanceof ApiError && err.status === 409 && err.data?.id) {
        entry.postedId = err.data.id;
        entry.justPosted = true;
      } else if (err instanceof ApiError && err.status === 401) {
        entry.uploadError = 'Phiên đăng nhập đã hết, hãy đăng nhập lại.';
        failed.push(entry);
        break;
      } else {
        entry.uploadError = err.message;
        failed.push(entry);
      }
    }
    entry.selected = false;
    bar.firstElementChild.style.width = `${((i + 1) / queue.length) * 100}%`;
  }

  uploading = false;
  bar.classList.add('hidden');
  bar.firstElementChild.style.width = '0';
  render();
  if (ok === 1 && !failed.length) {
    const entry = queue.find((e) => e.status === 'done');
    toast('Đã đăng replay! Đang mở trang replay…', 'ok');
    setTimeout(() => { location.href = `/replay?id=${entry.postedId}`; }, 900);
  } else if (ok) {
    toast(`Đã đăng ${ok} replay${failed.length ? `, ${failed.length} lỗi` : ''}.`, failed.length ? 'error' : 'ok', 6000);
  } else if (failed.length) {
    toast('Chưa đăng được replay nào — xem lỗi ở từng dòng.', 'error', 6000);
  }
}

// ---- Gắn sự kiện -----------------------------------------------------------------------

async function main() {
  $('#archive-path').textContent = ARCHIVE_PATH;
  $('#copy-path').addEventListener('click', () => copyText(ARCHIVE_PATH, 'Đã copy đường dẫn — giờ bấm "Chọn thư mục replay"'));
  $('#pick-folder').addEventListener('click', pickFolder);
  $('#pick-folder-alt').addEventListener('click', () => $('#folder-input').click());
  $('#folder-input').addEventListener('change', (e) => {
    addFiles([...e.target.files], true);
    e.target.value = '';
  });
  $('#pick-files').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  });
  $('#open-archive').addEventListener('click', () => {
    location.href = 'ayame://open-archive';
    toast('Nếu thư mục không tự mở, hãy cài Ayame Installer hoặc dùng Cách 1.', 'info', 6000);
  });

  const zone = $('#dropzone');
  // Cho phép thả file ở bất cứ đâu trên trang, không chỉ trong ô.
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('over');
  });
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) zone.classList.remove('over');
  });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    const items = [...(e.dataTransfer?.items || [])];
    const roots = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
    if (roots.length) {
      const files = [];
      for (const root of roots) await filesFromEntry(root, 0, files);
      const hadFolder = roots.some((r) => r.isDirectory);
      addFiles(files.length || hadFolder ? files : [...e.dataTransfer.files], hadFolder);
    } else {
      addFiles([...(e.dataTransfer?.files || [])]);
    }
  });

  for (const id of ['#local-search', '#local-mode', '#hide-posted']) $(id).addEventListener('input', render);
  $('#select-newest').addEventListener('click', () => selectEntries(visibleEntries().filter((e) => e.meta && !e.postedId).slice(0, 5)));
  $('#select-all').addEventListener('click', () => selectEntries(visibleEntries()));
  $('#select-none').addEventListener('click', () => {
    for (const e of entries.values()) e.selected = false;
    render();
  });
  $('#upload-btn').addEventListener('click', uploadSelected);
  window.addEventListener('beforeunload', (e) => {
    if (uploading) e.preventDefault();
  });

  user = await mountLayout();
  if (!user) $('#login-notice').classList.remove('hidden');
  api.get('/api/facets').then((f) => { latestVersion = f.latestVersion; if (entries.size) render(); }).catch(() => {});

  if (window.showDirectoryPicker) {
    const saved = await loadFolder();
    if (saved) {
      const btn = $('#reuse-folder');
      btn.textContent = `↻ Dùng lại thư mục "${saved.name}"`;
      btn.classList.remove('hidden');
      btn.addEventListener('click', async () => {
        try {
          if ((await saved.requestPermission({ mode: 'read' })) !== 'granted') return;
          await scanFolderHandle(saved);
        } catch {
          toast('Không mở lại được thư mục cũ, hãy chọn lại.', 'error');
        }
      });
    }
  }
}

main();

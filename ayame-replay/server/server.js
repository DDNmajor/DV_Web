import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream';
import { db, FILES_DIR } from './db.js';
import {
  USERNAME_RE, createSession, destroySession, hashPassword, loadUser, rateLimit,
  requireUser, verifyPassword,
} from './auth.js';
import { buildZip } from './zip.js';
import {
  AyameFormatError, FINGERPRINT_BYTES, FPS, MAX_REPLAY_BYTES, characterName, compareVersions,
  describeError, fingerprint, gameStyleFileName, summarize, versionNumber,
} from '../public/js/ayame-format.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const PAGE_SIZE = 24;

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// Chặn request thay đổi dữ liệu đến từ trang web khác (bổ sung cho cookie SameSite=Lax).
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.get('origin');
  if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
    return res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
  }
  next();
});

app.use(express.json({ limit: '256kb' }));
app.use(loadUser);

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const cleanText = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
const randomId = () => {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('');
};
const ID_RE = /^[A-Za-z0-9]{10}$/;
const FILE_NAME_RE = /^[A-Za-z0-9_]{1,120}\.ayame$/;
const filePath = (id) => path.join(FILES_DIR, `${id}.ayame.gz`);

// ---- Tài khoản ----------------------------------------------------------------

const authLimit = rateLimit(20, 10 * 60_000);

app.post('/api/auth/register', authLimit, ah(async (req, res) => {
  const username = cleanText(req.body?.username, 64);
  const password = String(req.body?.password ?? '');
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Tên đăng nhập dài 3–24 ký tự, chỉ gồm chữ, số và dấu _ . -' });
  }
  if (password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' });
  }
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: 'Tên đăng nhập này đã có người dùng.' });
  }
  const { lastInsertRowid } = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, await hashPassword(password));
  createSession(res, Number(lastInsertRowid), req.secure);
  res.status(201).json({ user: { username } });
}));

app.post('/api/auth/login', authLimit, ah(async (req, res) => {
  const username = cleanText(req.body?.username, 64);
  const password = String(req.body?.password ?? '');
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
  }
  createSession(res, user.id, req.secure);
  res.json({ user: { username: user.username } });
}));

app.post('/api/auth/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user ? { username: req.user.username } : null });
});

// ---- Replay -------------------------------------------------------------------

const REPLAY_SELECT = `
  SELECT replays.*, users.username FROM replays JOIN users ON users.id = replays.user_id
`;

function toApi(row, full = false) {
  const item = {
    id: row.id,
    title: row.title,
    uploader: row.username,
    createdAt: row.created_at,
    playedAt: row.played_at,
    mode: row.mode,
    version: row.version,
    frames: row.frames,
    durationSec: Math.round(row.frames / FPS),
    stage: row.stage,
    size: row.size,
    p1: { character: row.p1_char, collab: row.p1_collab, cosplay: row.p1_cosplay, name: row.p1_name, wins: row.p1_wins },
    p2: { character: row.p2_char, collab: row.p2_collab, cosplay: row.p2_cosplay, name: row.p2_name, wins: row.p2_wins },
    views: row.views,
    downloads: row.downloads,
  };
  if (full) {
    item.description = row.description;
    item.fileName = row.original_name;
    item.rules = JSON.parse(row.rules_json);
    item.rounds = JSON.parse(row.rounds_json);
    item.maxHp = JSON.parse(row.max_hp_json);
  }
  return item;
}

app.post('/api/replays', requireUser, express.raw({ type: () => true, limit: '15mb' }), ah(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ error: 'Không nhận được file.' });
  }
  let raw;
  try {
    raw = zlib.gunzipSync(req.body, { maxOutputLength: MAX_REPLAY_BYTES });
  } catch (err) {
    if (err.code === 'ERR_BUFFER_TOO_LARGE') return res.status(413).json({ error: 'Replay quá lớn (tối đa 40MB).' });
    return res.status(400).json({ error: 'Dữ liệu tải lên không hợp lệ.' });
  }

  let summary;
  try {
    summary = summarize(new Uint8Array(raw.buffer, raw.byteOffset, raw.length));
  } catch (err) {
    if (!(err instanceof AyameFormatError)) throw err;
    return res.status(400).json({ error: describeError(err) });
  }
  const { meta, rounds, maxHp } = summary;

  const hash = sha256(raw);
  const existing = db.prepare('SELECT id FROM replays WHERE sha256 = ?').get(hash);
  if (existing) return res.status(409).json({ error: 'Trận này đã có người đăng.', id: existing.id });

  const id = randomId();
  const defaultTitle = `${characterName(meta.p1.character)} vs ${characterName(meta.p2.character)}`;
  const title = cleanText(req.query.title, 120) || defaultTitle;
  const description = cleanText(req.query.description, 1000);
  const requestedName = String(req.query.name ?? '');
  const originalName = FILE_NAME_RE.test(requestedName) ? requestedName : gameStyleFileName(meta, id);

  const tmp = `${filePath(id)}.tmp`;
  fs.writeFileSync(tmp, req.body);
  fs.renameSync(tmp, filePath(id));
  try {
    db.prepare(`
      INSERT INTO replays (
        id, user_id, sha256, fingerprint, title, description, original_name, size,
        p1_char, p1_collab, p1_cosplay, p1_name, p1_wins,
        p2_char, p2_collab, p2_cosplay, p2_name, p2_wins,
        stage, mode, version, frames, played_at, rules_json, rounds_json, max_hp_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user.id, hash, await fingerprint(raw.subarray(0, FINGERPRINT_BYTES), raw.length),
      title, description, originalName, raw.length,
      meta.p1.character, meta.p1.collab, meta.p1.cosplay, cleanText(meta.p1.name, 64), meta.p1.wins,
      meta.p2.character, meta.p2.collab, meta.p2.cosplay, cleanText(meta.p2.name, 64), meta.p2.wins,
      meta.stage, meta.gameMode, meta.gameVersion, meta.frameCount, meta.startTime,
      JSON.stringify(meta.rules), JSON.stringify(rounds), JSON.stringify(maxHp),
    );
  } catch (err) {
    fs.rmSync(filePath(id), { force: true });
    const dup = db.prepare('SELECT id FROM replays WHERE sha256 = ?').get(hash);
    if (dup) return res.status(409).json({ error: 'Trận này đã có người đăng.', id: dup.id });
    throw err;
  }
  res.status(201).json({ id });
}));

// Cho trang upload biết những replay nào trong thư mục của người dùng đã có trên web.
app.post('/api/replays/check', (req, res) => {
  const list = Array.isArray(req.body?.fingerprints) ? req.body.fingerprints : [];
  const fingerprints = [...new Set(list.filter((f) => typeof f === 'string' && /^[0-9a-f]{64}$/.test(f)))];
  if (fingerprints.length > 5000) return res.status(400).json({ error: 'Quá nhiều file.' });
  const found = {};
  for (let i = 0; i < fingerprints.length; i += 500) {
    const chunk = fingerprints.slice(i, i + 500);
    const rows = db.prepare(`SELECT id, fingerprint FROM replays WHERE fingerprint IN (${chunk.map(() => '?').join(',')})`)
      .all(...chunk);
    for (const row of rows) found[row.fingerprint] = row.id;
  }
  res.json({ found });
});

app.get('/api/replays', (req, res) => {
  const where = [];
  const params = [];
  const str = (v) => (typeof v === 'string' ? v.trim().slice(0, 64) : '');
  const like = (v) => `%${v.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const char = str(req.query.char);
  if (char) { where.push('(p1_char = ? OR p2_char = ?)'); params.push(char, char); }
  const collab = str(req.query.collab);
  if (collab) { where.push('(p1_collab = ? OR p2_collab = ?)'); params.push(collab, collab); }
  const stage = str(req.query.stage);
  if (stage) { where.push('stage = ?'); params.push(stage); }
  const mode = str(req.query.mode);
  if (mode) { where.push('mode = ?'); params.push(mode); }
  const version = str(req.query.version);
  if (version) { where.push('version = ?'); params.push(version); }
  const user = str(req.query.user);
  if (user) { where.push('users.username = ?'); params.push(user); }
  const q = str(req.query.q);
  if (q) {
    where.push("(title LIKE ? ESCAPE '\\' OR p1_name LIKE ? ESCAPE '\\' OR p2_name LIKE ? ESCAPE '\\' OR users.username LIKE ? ESCAPE '\\')");
    params.push(like(q), like(q), like(q), like(q));
  }

  const order = {
    new: 'replays.created_at DESC, replays.rowid DESC',
    played: 'played_at DESC',
    views: 'views DESC, replays.created_at DESC',
    downloads: 'downloads DESC, replays.created_at DESC',
  }[req.query.sort] || 'replays.created_at DESC, replays.rowid DESC';

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM replays JOIN users ON users.id = replays.user_id ${whereSql}`)
    .get(...params).n;
  const page = Math.max(1, Math.min(10_000, parseInt(req.query.page, 10) || 1));
  const rows = db.prepare(`${REPLAY_SELECT} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  res.json({ items: rows.map((row) => toApi(row)), total, page, pageSize: PAGE_SIZE });
});

app.get('/api/facets', (_req, res) => {
  const distinct = (sql) => db.prepare(sql).all().map((r) => r.v);
  const versions = distinct('SELECT DISTINCT version AS v FROM replays').sort((a, b) => compareVersions(b, a));
  res.json({
    characters: distinct('SELECT p1_char AS v FROM replays UNION SELECT p2_char FROM replays').sort(),
    collabs: distinct('SELECT p1_collab AS v FROM replays UNION SELECT p2_collab FROM replays').sort(),
    stages: distinct('SELECT DISTINCT stage AS v FROM replays').sort(),
    versions,
    latestVersion: versions[0] || null,
    total: db.prepare('SELECT COUNT(*) AS n FROM replays').get().n,
  });
});

function findReplay(req, res) {
  if (!ID_RE.test(req.params.id)) {
    res.status(404).json({ error: 'Không tìm thấy replay.' });
    return null;
  }
  const row = db.prepare(`${REPLAY_SELECT} WHERE replays.id = ?`).get(req.params.id);
  if (!row) res.status(404).json({ error: 'Không tìm thấy replay.' });
  return row;
}

function findOwnReplay(req, res) {
  const row = findReplay(req, res);
  if (row && row.user_id !== req.user.id) {
    res.status(403).json({ error: 'Bạn chỉ có thể sửa hoặc xoá replay của mình.' });
    return null;
  }
  return row;
}

app.get('/api/replays/:id', (req, res) => {
  const row = findReplay(req, res);
  if (!row) return;
  db.prepare('UPDATE replays SET views = views + 1 WHERE id = ?').run(row.id);
  row.views++;
  res.json({ ...toApi(row, true), isOwner: req.user?.id === row.user_id });
});

app.patch('/api/replays/:id', requireUser, (req, res) => {
  const row = findOwnReplay(req, res);
  if (!row) return;
  const title = req.body?.title === undefined ? row.title : cleanText(req.body.title, 120);
  const description = req.body?.description === undefined ? row.description : cleanText(req.body.description, 1000);
  if (!title) return res.status(400).json({ error: 'Tiêu đề không được để trống.' });
  db.prepare('UPDATE replays SET title = ?, description = ? WHERE id = ?').run(title, description, row.id);
  res.json({ ok: true });
});

app.delete('/api/replays/:id', requireUser, (req, res) => {
  const row = findOwnReplay(req, res);
  if (!row) return;
  db.prepare('DELETE FROM replays WHERE id = ?').run(row.id);
  fs.rmSync(filePath(row.id), { force: true });
  res.json({ ok: true });
});

app.get('/api/replays/:id/file', (req, res) => {
  const row = findReplay(req, res);
  if (!row) return;
  db.prepare('UPDATE replays SET downloads = downloads + 1 WHERE id = ?').run(row.id);
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(row.size),
    'Content-Disposition': `attachment; filename="${row.original_name}"`,
    'Cache-Control': 'no-store',
    'X-Ayame-Filename': row.original_name,
    'X-Ayame-Sha256': row.sha256,
    'X-Ayame-Version': versionNumber(row.version),
    'X-Ayame-Title': encodeURIComponent(
      `${characterName(row.p1_char)} (${row.p1_name}) vs ${characterName(row.p2_char)} (${row.p2_name})`,
    ),
  });
  pipeline(fs.createReadStream(filePath(row.id)), zlib.createGunzip(), res, (err) => {
    if (err && !res.headersSent) res.status(500).end();
  });
});

app.get('/api/users/:name', (req, res) => {
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(String(req.params.name));
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
  const stats = db.prepare(`
    SELECT COUNT(*) AS replays, COALESCE(SUM(views), 0) AS views, COALESCE(SUM(downloads), 0) AS downloads
    FROM replays WHERE user_id = ?
  `).get(user.id);
  res.json({ username: user.username, createdAt: user.created_at, ...stats, isMe: req.user?.id === user.id });
});

// ---- Trình cài "Ayame Installer" ------------------------------------------------

const INSTALLER_DIR = path.join(ROOT, 'installer');
const BOM = '﻿';

app.get('/download/AyameInstaller.zip', (req, res) => {
  const server = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const entries = fs.readdirSync(INSTALLER_DIR).sort().map((name) => {
    let text = fs.readFileSync(path.join(INSTALLER_DIR, name), 'utf8').replace(/\r?\n/g, '\r\n');
    // Windows PowerShell 5.1 (và Notepad cũ) chỉ đọc đúng tiếng Việt nếu file có BOM.
    if (/\.(ps1|txt)$/.test(name) && !text.startsWith(BOM)) text = BOM + text;
    return { name: `AyameInstaller/${name}`, data: Buffer.from(text, 'utf8') };
  });
  entries.push({
    name: 'AyameInstaller/config.json',
    data: Buffer.from(JSON.stringify({ server }, null, 2)),
  });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="AyameInstaller.zip"',
    'Cache-Control': 'no-store',
  });
  res.send(buildZip(entries));
});

// ---- Trang tĩnh & lỗi -----------------------------------------------------------

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy.' }));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
app.use((_req, res) => res.status(404).sendFile(path.join(ROOT, 'public', '404.html')));

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File quá lớn.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ, hãy thử lại sau.' });
});

app.listen(PORT, () => {
  console.log(`Ayame Replay đang chạy tại http://localhost:${PORT}`);
});


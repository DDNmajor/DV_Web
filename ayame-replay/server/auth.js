// Tài khoản: mật khẩu băm bằng scrypt, phiên đăng nhập là token ngẫu nhiên lưu trong
// cookie HttpOnly; trong DB chỉ giữ SHA-256 của token.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
export const COOKIE = 'sid';

export const USERNAME_RE = /^[\p{L}\p{N}_.-]{3,24}$/u;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, key] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function createSession(res, userId, secure) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_DAYS * 86400_000,
    path: '/',
  });
}

export function destroySession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// Middleware: gắn req.user nếu cookie phiên hợp lệ.
export function loadUser(req, _res, next) {
  const token = readCookie(req, COOKIE);
  req.user = null;
  if (token) {
    const row = db.prepare(`
      SELECT users.id, users.username FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(sha256(token), Date.now());
    if (row) req.user = { id: row.id, username: row.username };
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Bạn cần đăng nhập để làm việc này.' });
  next();
}

// Giới hạn số lần thử đăng nhập/đăng ký theo IP — đơn giản, giữ trong bộ nhớ.
const attempts = new Map();
export function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}|${req.ip}`;
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || entry.reset < now) {
      attempts.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > limit) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: 'Bạn thử quá nhiều lần, hãy đợi một lát rồi thử lại.' });
    }
    next();
  };
}

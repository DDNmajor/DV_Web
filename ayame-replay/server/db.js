// SQLite dùng module có sẵn của Node (node:sqlite, Node >= 22.13) — không cần build native.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const DATA_DIR = process.env.AYAME_DATA_DIR || path.join(import.meta.dirname, 'data');
export const FILES_DIR = path.join(DATA_DIR, 'files');
fs.mkdirSync(FILES_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, 'replays.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS replays (
    id            TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sha256        TEXT NOT NULL UNIQUE,
    fingerprint   TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    original_name TEXT NOT NULL,
    size          INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),

    p1_char TEXT NOT NULL, p1_collab TEXT NOT NULL, p1_cosplay INTEGER NOT NULL,
    p1_name TEXT NOT NULL, p1_wins INTEGER NOT NULL,
    p2_char TEXT NOT NULL, p2_collab TEXT NOT NULL, p2_cosplay INTEGER NOT NULL,
    p2_name TEXT NOT NULL, p2_wins INTEGER NOT NULL,
    stage       TEXT NOT NULL,
    mode        TEXT NOT NULL,
    version     TEXT NOT NULL,
    frames      INTEGER NOT NULL,
    played_at   TEXT NOT NULL,
    rules_json  TEXT NOT NULL,
    rounds_json TEXT NOT NULL,
    max_hp_json TEXT NOT NULL,

    views     INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS replays_fingerprint ON replays(fingerprint);
  CREATE INDEX IF NOT EXISTS replays_created ON replays(created_at);
  CREATE INDEX IF NOT EXISTS replays_user ON replays(user_id);
`);

db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

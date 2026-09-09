const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

/* =========================
   DATA DIRECTORY
========================= */

const dataDirectory = path.join(
  __dirname,
  "data"
);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });
}

/* =========================
   DATABASE FILE
========================= */

const databaseFile = path.join(
  dataDirectory,
  "securedms.db"
);

/* =========================
   OPEN DATABASE
========================= */

const db = new Database(
  databaseFile
);

/* =========================
   DATABASE SETTINGS
========================= */

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* =========================
   USERS TABLE
========================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id TEXT NOT NULL UNIQUE,

    name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'user',

    created_at TEXT NOT NULL
  );
`);

/* =========================
   DOCUMENTS TABLE
========================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,

    owner_id TEXT NOT NULL,

    name TEXT NOT NULL,

    stored_name TEXT NOT NULL,

    type TEXT NOT NULL,

    mime_type TEXT,

    size INTEGER NOT NULL DEFAULT 0,

    uploaded_at TEXT NOT NULL,

    deleted_at TEXT,

    FOREIGN KEY (owner_id)
      REFERENCES users(user_id)
      ON DELETE CASCADE
  );
`);

/* =========================
   INDEXES
========================= */

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_documents_owner
  ON documents(owner_id);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS
  idx_documents_deleted
  ON documents(deleted_at);
`);

/* =========================
   EXPORT
========================= */

module.exports = db;

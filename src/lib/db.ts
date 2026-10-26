import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  canDelete,
  canManageSharing,
  canRead,
  canWrite,
  type AccessDocument,
} from "./access";

const DEMO_PASSWORD_HASH =
  "$2b$10$XVFlD6QINyARO/nP4ST6X.e3TeC7esTbIWXZ5mltOIALsr7uCiVeO";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

export type DocumentRow = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  title: string;
  contentJson: string;
  contentHtml: string;
  createdAt: string;
  updatedAt: string;
  myRole: "owner" | "editor";
};

export type ShareRow = {
  userId: string;
  email: string;
  name: string;
  role: "editor";
};

export type AttachmentRow = {
  id: string;
  documentId: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
};

type RawDoc = {
  id: string;
  owner_id: string;
  title: string;
  content_json: string;
  content_html: string;
  created_at: string;
  updated_at: string;
};

let db: Database.Database | null = null;

export function dbPath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "commons.db");
}

export function getDb(): Database.Database {
  if (db) return db;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const instance = new Database(file);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  migrate(instance);
  seed(instance);
  db = instance;
  return instance;
}

/** Test helper: swap in an isolated in-memory database. */
export function useDatabase(instance: Database.Database): void {
  migrate(instance);
  seed(instance);
  db = instance;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
}

function migrate(instance: Database.Database): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      content_html TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shares (
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('editor')),
      PRIMARY KEY (document_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function emptyDocJson(): string {
  return JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
}

function seed(instance: Database.Database): void {
  const count = instance.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const alex = "user_alex";
  const jordan = "user_jordan";
  const sam = "user_sam";
  const now = new Date().toISOString();

  const insertUser = instance.prepare(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
  );
  insertUser.run(alex, "alex@commons.demo", "Alex Rivera", DEMO_PASSWORD_HASH);
  insertUser.run(jordan, "jordan@commons.demo", "Jordan Lee", DEMO_PASSWORD_HASH);
  insertUser.run(sam, "sam@commons.demo", "Sam Okonkwo", DEMO_PASSWORD_HASH);

  const welcomeId = "doc_welcome";
  const kickoffId = "doc_kickoff";
  const welcomeHtml = `
    <h1>Welcome to Commons</h1>
    <p>Commons is a lightweight shared document workspace — enough editor, sharing, and file import to move work forward, not a Google Docs replica.</p>
    <h2>What to try</h2>
    <ul>
      <li><strong>Edit this page</strong> — bold, italic, underline, headings, lists.</li>
      <li><em>Rename</em> the title in the header.</li>
      <li>Share with <u>jordan@commons.demo</u> or <u>sam@commons.demo</u>.</li>
      <li>Import a .txt, .md, .html, or .docx file from the sidebar.</li>
    </ul>
    <p>This document is owned by Alex and already shared with Jordan so you can switch accounts and see owned vs shared.</p>
  `.trim();

  const kickoffHtml = `
    <h1>Q4 kickoff notes</h1>
    <p>Owned by Jordan. Alex cannot see this until you share it.</p>
    <ol>
      <li>Confirm demo accounts still work after refresh.</li>
      <li>Import a markdown file into a new draft.</li>
      <li>Grant Sam editor access and confirm the Shared section.</li>
    </ol>
  `.trim();

  const insertDoc = instance.prepare(
    `INSERT INTO documents (id, owner_id, title, content_json, content_html, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  insertDoc.run(welcomeId, alex, "Welcome to Commons", emptyDocJson(), welcomeHtml, now, now);
  insertDoc.run(kickoffId, jordan, "Q4 kickoff notes", emptyDocJson(), kickoffHtml, now, now);
  instance
    .prepare("INSERT INTO shares (document_id, user_id, role) VALUES (?, ?, 'editor')")
    .run(welcomeId, jordan);
}

function toAccessDoc(doc: RawDoc): AccessDocument {
  const shares = getDb()
    .prepare("SELECT user_id AS userId, role FROM shares WHERE document_id = ?")
    .all(doc.id) as { userId: string; role: "editor" }[];
  return { ownerId: doc.owner_id, shares };
}

function hydrate(doc: RawDoc, userId: string): DocumentRow {
  const owner = getDb()
    .prepare("SELECT name, email FROM users WHERE id = ?")
    .get(doc.owner_id) as { name: string; email: string };
  return {
    id: doc.id,
    ownerId: doc.owner_id,
    ownerName: owner.name,
    ownerEmail: owner.email,
    title: doc.title,
    contentJson: doc.content_json,
    contentHtml: doc.content_html,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    myRole: doc.owner_id === userId ? "owner" : "editor",
  };
}

export function findUserByEmail(email: string): (PublicUser & { password_hash: string }) | null {
  const row = getDb()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | { id: string; email: string; name: string; password_hash: string }
    | undefined;
  return row ?? null;
}

export function findUserById(id: string): PublicUser | null {
  const row = getDb()
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(id) as PublicUser | undefined;
  return row ?? null;
}

export function verifyPassword(email: string, password: string): PublicUser | null {
  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export function listDocuments(userId: string): DocumentRow[] {
  const rows = getDb()
    .prepare(
      `SELECT d.* FROM documents d
       LEFT JOIN shares s ON s.document_id = d.id AND s.user_id = ?
       WHERE d.owner_id = ? OR s.user_id = ?
       ORDER BY d.updated_at DESC`,
    )
    .all(userId, userId, userId) as RawDoc[];
  return rows.map((row) => hydrate(row, userId));
}

export function getDocumentForUser(docId: string, userId: string): DocumentRow | null {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) return null;
  if (!canRead(userId, toAccessDoc(row))) return null;
  return hydrate(row, userId);
}

export function createDocument(
  userId: string,
  title = "Untitled",
  html = "<p></p>",
  json = emptyDocJson(),
): DocumentRow {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO documents (id, owner_id, title, content_json, content_html, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, title.trim() || "Untitled", json, html, now, now);
  const created = getDocumentForUser(id, userId);
  if (!created) throw new Error("Failed to create document");
  return created;
}

export function updateDocument(
  docId: string,
  userId: string,
  patch: { title?: string; contentJson?: string; contentHtml?: string },
): DocumentRow {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!canWrite(userId, toAccessDoc(row))) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const title = patch.title !== undefined ? patch.title.trim() || "Untitled" : row.title;
  const contentJson = patch.contentJson ?? row.content_json;
  const contentHtml = patch.contentHtml ?? row.content_html;
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "UPDATE documents SET title = ?, content_json = ?, content_html = ?, updated_at = ? WHERE id = ?",
    )
    .run(title, contentJson, contentHtml, now, docId);
  const updated = getDocumentForUser(docId, userId);
  if (!updated) throw new Error("Failed to update document");
  return updated;
}

export function deleteDocument(docId: string, userId: string): void {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!canDelete(userId, toAccessDoc(row))) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  getDb().prepare("DELETE FROM documents WHERE id = ?").run(docId);
}

export function listShares(docId: string, userId: string): ShareRow[] {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row || !canRead(userId, toAccessDoc(row))) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  return getDb()
    .prepare(
      `SELECT u.id AS userId, u.email, u.name, s.role
       FROM shares s JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?`,
    )
    .all(docId) as ShareRow[];
}

export function shareDocument(docId: string, ownerId: string, email: string): ShareRow[] {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!canManageSharing(ownerId, toAccessDoc(row))) {
    const err = new Error("Only the owner can share this document.");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const target = findUserByEmail(email.trim().toLowerCase());
  if (!target) {
    const err = new Error("No Commons account exists for that email. Use a seeded demo user.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  if (target.id === ownerId) {
    const err = new Error("You already own this document.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  getDb()
    .prepare(
      `INSERT INTO shares (document_id, user_id, role) VALUES (?, ?, 'editor')
       ON CONFLICT(document_id, user_id) DO UPDATE SET role = 'editor'`,
    )
    .run(docId, target.id);
  return listShares(docId, ownerId);
}

export function unshareDocument(docId: string, ownerId: string, targetUserId: string): ShareRow[] {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!canManageSharing(ownerId, toAccessDoc(row))) {
    const err = new Error("Only the owner can change sharing.");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  getDb().prepare("DELETE FROM shares WHERE document_id = ? AND user_id = ?").run(docId, targetUserId);
  return listShares(docId, ownerId);
}

export function addAttachment(
  docId: string,
  userId: string,
  file: { filename: string; mime: string; size: number; buffer: Buffer },
): AttachmentRow {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!canWrite(userId, toAccessDoc(row))) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const id = randomUUID();
  const rel = path.join("data", "uploads", docId, `${id}-${file.filename}`);
  const abs = path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, file.buffer);
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO attachments (id, document_id, filename, mime, size, path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, docId, file.filename, file.mime, file.size, rel, now);
  return {
    id,
    documentId: docId,
    filename: file.filename,
    mime: file.mime,
    size: file.size,
    createdAt: now,
  };
}

export function listAttachments(docId: string, userId: string): AttachmentRow[] {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row || !canRead(userId, toAccessDoc(row))) {
    const err = new Error("Not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  return getDb()
    .prepare(
      `SELECT id, document_id AS documentId, filename, mime, size, created_at AS createdAt
       FROM attachments WHERE document_id = ? ORDER BY created_at DESC`,
    )
    .all(docId) as AttachmentRow[];
}

export function getAttachmentFile(
  docId: string,
  attachmentId: string,
  userId: string,
): { filename: string; mime: string; absPath: string } | null {
  const row = getDb().prepare("SELECT * FROM documents WHERE id = ?").get(docId) as RawDoc | undefined;
  if (!row || !canRead(userId, toAccessDoc(row))) return null;
  const att = getDb()
    .prepare("SELECT * FROM attachments WHERE id = ? AND document_id = ?")
    .get(attachmentId, docId) as
    | { filename: string; mime: string; path: string }
    | undefined;
  if (!att) return null;
  return { filename: att.filename, mime: att.mime, absPath: path.join(process.cwd(), att.path) };
}

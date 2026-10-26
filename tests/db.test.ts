import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";
import {
  closeDatabase,
  createDocument,
  getDocumentForUser,
  listDocuments,
  shareDocument,
  unshareDocument,
  updateDocument,
  useDatabase,
  verifyPassword,
} from "../src/lib/db.ts";

describe("persistence and sharing", () => {
  beforeEach(() => {
    useDatabase(new Database(":memory:"));
  });

  afterEach(() => {
    closeDatabase();
  });

  it("seeds demo users and lets them sign in", () => {
    const alex = verifyPassword("alex@commons.demo", "commons-demo");
    assert.ok(alex);
    assert.equal(alex.name, "Alex Rivera");
  });

  it("shows owned vs shared documents for each user", () => {
    const alex = verifyPassword("alex@commons.demo", "commons-demo")!;
    const jordan = verifyPassword("jordan@commons.demo", "commons-demo")!;
    const sam = verifyPassword("sam@commons.demo", "commons-demo")!;

    const alexDocs = listDocuments(alex.id);
    const jordanDocs = listDocuments(jordan.id);
    const samDocs = listDocuments(sam.id);

    assert.ok(alexDocs.some((d) => d.title === "Welcome to Commons" && d.myRole === "owner"));
    assert.ok(jordanDocs.some((d) => d.title === "Welcome to Commons" && d.myRole === "editor"));
    assert.ok(jordanDocs.some((d) => d.title === "Q4 kickoff notes" && d.myRole === "owner"));
    assert.equal(
      samDocs.some((d) => d.title === "Welcome to Commons"),
      false,
    );
  });

  it("grants and revokes editor access by email", () => {
    const alex = verifyPassword("alex@commons.demo", "commons-demo")!;
    const sam = verifyPassword("sam@commons.demo", "commons-demo")!;
    const welcome = listDocuments(alex.id).find((d) => d.title === "Welcome to Commons")!;

    assert.equal(getDocumentForUser(welcome.id, sam.id), null);

    shareDocument(welcome.id, alex.id, "sam@commons.demo");
    const shared = getDocumentForUser(welcome.id, sam.id);
    assert.ok(shared);
    assert.equal(shared.myRole, "editor");

    unshareDocument(welcome.id, alex.id, sam.id);
    assert.equal(getDocumentForUser(welcome.id, sam.id), null);
  });

  it("preserves formatting across save and reopen", () => {
    const alex = verifyPassword("alex@commons.demo", "commons-demo")!;
    const created = createDocument(alex.id, "Format check", "<h1>Hello</h1><p><strong>bold</strong></p>");
    const updated = updateDocument(created.id, alex.id, {
      contentHtml: "<h1>Hello</h1><p><em>italic</em></p>",
      contentJson: JSON.stringify({ type: "doc", content: [] }),
    });
    const reopened = getDocumentForUser(created.id, alex.id);
    assert.equal(updated.contentHtml, reopened?.contentHtml);
    assert.match(reopened!.contentHtml, /italic/);
  });

  it("rejects sharing by a non-owner", () => {
    const jordan = verifyPassword("jordan@commons.demo", "commons-demo")!;
    const welcome = listDocuments(jordan.id).find((d) => d.title === "Welcome to Commons")!;
    assert.throws(() => shareDocument(welcome.id, jordan.id, "sam@commons.demo"), /Only the owner/);
  });
});

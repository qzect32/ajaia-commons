import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanShareWith,
  canDelete,
  canManageSharing,
  canRead,
  canWrite,
  roleFor,
  type AccessDocument,
} from "../src/lib/access.ts";

const owner = "alex";
const editor = "jordan";
const stranger = "sam";

const doc: AccessDocument = {
  ownerId: owner,
  shares: [{ userId: editor, role: "editor" }],
};

describe("document access", () => {
  it("treats the owner as owner", () => {
    assert.equal(roleFor(owner, doc), "owner");
    assert.equal(canRead(owner, doc), true);
    assert.equal(canWrite(owner, doc), true);
    assert.equal(canManageSharing(owner, doc), true);
    assert.equal(canDelete(owner, doc), true);
  });

  it("lets an invited editor read and write but not share or delete", () => {
    assert.equal(roleFor(editor, doc), "editor");
    assert.equal(canRead(editor, doc), true);
    assert.equal(canWrite(editor, doc), true);
    assert.equal(canManageSharing(editor, doc), false);
    assert.equal(canDelete(editor, doc), false);
  });

  it("hides the document from users without a share", () => {
    assert.equal(roleFor(stranger, doc), null);
    assert.equal(canRead(stranger, doc), false);
    assert.equal(canWrite(stranger, doc), false);
  });

  it("rejects sharing a document with its owner", () => {
    assert.equal(assertCanShareWith(owner, owner), "You already own this document.");
    assert.equal(assertCanShareWith(owner, editor), null);
  });
});

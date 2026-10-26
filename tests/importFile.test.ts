import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileToHtml, isSupportedImport } from "../src/lib/importFile.ts";

describe("file import", () => {
  it("accepts the documented types and rejects others", () => {
    assert.equal(isSupportedImport("notes.md"), true);
    assert.equal(isSupportedImport("notes.docx"), true);
    assert.equal(isSupportedImport("notes.pdf"), false);
  });

  it("turns a text file into paragraphs", async () => {
    const { html, title } = await fileToHtml("sprint-notes.txt", Buffer.from("Hello\n\nWorld"));
    assert.equal(title, "sprint notes");
    assert.match(html, /<p>Hello<\/p>/);
    assert.match(html, /<p>World<\/p>/);
  });

  it("renders markdown headings", async () => {
    const { html } = await fileToHtml("spec.md", Buffer.from("# Title\n\nA **bold** line."));
    assert.match(html, /<h1.*>Title<\/h1>/);
    assert.match(html, /<strong>bold<\/strong>/);
  });
});

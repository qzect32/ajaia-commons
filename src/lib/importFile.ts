import { marked } from "marked";
import mammoth from "mammoth";

export const SUPPORTED_IMPORT_TYPES = [".txt", ".md", ".html", ".htm", ".docx"] as const;

export function isSupportedImport(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_IMPORT_TYPES.some((ext) => lower.endsWith(ext));
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported document";
}

export async function fileToHtml(
  filename: string,
  buffer: Buffer,
): Promise<{ html: string; title: string }> {
  if (!isSupportedImport(filename)) {
    throw new Error("Unsupported file type. Import .txt, .md, .html, or .docx.");
  }

  const title = titleFromFilename(filename);
  const lower = filename.toLowerCase();

  if (lower.endsWith(".txt")) {
    const text = buffer.toString("utf8");
    const html = text
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br>")}</p>`)
      .join("");
    return { html: html || "<p></p>", title };
  }

  if (lower.endsWith(".md")) {
    const html = await marked.parse(buffer.toString("utf8"), { async: true });
    return { html, title };
  }

  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return { html: buffer.toString("utf8"), title };
  }

  const result = await mammoth.convertToHtml({ buffer });
  return { html: result.value || "<p></p>", title };
}

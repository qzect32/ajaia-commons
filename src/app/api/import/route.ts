import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument, updateDocument } from "@/lib/db";
import { fileToHtml, isSupportedImport } from "@/lib/importFile";
import { jsonError } from "@/lib/http";
import { assertStorageRoom, assertUploadSize } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const targetId = String(form.get("documentId") || "");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to import." }, { status: 400 });
    }
    assertUploadSize(file.size);
    assertStorageRoom(file.size);
    if (!isSupportedImport(file.name)) {
      return NextResponse.json(
        { error: "Unsupported type. Import .txt, .md, .html, or .docx." },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { html, title } = await fileToHtml(file.name, buffer);
    const json = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    if (targetId) {
      const document = updateDocument(targetId, user.id, {
        contentHtml: html,
        contentJson: json,
      });
      return NextResponse.json({ document, importedInto: "existing" });
    }
    const document = createDocument(user.id, title, html, json);
    return NextResponse.json({ document, importedInto: "new" }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

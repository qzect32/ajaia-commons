import fs from "fs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAttachmentFile } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, attachmentId } = await context.params;
    const file = getAttachmentFile(id, attachmentId, user.id);
    if (!file || !fs.existsSync(file.absPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const bytes = fs.readFileSync(file.absPath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.filename.replaceAll('"', "")}"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

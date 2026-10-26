import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ documents: listDocuments(user.id) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const document = createDocument(user.id);
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

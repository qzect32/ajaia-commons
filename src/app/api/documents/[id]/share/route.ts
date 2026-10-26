import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listShares, shareDocument, unshareDocument } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const shareSchema = z.object({
  email: z.string().email(),
});

const unshareSchema = z.object({
  userId: z.string().min(1),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return NextResponse.json({ shares: listShares(id, user.id) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { email } = shareSchema.parse(await request.json());
    const shares = shareDocument(id, user.id, email);
    return NextResponse.json({ shares });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    return jsonError(err);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { userId } = unshareSchema.parse(await request.json());
    const shares = unshareDocument(id, user.id, userId);
    return NextResponse.json({ shares });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }
    return jsonError(err);
  }
}

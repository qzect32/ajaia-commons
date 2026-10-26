import { NextResponse } from "next/server";

export function jsonError(err: unknown): NextResponse {
  const status = (err as { status?: number }).status ?? 500;
  const message = err instanceof Error ? err.message : "Server error";
  return NextResponse.json({ error: message }, { status: status >= 400 ? status : 500 });
}

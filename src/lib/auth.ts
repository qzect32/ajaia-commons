import crypto from "crypto";
import { cookies } from "next/headers";
import { findUserById, type PublicUser } from "./db";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
const SECRET = process.env.SESSION_SECRET || "commons-dev-secret-not-for-prod";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function signSession(userId: string): string {
  const exp = String(Date.now() + TTL_MS);
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!userId || !exp || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(`${userId}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const userId = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return findUserById(userId);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

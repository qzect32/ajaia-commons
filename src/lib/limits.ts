import { statfsSync } from "fs";
import path from "path";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_DATA_BYTES = 15 * 1024 * 1024 * 1024;
export const KILL_DATE = "2027-11-15";

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), "data", "commons.db"));
}

export function assertUploadSize(size: number): void {
  if (size > MAX_UPLOAD_BYTES) {
    const err = new Error("File is larger than 100 MB.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
}

export function assertStorageRoom(additionalBytes: number): void {
  const dir = dataDir();
  let available = MAX_DATA_BYTES;
  try {
    const s = statfsSync(dir);
    available = Number(s.bavail) * Number(s.bsize);
  } catch {
    // Directory may not exist yet; caller creates it.
  }
  if (additionalBytes > available) {
    const err = new Error("Storage quota exceeded (15 GB allocated to this host).");
    (err as Error & { status: number }).status = 507;
    throw err;
  }
}

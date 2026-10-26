export type AccessRole = "owner" | "editor";

export type AccessDocument = {
  ownerId: string;
  shares: { userId: string; role: AccessRole }[];
};

export function roleFor(userId: string, doc: AccessDocument): AccessRole | null {
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  return share?.role ?? null;
}

export function canRead(userId: string, doc: AccessDocument): boolean {
  return roleFor(userId, doc) !== null;
}

export function canWrite(userId: string, doc: AccessDocument): boolean {
  const role = roleFor(userId, doc);
  return role === "owner" || role === "editor";
}

export function canManageSharing(userId: string, doc: AccessDocument): boolean {
  return roleFor(userId, doc) === "owner";
}

export function canDelete(userId: string, doc: AccessDocument): boolean {
  return roleFor(userId, doc) === "owner";
}

export function assertCanShareWith(ownerId: string, targetUserId: string): string | null {
  if (ownerId === targetUserId) return "You already own this document.";
  return null;
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DocumentEditor = dynamic(() => import("@/components/DocumentEditor"), { ssr: false });

type User = { id: string; email: string; name: string };
type Doc = {
  id: string;
  title: string;
  contentHtml: string;
  myRole: "owner" | "editor";
  ownerName: string;
  updatedAt: string;
};
type Share = { userId: string; email: string; name: string; role: "editor" };
type Attachment = { id: string; filename: string; mime: string; size: number; createdAt: string };

function preview(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 88);
}

export default function Workspace() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [shares, setShares] = useState<Share[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [banner, setBanner] = useState("");
  const [query, setQuery] = useState("");
  const [editorNonce, setEditorNonce] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const intoCurrentRef = useRef(false);

  const active = docs.find((d) => d.id === activeId) || null;

  const loadDocs = useCallback(async (preferredId?: string | null) => {
    const response = await fetch("/api/documents");
    if (response.status === 401) {
      router.push("/");
      return [];
    }
    const data = await response.json();
    const list = (data.documents || []) as Doc[];
    setDocs(list);
    return list;
  }, [router]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok) {
        router.push("/");
        return;
      }
      const body = await me.json();
      setUser(body.user);
      const list = await loadDocs();
      if (list[0]) selectDoc(list[0]);
    })();
  }, [loadDocs, router]);

  async function selectDoc(doc: Doc) {
    const response = await fetch(`/api/documents/${doc.id}`);
    const data = await response.json();
    if (!response.ok) {
      setBanner(data.error || "Could not open document.");
      return;
    }
    const full = data.document as Doc;
    setActiveId(full.id);
    setTitle(full.title);
    setHtml(full.contentHtml);
    setEditorNonce((n) => n + 1);
    setSaveState("saved");
    const [shareRes, attRes] = await Promise.all([
      fetch(`/api/documents/${full.id}/share`),
      fetch(`/api/documents/${full.id}/attachments`),
    ]);
    const shareData = await shareRes.json();
    const attData = await attRes.json();
    setShares(shareData.shares || []);
    setAttachments(attData.attachments || []);
  }

  function queueSave(next: { title?: string; contentJson?: string; contentHtml?: string }) {
    if (!activeId) return;
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const response = await fetch(`/api/documents/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      const data = await response.json();
      setDocs((current) => current.map((d) => (d.id === data.document.id ? { ...d, ...data.document } : d)));
      setSaveState("saved");
    }, 700);
  }

  async function createDoc() {
    const response = await fetch("/api/documents", { method: "POST" });
    const data = await response.json();
    if (!response.ok) return;
    await loadDocs();
    await selectDoc(data.document);
  }

  async function importFile(file: File, intoCurrent: boolean) {
    const form = new FormData();
    form.set("file", file);
    if (intoCurrent && activeId) form.set("documentId", activeId);
    const response = await fetch("/api/import", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      setBanner(data.error || "Import failed.");
      return;
    }
    setBanner(`Imported ${file.name}. Supported types: .txt, .md, .html, .docx.`);
    await loadDocs();
    await selectDoc(data.document);
  }

  async function attachFile(file: File) {
    if (!activeId) return;
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/documents/${activeId}/attachments`, { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      setBanner(data.error || "Attach failed.");
      return;
    }
    setAttachments((current) => [data.attachment, ...current]);
  }

  async function share() {
    if (!activeId) return;
    setShareError("");
    const response = await fetch(`/api/documents/${activeId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: shareEmail }),
    });
    const data = await response.json();
    if (!response.ok) {
      setShareError(data.error || "Could not share.");
      return;
    }
    setShares(data.shares);
    setShareEmail("");
  }

  async function revoke(userId: string) {
    if (!activeId) return;
    const response = await fetch(`/api/documents/${activeId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    if (response.ok) setShares(data.shares);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const owned = useMemo(
    () => docs.filter((d) => d.myRole === "owner" && d.title.toLowerCase().includes(query.toLowerCase())),
    [docs, query],
  );
  const shared = useMemo(
    () => docs.filter((d) => d.myRole !== "owner" && d.title.toLowerCase().includes(query.toLowerCase())),
    [docs, query],
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-rule bg-paper-strong md:flex">
        <div className="border-b border-rule px-4 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-ink-soft">Commons</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">{user?.name}</p>
          <p className="mt-1 text-xs text-ink-soft">{user?.email}</p>
        </div>
        <div className="flex gap-2 px-3 py-3">
          <button type="button" onClick={createDoc} className="flex-1 bg-ink px-3 py-2 text-sm text-paper-strong">
            New
          </button>
          <button
            type="button"
            onClick={() => {
              intoCurrentRef.current = false;
              importRef.current?.click();
            }}
            className="flex-1 border border-rule px-3 py-2 text-sm"
          >
            Import
          </button>
        </div>
        <p className="px-4 pb-2 text-[11px] leading-snug text-ink-soft">
          Import .txt, .md, .html, or .docx as a new document. Max 100 MB. Host quota 15 GB.
        </p>
        <input
          className="mx-3 mb-3 border border-rule bg-paper px-3 py-2 text-sm"
          placeholder="Filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Owned</p>
          {owned.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => selectDoc(doc)}
              className={`mb-1 w-full px-2 py-2 text-left ${doc.id === activeId ? "bg-accent-soft" : "hover:bg-paper"}`}
            >
              <span className="block truncate text-sm">{doc.title}</span>
              <span className="block truncate text-[11px] text-ink-soft">{preview(doc.contentHtml) || "Empty"}</span>
            </button>
          ))}
          <p className="mt-4 px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Shared with me</p>
          {shared.length === 0 ? (
            <p className="px-2 text-xs text-ink-soft">Nothing shared yet.</p>
          ) : (
            shared.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => selectDoc(doc)}
                className={`mb-1 w-full px-2 py-2 text-left ${doc.id === activeId ? "bg-accent-soft" : "hover:bg-paper"}`}
              >
                <span className="block truncate text-sm">{doc.title}</span>
                <span className="block truncate text-[11px] text-ink-soft">From {doc.ownerName}</span>
              </button>
            ))
          )}
        </nav>
        <button type="button" onClick={logout} className="border-t border-rule px-4 py-3 text-left text-sm">
          Sign out
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-rule bg-paper/90 px-4 py-3 backdrop-blur md:px-8">
          <input
            className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-display)] text-xl outline-none md:text-2xl"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              queueSave({ title: e.target.value });
            }}
            disabled={!active}
          />
          <span className="hidden text-xs uppercase tracking-[0.16em] text-ink-soft sm:inline">
            {saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}
          </span>
          {active ? (
            <span className="hidden rounded-full border border-rule px-2 py-1 text-[11px] uppercase tracking-[0.14em] sm:inline">
              {active.myRole === "owner" ? "Owner" : "Shared editor"}
            </span>
          ) : null}
          <button
            type="button"
            className="border border-rule px-3 py-2 text-sm"
            onClick={() => setShareOpen(true)}
            disabled={!active}
          >
            Share
          </button>
        </header>

        {banner ? (
          <p className="border-b border-rule px-4 py-2 text-sm md:px-8">
            {banner}{" "}
            <button type="button" className="underline" onClick={() => setBanner("")}>
              Dismiss
            </button>
          </p>
        ) : null}

        <div className="flex-1 px-4 py-6 md:px-16 md:py-10">
          {active ? (
            <div className="mx-auto max-w-3xl">
              <DocumentEditor
                key={`${active.id}-${editorNonce}`}
                html={html}
                onChange={(json, nextHtml) => {
                  setHtml(nextHtml);
                  queueSave({ contentJson: json, contentHtml: nextHtml });
                }}
              />
              <section className="mt-12 border-t border-rule pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-ink-soft">Attachments</h3>
                  <button type="button" className="text-sm underline" onClick={() => attachRef.current?.click()}>
                    Attach file
                  </button>
                </div>
                {attachments.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">No files attached. Any file up to 100 MB (15 GB host quota).</p>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {attachments.map((file) => (
                      <li key={file.id}>
                        <a className="text-sm underline" href={`/api/documents/${active.id}/attachments/${file.id}`}>
                          {file.filename}
                        </a>
                        <span className="ml-2 text-xs text-ink-soft">{Math.ceil(file.size / 1024)} KB</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="mt-4 text-sm underline"
                  onClick={() => {
                    intoCurrentRef.current = true;
                    importRef.current?.click();
                  }}
                >
                  Replace this draft with an imported .txt / .md / .html / .docx
                </button>
              </section>
            </div>
          ) : (
            <p className="text-ink-soft">Create or import a document to begin.</p>
          )}
        </div>
      </main>

      <input
        ref={importRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.html,.htm,.docx,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFile(file, intoCurrentRef.current);
        }}
      />
      <input
        ref={attachRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void attachFile(file);
        }}
      />

      {shareOpen && active ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 p-4 md:items-center">
          <div className="w-full max-w-md border border-rule bg-paper-strong p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">Share</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {active.myRole === "owner"
                    ? "Grant another seeded user editor access."
                    : "Only the owner can change access."}
                </p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} className="text-sm">
                Close
              </button>
            </div>
            {active.myRole === "owner" ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void share();
                }}
              >
                <input
                  className="flex-1 border border-rule bg-paper px-3 py-2 text-sm"
                  placeholder="jordan@commons.demo"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <button type="submit" className="bg-ink px-3 py-2 text-sm text-paper-strong">
                  Grant
                </button>
              </form>
            ) : null}
            {shareError ? <p className="mt-2 text-sm text-accent">{shareError}</p> : null}
            <ul className="mt-4 space-y-2">
              <li className="flex justify-between text-sm">
                <span>{active.ownerName} · owner</span>
              </li>
              {shares.map((person) => (
                <li key={person.userId} className="flex items-center justify-between text-sm">
                  <span>
                    {person.name} · editor
                    <span className="block text-xs text-ink-soft">{person.email}</span>
                  </span>
                  {active.myRole === "owner" ? (
                    <button type="button" className="underline" onClick={() => void revoke(person.userId)}>
                      Revoke
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

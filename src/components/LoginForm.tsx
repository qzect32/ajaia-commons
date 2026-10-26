"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO = [
  { email: "alex@commons.demo", name: "Alex Rivera", note: "Owns Welcome to Commons" },
  { email: "jordan@commons.demo", name: "Jordan Lee", note: "Already has editor access" },
  { email: "sam@commons.demo", name: "Sam Okonkwo", note: "No shares yet" },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("alex@commons.demo");
  const [password, setPassword] = useState("commons-demo");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((response) => {
      if (response.ok) router.replace("/workspace");
    });
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not sign in.");
        return;
      }
      router.push("/workspace");
      router.refresh();
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between px-8 py-10 md:px-14 md:py-16">
        <p className="text-xs tracking-[0.28em] uppercase text-ink-soft">Ajaia take-home · internal tool</p>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] md:text-7xl">
            Commons
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Shared writing for teams that need to move. Create a document, shape it, pass it to
            someone else. Not every Google Docs feature — the ones that matter in an afternoon.
          </p>
        </div>
        <p className="text-sm text-ink-soft">Demo password for every account: commons-demo</p>
      </section>

      <section className="flex items-center border-t border-rule bg-paper-strong px-8 py-10 md:border-l md:border-t-0 md:px-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Sign in</h2>
          <p className="mt-2 text-sm text-ink-soft">Seeded accounts. No signup in this slice.</p>

          <label className="mt-8 block text-xs uppercase tracking-[0.18em] text-ink-soft">Email</label>
          <input
            className="mt-2 w-full border border-rule bg-paper px-3 py-2.5 text-ink"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            required
          />

          <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-ink-soft">Password</label>
          <input
            className="mt-2 w-full border border-rule bg-paper px-3 py-2.5 text-ink"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />

          {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full bg-ink px-4 py-3 text-sm tracking-wide text-paper-strong disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Enter workspace"}
          </button>

          <ul className="mt-8 space-y-2">
            {DEMO.map((person) => (
              <li key={person.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(person.email);
                    setPassword("commons-demo");
                  }}
                  className="w-full border border-rule px-3 py-2 text-left text-sm hover:bg-accent-soft"
                >
                  <span className="block font-medium">{person.name}</span>
                  <span className="block text-ink-soft">
                    {person.email} · {person.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </form>
      </section>
    </div>
  );
}

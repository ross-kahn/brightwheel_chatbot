"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CENTER } from "@/lib/center";
import type { Question, Section } from "@/lib/db";
import { Inbox } from "./inbox";
import { Knowledge } from "./knowledge";
import { Questions } from "./questions";

type Tab = "inbox" | "questions" | "knowledge";

// The operator control center: loads the question log and knowledge base once
// and shares them across the three tabs.
// PROTOTYPE: there is no login, and failed requests are not surfaced to the
// user. Production would require a staff session and show errors.
export default function Admin() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  // Fetches both lists; tabs call this again after every change.
  const load = useCallback(async () => {
    const [q, s] = await Promise.all([
      fetch("/api/questions").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
    ]);
    setQuestions(q);
    setSections(s);
  }, []);

  // Initial load, deferred a tick so state isn't set during the effect itself.
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const inbox = questions?.filter((q) => q.status === "needs_review") ?? [];
  const tabs: [Tab, string][] = [
    ["inbox", `Needs you${questions ? ` (${inbox.length})` : ""}`],
    ["questions", "All questions"],
    ["knowledge", "Knowledge"],
  ];

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-4">
        <div>
          <h1 className="text-lg font-semibold">Front desk control center</h1>
          <p className="text-xs text-stone-500">{CENTER.name}</p>
        </div>
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
          Parent view
        </Link>
      </header>

      <nav className="flex gap-1 rounded-xl bg-stone-200/70 p-1 text-sm font-medium">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-2 py-2 ${tab === id ? "bg-white shadow-sm" : "text-stone-600"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="mt-5">
        {!questions ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : tab === "inbox" ? (
          <Inbox items={inbox} reload={load} />
        ) : tab === "questions" ? (
          <Questions questions={questions} sections={sections} />
        ) : (
          <Knowledge sections={sections} reload={load} />
        )}
      </main>
    </div>
  );
}

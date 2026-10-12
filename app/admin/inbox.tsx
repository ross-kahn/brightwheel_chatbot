"use client";

import { useState } from "react";
import type { Question } from "@/lib/db";
import { sendJson } from "@/lib/http";
import { Badge, categoryLabel, timeAgo } from "./shared";

// The "Needs you" tab: every question the assistant couldn't fully handle.
export function Inbox({ items, reload }: { items: Question[]; reload: () => Promise<void> }) {
  if (!items.length) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-sm text-stone-600">
        Nothing needs you right now. The assistant is handling it.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Questions the assistant couldn&apos;t fully handle. Write the answer once and it will use it
        for every parent who asks next.
      </p>
      {items.map((q) => (
        <InboxCard key={q.id} q={q} reload={reload} />
      ))}
    </div>
  );
}

// One inbox question with the box where staff write the answer.
// PROTOTYPE: the answer is saved to the knowledge base exactly as typed.
// Production would review it first for child-specific details.
function InboxCard({ q, reload }: { q: Question; reload: () => Promise<void> }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  // Resolves or dismisses the question, then refreshes the lists.
  async function act(body: object) {
    setBusy(true);
    await sendJson(`/api/questions/${q.id}`, "PATCH", body);
    await reload();
    setBusy(false);
  }

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Badge mode={q.mode} />
        {q.feedback === "down" && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
            👎 Parent said not helpful
          </span>
        )}
        <span>{categoryLabel(q.category)}</span>
        <span>· {timeAgo(q.created_at)}</span>
      </div>
      <p className="mt-2 font-medium">&ldquo;{q.text}&rdquo;</p>
      <p className="mt-1 text-sm text-stone-600">
        <span className="font-medium text-stone-700">Assistant said:</span> {q.answer}
      </p>
      {q.contact && (
        <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          Parent asked for a reply: <span className="font-medium">{q.contact}</span>
        </p>
      )}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder="Write the answer parents should get…"
        className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          disabled={busy || !answer.trim()}
          onClick={() => act({ resolve: { body: answer } })}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save and teach the assistant
        </button>
        <button
          disabled={busy}
          onClick={() => act({ dismiss: true })}
          className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          No change needed
        </button>
      </div>
    </article>
  );
}

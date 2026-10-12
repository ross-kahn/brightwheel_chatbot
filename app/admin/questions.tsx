"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/center";
import type { Question, Section } from "@/lib/db";
import { Badge, categoryLabel, timeAgo } from "./shared";

// True when a question needed a person: not answered, or the parent disliked it.
function struggled(q: Question) {
  return q.mode !== "answered" || q.feedback === "down";
}

// The "All questions" tab: headline numbers, a breakdown by topic and the
// filterable log.
// PROTOTYPE: stats are computed in the browser from the loaded rows.
// Production would aggregate in the database over a chosen date range.
export function Questions({ questions, sections }: { questions: Question[]; sections: Section[] }) {
  const [mode, setMode] = useState("all");
  const [category, setCategory] = useState("all");

  const total = questions.length;
  const answered = questions.filter((q) => !struggled(q)).length;
  const open = questions.filter((q) => q.status === "needs_review").length;
  const byCategory = CATEGORIES.map((c) => {
    const inCategory = questions.filter((q) => q.category === c);
    return { c, count: inCategory.length, struggled: inCategory.filter(struggled).length };
  }).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...byCategory.map((x) => x.count));
  const titles = new Map(sections.map((s) => [s.id, s.title]));

  const shown = questions.filter(
    (q) => (mode === "all" || q.mode === mode) && (category === "all" || q.category === category),
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [total, "questions asked"],
          [total ? `${Math.round((answered / total) * 100)}%` : "–", "answered without staff"],
          [open, "waiting on you"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-stone-500">{label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">What parents ask about</h2>
        <p className="text-xs text-stone-500">
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-indigo-500" />
          answered
          <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
          needed staff
        </p>
        <div className="mt-3 space-y-2">
          {byCategory.map(({ c, count, struggled }) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "all" : c)}
              className="flex w-full items-center gap-3 text-left text-sm"
            >
              <span className={`w-36 shrink-0 truncate ${category === c ? "font-semibold" : ""}`}>
                {CATEGORY_LABELS[c]}
              </span>
              <span className="flex h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                <span className="bg-indigo-500" style={{ width: `${((count - struggled) / max) * 100}%` }} />
                <span className="bg-amber-400" style={{ width: `${(struggled / max) * 100}%` }} />
              </span>
              <span className="w-6 shrink-0 text-right tabular-nums text-stone-600">{count}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-sm">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-label="Filter by outcome"
          className="rounded-lg border border-stone-300 bg-white px-2 py-2"
        >
          <option value="all">All outcomes</option>
          <option value="answered">Answered</option>
          <option value="unknown">Couldn&apos;t answer</option>
          <option value="sensitive">Sensitive</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by topic"
          className="rounded-lg border border-stone-300 bg-white px-2 py-2"
        >
          <option value="all">All topics</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-stone-500">{shown.length} shown</span>
      </div>

      <ul className="space-y-2">
        {shown.map((q) => (
          <li key={q.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <Badge mode={q.mode} />
              <span>{categoryLabel(q.category)}</span>
              <span>· {timeAgo(q.created_at)}</span>
              {q.feedback && <span>{q.feedback === "up" ? "👍" : "👎"}</span>}
              {q.status === "resolved" && <span className="text-emerald-700">· resolved</span>}
            </div>
            <p className="mt-1.5 text-sm font-medium">{q.text}</p>
            <p className="mt-1 text-sm text-stone-600">{q.answer}</p>
            {!!q.section_ids.length && (
              <p className="mt-1 text-xs text-stone-500">
                Sources: {q.section_ids.map((id) => titles.get(id) ?? "(deleted section)").join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

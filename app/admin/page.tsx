"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, CENTER, type Category } from "@/lib/center";
import type { Question, Section } from "@/lib/db";

type Tab = "inbox" | "questions" | "knowledge";

const MODE_STYLE: Record<Question["mode"], string> = {
  answered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  unknown: "bg-amber-50 text-amber-800 ring-amber-200",
  sensitive: "bg-rose-50 text-rose-800 ring-rose-200",
};

const MODE_LABEL: Record<Question["mode"], string> = {
  answered: "Answered",
  unknown: "Couldn't answer",
  sensitive: "Sensitive",
};

function send(url: string, method: string, body?: object) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

function categoryLabel(c: string) {
  return CATEGORY_LABELS[c as Category] ?? c;
}

function Badge({ mode }: { mode: Question["mode"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${MODE_STYLE[mode]}`}>
      {MODE_LABEL[mode]}
    </span>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    const [q, s] = await Promise.all([
      fetch("/api/questions").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
    ]);
    setQuestions(q);
    setSections(s);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const inbox = questions?.filter((q) => q.status === "needs_review") ?? [];

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
        {(
          [
            ["inbox", `Needs you${questions ? ` (${inbox.length})` : ""}`],
            ["questions", "All questions"],
            ["knowledge", "Knowledge"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
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

function Inbox({ items, reload }: { items: Question[]; reload: () => Promise<void> }) {
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

function InboxCard({ q, reload }: { q: Question; reload: () => Promise<void> }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: object) {
    setBusy(true);
    await send(`/api/questions/${q.id}`, "PATCH", body);
    await reload();
    setBusy(false);
  }

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <Badge mode={q.mode} />
        {q.feedback === "down" && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-700">👎 Parent said not helpful</span>
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

function Questions({ questions, sections }: { questions: Question[]; sections: Section[] }) {
  const [mode, setMode] = useState("all");
  const [category, setCategory] = useState("all");

  const total = questions.length;
  const answered = questions.filter((q) => q.mode === "answered" && q.feedback !== "down").length;
  const open = questions.filter((q) => q.status === "needs_review").length;
  const byCategory = CATEGORIES.map((c) => {
    const inCategory = questions.filter((q) => q.category === c);
    return {
      c,
      count: inCategory.length,
      struggled: inCategory.filter((q) => q.mode !== "answered" || q.feedback === "down").length,
    };
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
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-indigo-500" />answered
          <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />needed staff
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
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-2">
          <option value="all">All outcomes</option>
          <option value="answered">Answered</option>
          <option value="unknown">Couldn&apos;t answer</option>
          <option value="sensitive">Sensitive</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-2">
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

function Knowledge({ sections, reload }: { sections: Section[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          Everything the assistant knows. Edits take effect on the next question.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Add section
        </button>
      </div>

      {editing === "new" && (
        <SectionForm
          onCancel={() => setEditing(null)}
          onSave={async (data) => {
            await send("/api/sections", "POST", data);
            await reload();
            setEditing(null);
          }}
        />
      )}

      {sections.map((s) =>
        editing === s.id ? (
          <SectionForm
            key={s.id}
            section={s}
            onCancel={() => setEditing(null)}
            onSave={async (data) => {
              await send(`/api/sections/${s.id}`, "PUT", data);
              await reload();
              setEditing(null);
            }}
            onDelete={async () => {
              if (!confirm(`Delete "${s.title}"? The assistant will stop using it.`)) return;
              await send(`/api/sections/${s.id}`, "DELETE");
              await reload();
              setEditing(null);
            }}
          />
        ) : (
          <article key={s.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{s.title}</h3>
                {s.source === "operator_answer" && (
                  <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800 ring-1 ring-indigo-200">
                    Added from a parent question
                  </span>
                )}
              </div>
              <button onClick={() => setEditing(s.id)} className="text-sm font-medium text-indigo-600">
                Edit
              </button>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-stone-600">{s.body}</p>
          </article>
        ),
      )}
    </div>
  );
}

function SectionForm({
  section,
  onSave,
  onCancel,
  onDelete,
}: {
  section?: Section;
  onSave: (data: { title: string; body: string }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(section?.title ?? "");
  const [body, setBody] = useState(section?.body ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-2 rounded-xl bg-white p-4 shadow-sm ring-2 ring-indigo-200"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({ title, body });
        setBusy(false);
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title, e.g. Parking and drop-off"
        aria-label="Section title"
        required
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base font-medium outline-none focus:border-indigo-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.min(18, Math.max(4, body.split("\n").length + 2))}
        placeholder="Write the policy in plain language."
        aria-label="Section text"
        required
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

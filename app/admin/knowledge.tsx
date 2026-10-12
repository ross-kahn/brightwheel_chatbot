"use client";

import { useState } from "react";
import type { Section, SectionInput } from "@/lib/db";
import { sendJson } from "@/lib/http";

// The "Knowledge" tab: every section the assistant answers from, editable in place.
export function Knowledge({ sections, reload }: { sections: Section[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);

  // Runs a create, update or delete, then refreshes and closes the form.
  async function save(request: Promise<Response>) {
    await request;
    await reload();
    setEditing(null);
  }

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
          onSave={(data) => save(sendJson("/api/sections", "POST", data))}
        />
      )}

      {sections.map((s) =>
        editing === s.id ? (
          <SectionForm
            key={s.id}
            section={s}
            onCancel={() => setEditing(null)}
            onSave={(data) => save(sendJson(`/api/sections/${s.id}`, "PUT", data))}
            onDelete={async () => {
              if (!confirm(`Delete "${s.title}"? The assistant will stop using it.`)) return;
              await save(sendJson(`/api/sections/${s.id}`, "DELETE"));
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

// Title and text form used for both adding and editing a section.
function SectionForm({
  section,
  onSave,
  onCancel,
  onDelete,
}: {
  section?: Section;
  onSave: (data: SectionInput) => Promise<void>;
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
        <button
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

// Display helpers shared by the operator tabs.
import { CATEGORY_LABELS, type Category } from "@/lib/center";
import type { Question } from "@/lib/db";

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

// Coloured pill showing how the assistant handled a question.
export function Badge({ mode }: { mode: Question["mode"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${MODE_STYLE[mode]}`}>
      {MODE_LABEL[mode]}
    </span>
  );
}

// Short relative time such as "5m ago", "3h ago" or "2d ago".
export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 60 / 24)}d ago`;
}

// Human label for a stored category, falling back to the raw value.
export function categoryLabel(c: string) {
  return CATEGORY_LABELS[c as Category] ?? c;
}

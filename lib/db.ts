import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

export type Section = {
  id: number;
  title: string;
  body: string;
  source: "handbook" | "operator_answer";
  from_question_id: number | null;
  updated_at: string;
};

export type Mode = "answered" | "unknown" | "sensitive";

export type Question = {
  id: number;
  session_id: string;
  text: string;
  answer: string;
  mode: Mode;
  category: string;
  section_ids: number[];
  feedback: "up" | "down" | null;
  contact: string | null;
  status: "ok" | "needs_review" | "resolved";
  created_at: string;
};

export async function listSections(): Promise<Section[]> {
  return (await sql()`SELECT * FROM sections ORDER BY id`) as Section[];
}

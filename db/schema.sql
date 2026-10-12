CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'handbook' CHECK (source IN ('handbook', 'operator_answer')),
  from_question_id INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  text TEXT NOT NULL,
  answer TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('answered', 'unknown', 'sensitive')),
  category TEXT NOT NULL,
  section_ids INTEGER[] NOT NULL DEFAULT '{}',
  feedback TEXT CHECK (feedback IN ('up', 'down')),
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'needs_review', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_status_idx ON questions (status, created_at DESC);

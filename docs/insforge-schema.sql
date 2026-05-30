-- InsForge schema for AI Kubernetes Agent
-- Run in your InsForge project SQL console (or via insforge CLI)

CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  root_cause TEXT,
  confidence INTEGER,
  status TEXT DEFAULT 'completed',
  diagnosis JSONB,
  context TEXT,
  namespace TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_investigations ON investigations;
CREATE POLICY users_own_investigations ON investigations FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS investigation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE investigation_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_investigation_progress ON investigation_progress;
CREATE POLICY users_own_investigation_progress ON investigation_progress FOR ALL TO authenticated
  USING (investigation_id IN (SELECT id FROM investigations WHERE user_id = auth.uid()))
  WITH CHECK (investigation_id IN (SELECT id FROM investigations WHERE user_id = auth.uid()));

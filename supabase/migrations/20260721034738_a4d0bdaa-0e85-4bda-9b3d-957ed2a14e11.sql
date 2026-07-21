
CREATE TABLE public.general_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  duration_minutes INTEGER,
  intensity TEXT CHECK (intensity IN ('light','moderate','hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.general_sessions TO authenticated;
GRANT ALL ON public.general_sessions TO service_role;

ALTER TABLE public.general_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own general sessions"
  ON public.general_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX general_sessions_user_date_idx ON public.general_sessions (user_id, date DESC);

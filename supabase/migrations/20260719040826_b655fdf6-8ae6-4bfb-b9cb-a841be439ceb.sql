
-- Make exercises per-user so authenticated users can only modify their own catalog rows.
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing seeded rows to the single existing user (if any).
UPDATE public.exercises
SET user_id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE public.exercises ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Exercises readable by authenticated" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can delete exercises" ON public.exercises;

CREATE POLICY "Users can view own exercises" ON public.exercises
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises" ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises" ON public.exercises
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises" ON public.exercises
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

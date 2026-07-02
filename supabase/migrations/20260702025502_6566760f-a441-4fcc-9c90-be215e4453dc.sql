
-- Exercises catalog (global reference data)
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day TEXT NOT NULL, -- 'monday', 'tuesday', etc.
  name TEXT NOT NULL,
  scheme TEXT NOT NULL,
  muscle_group TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exercises readable by authenticated" ON public.exercises FOR SELECT TO authenticated USING (true);

-- Workout logs
CREATE TABLE public.workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  reps INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout_logs" ON public.workout_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.workout_logs (user_id, date);

-- Personal records
CREATE TABLE public.personal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own PRs" ON public.personal_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PR history (all beat entries)
CREATE TABLE public.pr_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pr_history TO authenticated;
GRANT ALL ON public.pr_history TO service_role;
ALTER TABLE public.pr_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own PR history" ON public.pr_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Body weight logs
CREATE TABLE public.body_weight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_weight_logs TO authenticated;
GRANT ALL ON public.body_weight_logs TO service_role;
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own body_weight_logs" ON public.body_weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('bulk', 'cut')),
  start_weight NUMERIC NOT NULL,
  goal_weight NUMERIC NOT NULL,
  target_rate NUMERIC NOT NULL, -- kg per week (positive for bulk, positive value for cut too, direction implied by type)
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed exercises
INSERT INTO public.exercises (day, name, scheme, muscle_group, order_index) VALUES
-- Monday Push Heavy
('monday', 'Barbell Bench Press', '5×5 (last set AMRAP)', 'Chest', 1),
('monday', 'Incline Dumbbell Press', '4×8–10', 'Chest', 2),
('monday', 'Weighted Dips', '3×8–10', 'Chest', 3),
('monday', 'Seated Dumbbell Shoulder Press', '3×8–10', 'Shoulders', 4),
('monday', 'Cable Lateral Raises', '4×12–15 (drop set last)', 'Shoulders', 5),
('monday', 'Overhead Triceps Extension', '3×10–12', 'Triceps', 6),
('monday', 'Triceps Pushdown (superset)', '3×12–15', 'Triceps', 7),
-- Tuesday Pull Heavy
('tuesday', 'Deadlifts', '5×5', 'Back', 1),
('tuesday', 'Weighted Pull-ups', '4×6–8', 'Back', 2),
('tuesday', 'Pendlay Rows', '4×8', 'Back', 3),
('tuesday', 'Single-arm Dumbbell Rows', '3×10/side', 'Back', 4),
('tuesday', 'Face Pulls', '4×15', 'Rear Delts', 5),
('tuesday', 'Barbell Curls', '4×8–10', 'Biceps', 6),
('tuesday', 'Incline Dumbbell Curls', '3×10–12 (drop set last)', 'Biceps', 7),
-- Wednesday Legs Heavy
('wednesday', 'Back Squats', '5×5', 'Quads', 1),
('wednesday', 'Romanian Deadlifts', '4×8', 'Hamstrings', 2),
('wednesday', 'Leg Press', '4×12 (heavy)', 'Quads', 3),
('wednesday', 'Walking Lunges', '3×12/leg', 'Quads', 4),
('wednesday', 'Leg Curls', '4×12', 'Hamstrings', 5),
('wednesday', 'Standing Calf Raises', '3×12–15', 'Calves', 6),
-- Thursday Push Volume
('thursday', 'Incline Barbell Press', '4×8–10', 'Chest', 1),
('thursday', 'Flat Dumbbell Press', '4×10–12', 'Chest', 2),
('thursday', 'Machine/Cable Chest Fly', '3×12–15', 'Chest', 3),
('thursday', 'Arnold Press', '4×10', 'Shoulders', 4),
('thursday', 'Lateral Raise + Front Raise (superset)', '4×12 each', 'Shoulders', 5),
('thursday', 'Close-grip Bench Press', '4×8–10', 'Triceps', 6),
('thursday', 'Rope Pushdown (drop set last)', '3×12–15', 'Triceps', 7),
-- Friday Pull Volume
('friday', 'T-Bar Rows / Barbell Rows', '4×8–10', 'Back', 1),
('friday', 'Lat Pulldown (wide grip)', '4×10–12', 'Back', 2),
('friday', 'Chest-supported Rows', '3×10–12', 'Back', 3),
('friday', 'Cable Pullover', '3×12', 'Back', 4),
('friday', 'Rear Delt Flyes', '4×15', 'Rear Delts', 5),
('friday', 'Preacher Curls', '4×10', 'Biceps', 6),
('friday', 'Cable Curls (drop set last)', '3×12–15', 'Biceps', 7),
-- Saturday Legs Volume + Core
('saturday', 'Front Squats', '4×8', 'Quads', 1),
('saturday', 'Hip Thrusts', '4×10', 'Glutes', 2),
('saturday', 'Bulgarian Split Squats', '3×10/leg', 'Quads', 3),
('saturday', 'Leg Extensions', '3×15', 'Quads', 4),
('saturday', 'Seated Calf Raises', '4×15', 'Calves', 5),
('saturday', 'Weighted Plank', '3×45–60 sec', 'Core', 6),
('saturday', 'Hanging Leg Raises', '3×12–15', 'Core', 7);

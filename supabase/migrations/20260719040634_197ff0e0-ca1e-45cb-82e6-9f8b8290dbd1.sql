
DROP POLICY IF EXISTS "Authenticated can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can delete exercises" ON public.exercises;

CREATE POLICY "Authenticated can insert exercises" ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update exercises" ON public.exercises
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete exercises" ON public.exercises
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

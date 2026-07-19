GRANT INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
CREATE POLICY "Authenticated can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (true);
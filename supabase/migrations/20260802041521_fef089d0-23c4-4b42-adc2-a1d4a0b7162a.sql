DROP POLICY IF EXISTS "Users manage their own general sessions" ON public.general_sessions;

CREATE POLICY "Users manage their own general sessions"
ON public.general_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
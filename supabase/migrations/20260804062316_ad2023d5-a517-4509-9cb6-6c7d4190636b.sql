CREATE TABLE public.gym_buddy_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_buddy_messages TO authenticated;
GRANT ALL ON public.gym_buddy_messages TO service_role;

ALTER TABLE public.gym_buddy_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gym_buddy_messages" ON public.gym_buddy_messages
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX gym_buddy_messages_user_created_idx ON public.gym_buddy_messages (user_id, created_at);

-- Files table (virtual file system)
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('folder','file')),
  content TEXT NOT NULL DEFAULT '',
  language TEXT,
  mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_user ON public.files(user_id);
CREATE INDEX idx_files_parent ON public.files(parent_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own files" ON public.files
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own files" ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own files" ON public.files
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own files" ON public.files
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User settings
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY,
  navbar_color TEXT NOT NULL DEFAULT '222 47% 11%',
  run_mode TEXT NOT NULL DEFAULT 'inline' CHECK (run_mode IN ('inline','newtab')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

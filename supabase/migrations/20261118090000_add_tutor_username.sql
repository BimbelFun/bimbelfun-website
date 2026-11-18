-- Bimbel Fun: username login untuk akun Tentor.
-- Jalankan sekali di Supabase SQL Editor setelah PR digabung dan Edge Function diperbarui.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;

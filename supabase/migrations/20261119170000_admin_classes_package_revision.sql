ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_grade text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_day text;
ALTER TABLE public.student_packages ADD COLUMN IF NOT EXISTS class_level text;

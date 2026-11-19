-- Bimbel Fun: data tentor pada paket dan kapasitas kelompok belajar.
-- Semua perubahan bersifat additive; data yang sudah ada tidak dihapus.

ALTER TABLE public.student_packages
ADD COLUMN IF NOT EXISTS tutor_id uuid
REFERENCES public.tutors(id) ON DELETE SET NULL;

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS group_size integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'classes_group_size_check'
      AND conrelid = 'public.classes'::regclass
  ) THEN
    ALTER TABLE public.classes
    ADD CONSTRAINT classes_group_size_check
    CHECK (group_size IS NULL OR group_size BETWEEN 1 AND 5);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS student_packages_tutor_id_idx
ON public.student_packages(tutor_id);

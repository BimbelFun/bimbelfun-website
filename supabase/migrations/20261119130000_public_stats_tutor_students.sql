CREATE TABLE IF NOT EXISTS public.tutor_students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT tutor_students_unique_assignment UNIQUE(student_id,tutor_id));
ALTER TABLE public.tutor_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bimbelfun admin manage tutor students" ON public.tutor_students;
CREATE POLICY "bimbelfun admin manage tutor students" ON public.tutor_students FOR ALL TO authenticated USING(public.bimbelfun_is_admin()) WITH CHECK(public.bimbelfun_is_admin());
DROP POLICY IF EXISTS "tutor read own assigned students" ON public.tutor_students;
CREATE POLICY "tutor read own assigned students" ON public.tutor_students FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.tutors t WHERE t.id=tutor_students.tutor_id AND t.profile_user_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tutor_students TO authenticated;
CREATE OR REPLACE FUNCTION public.bimbelfun_public_dashboard_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT jsonb_build_object('student_count',(SELECT count(*) FROM public.students),'tutor_count',(SELECT count(*) FROM public.tutors WHERE lower(coalesce(status,'active')) NOT IN ('off','inactive','nonaktif')),'tutors',COALESCE((SELECT jsonb_agg(jsonb_build_object('full_name',t.full_name,'expertise',t.expertise,'student_count',(SELECT count(DISTINCT ts.student_id) FROM public.tutor_students ts WHERE ts.tutor_id=t.id)) ORDER BY t.full_name) FROM public.tutors t WHERE lower(coalesce(t.status,'active')) NOT IN ('off','inactive','nonaktif')),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.bimbelfun_public_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bimbelfun_public_dashboard_stats() TO anon,authenticated;

-- Bimbel Fun: sinkronisasi penugasan murid-tentor untuk presensi.
-- Additive and non-destructive: existing assignments and attendance are preserved.

create or replace function public.bimbelfun_tutor_has_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tutors t
    where t.profile_user_id = auth.uid()
      and (
        exists (
          select 1 from public.tutor_students ts
          where ts.tutor_id = t.id and ts.student_id = p_student_id
        )
        or exists (
          select 1
          from public.class_tutors ct
          join public.class_students cs on cs.class_id = ct.class_id
          where ct.tutor_id = t.id
            and cs.student_id = p_student_id
            and coalesce(lower(cs.status), 'active') not in ('inactive','nonaktif','removed')
        )
        or exists (
          select 1 from public.class_tutors ct
          join public.classes c on c.id = ct.class_id
          where ct.tutor_id = t.id and c.student_id = p_student_id
        )
      )
  );
$$;

create or replace function public.bimbelfun_tutor_student_in_class(p_student_id uuid, p_schedule_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.schedules s
    join public.class_tutors ct on ct.class_id = s.class_id
    join public.tutors t on t.id = ct.tutor_id
    where s.id = p_schedule_id
      and t.profile_user_id = auth.uid()
      and (
        exists (
          select 1 from public.class_students cs
          where cs.class_id = s.class_id
            and cs.student_id = p_student_id
            and coalesce(lower(cs.status), 'active') not in ('inactive','nonaktif','removed')
        )
        or exists (
          select 1 from public.classes c
          where c.id = s.class_id and c.student_id = p_student_id
        )
        or exists (
          select 1 from public.tutor_students ts
          where ts.tutor_id = t.id and ts.student_id = p_student_id
        )
      )
  );
$$;

create or replace function public.bimbelfun_package_matches_session(
  p_package_id uuid, p_student_id uuid, p_schedule_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.student_packages sp
    join public.schedules s on s.id = p_schedule_id
    join public.class_tutors ct on ct.class_id = s.class_id
    join public.tutors t on t.id = ct.tutor_id
    where sp.id = p_package_id
      and sp.student_id = p_student_id
      and sp.tutor_id = t.id
      and t.profile_user_id = auth.uid()
      and (sp.class_id is null or sp.class_id = s.class_id)
      and public.bimbelfun_tutor_student_in_class(p_student_id, p_schedule_id)
  );
$$;

grant execute on function public.bimbelfun_tutor_has_student(uuid) to authenticated;
grant execute on function public.bimbelfun_tutor_student_in_class(uuid,uuid) to authenticated;
grant execute on function public.bimbelfun_package_matches_session(uuid,uuid,uuid) to authenticated;

-- Keep tutor read access scoped to their own assignments; financial tables remain admin-only.
drop policy if exists "tutor read own assigned students" on public.tutor_students;
create policy "tutor read own assigned students" on public.tutor_students
  for select to authenticated
  using (exists (
    select 1 from public.tutors t
    where t.id = tutor_students.tutor_id and t.profile_user_id = auth.uid()
  ));


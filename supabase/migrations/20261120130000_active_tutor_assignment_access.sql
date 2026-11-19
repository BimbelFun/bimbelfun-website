-- Bimbel Fun: pastikan Tentor yang sudah tidak aktif pada suatu kelas
-- tidak lagi dapat membaca kelas, jadwal, murid, atau paket melalui relasi lama.
-- Penugasan langsung pada menu Tutor per Murid tetap dihormati.

create or replace function public.bimbelfun_tutor_has_class(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tutors t
    join public.class_tutors ct on ct.tutor_id = t.id
    where t.profile_user_id = auth.uid()
      and ct.class_id = p_class_id
      and ct.is_active = true
  );
$$;

create or replace function public.bimbelfun_tutor_has_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tutors t
    where t.profile_user_id = auth.uid()
      and (
        -- Penugasan langsung yang dikelola Admin melalui Tutor per Murid.
        exists (
          select 1
          from public.tutor_students ts
          where ts.tutor_id = t.id
            and ts.student_id = p_student_id
        )
        -- Penugasan melalui kelas hanya berlaku selama relasi Tentor aktif.
        or exists (
          select 1
          from public.class_tutors ct
          join public.class_students cs on cs.class_id = ct.class_id
          where ct.tutor_id = t.id
            and ct.is_active = true
            and cs.student_id = p_student_id
            and coalesce(lower(cs.status), 'active') not in ('inactive','nonaktif','removed')
        )
        or exists (
          select 1
          from public.class_tutors ct
          join public.classes c on c.id = ct.class_id
          where ct.tutor_id = t.id
            and ct.is_active = true
            and c.student_id = p_student_id
        )
      )
  );
$$;

grant execute on function public.bimbelfun_tutor_has_class(uuid) to authenticated;
grant execute on function public.bimbelfun_tutor_has_student(uuid) to authenticated;

-- Batasi pembacaan relasi kelas dan jadwal ke Tentor yang masih aktif.
drop policy if exists "tutor read assigned class_tutors" on public.class_tutors;
create policy "tutor read assigned class_tutors"
  on public.class_tutors for select to authenticated
  using (
    is_active = true
    and exists (
      select 1 from public.tutors t
      where t.id = class_tutors.tutor_id
        and t.profile_user_id = auth.uid()
    )
  );

drop policy if exists "tutor read assigned classes" on public.classes;
create policy "tutor read assigned classes"
  on public.classes for select to authenticated
  using (
    exists (
      select 1
      from public.class_tutors ct
      join public.tutors t on t.id = ct.tutor_id
      where ct.class_id = classes.id
        and ct.is_active = true
        and t.profile_user_id = auth.uid()
    )
  );

drop policy if exists "tutor read assigned schedules" on public.schedules;
create policy "tutor read assigned schedules"
  on public.schedules for select to authenticated
  using (
    exists (
      select 1
      from public.class_tutors ct
      join public.tutors t on t.id = ct.tutor_id
      where ct.class_id = schedules.class_id
        and ct.is_active = true
        and t.profile_user_id = auth.uid()
    )
  );

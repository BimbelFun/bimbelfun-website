-- Bimbel Fun: jadwal berdurasi dan presensi per pertemuan.
-- Jalankan sekali di Supabase SQL Editor setelah perubahan website di-merge.

alter table public.schedules
  add column if not exists duration_minutes integer not null default 60;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_duration_minutes_check'
      and conrelid = 'public.schedules'::regclass
  ) then
    alter table public.schedules
      add constraint schedules_duration_minutes_check
      check (duration_minutes in (60, 90, 120));
  end if;
end $$;

alter table public.attendance_records
  add column if not exists schedule_id uuid references public.schedules(id) on delete set null;

-- Satu tentor boleh mengajar beberapa pertemuan pada tanggal yang sama.
alter table public.attendance_records
  drop constraint if exists attendance_records_tutor_id_attendance_date_key;

create unique index if not exists attendance_records_tutor_schedule_date_key
  on public.attendance_records(tutor_id, schedule_id, attendance_date)
  where schedule_id is not null;

-- Tentor hanya dapat membaca kelas, penugasan, dan jadwal miliknya.
drop policy if exists "tutor read assigned class_tutors" on public.class_tutors;
create policy "tutor read assigned class_tutors"
  on public.class_tutors for select to authenticated
  using (exists (
    select 1 from public.tutors t
    where t.id = class_tutors.tutor_id and t.profile_user_id = auth.uid()
  ));

drop policy if exists "tutor read assigned classes" on public.classes;
create policy "tutor read assigned classes"
  on public.classes for select to authenticated
  using (exists (
    select 1 from public.class_tutors ct
    join public.tutors t on t.id = ct.tutor_id
    where ct.class_id = classes.id and t.profile_user_id = auth.uid()
  ));

drop policy if exists "tutor read assigned schedules" on public.schedules;
create policy "tutor read assigned schedules"
  on public.schedules for select to authenticated
  using (exists (
    select 1 from public.class_tutors ct
    join public.tutors t on t.id = ct.tutor_id
    where ct.class_id = schedules.class_id and t.profile_user_id = auth.uid()
  ));

-- Presensi harus terhubung ke jadwal yang memang ditugaskan kepada tentor.
drop policy if exists "attendance tutor insert own" on public.attendance_records;
create policy "attendance tutor insert own"
  on public.attendance_records for insert to authenticated
  with check (exists (
    select 1 from public.tutors t
    join public.class_tutors ct on ct.tutor_id = t.id
    join public.schedules s on s.class_id = ct.class_id
    where t.id = attendance_records.tutor_id
      and t.profile_user_id = auth.uid()
      and s.id = attendance_records.schedule_id
  ));

drop policy if exists "attendance tutor update own" on public.attendance_records;
create policy "attendance tutor update own"
  on public.attendance_records for update to authenticated
  using (exists (
    select 1 from public.tutors t
    where t.id = attendance_records.tutor_id and t.profile_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tutors t
    join public.class_tutors ct on ct.tutor_id = t.id
    join public.schedules s on s.class_id = ct.class_id
    where t.id = attendance_records.tutor_id
      and t.profile_user_id = auth.uid()
      and s.id = attendance_records.schedule_id
  ));

grant select on public.class_tutors, public.classes, public.schedules to authenticated;
grant select, insert, update on public.attendance_records to authenticated;

-- Bimbel Fun: sinkronisasi formulir Admin dengan jadwal dan presensi Tentor.
-- Additive/non-destructive: attendance records and existing schedule rows are preserved.

alter table public.schedules
  add column if not exists is_active boolean not null default true;

-- Simpan riwayat penugasan Tentor pada kelas tanpa menghapus relasi lama.
alter table public.class_tutors
  add column if not exists is_active boolean not null default true;

-- Snapshot the schedule/student labels at check-in so later Admin edits do not
-- rewrite the meaning of historical attendance rows.
alter table public.attendance_records
  add column if not exists student_name_snapshot text,
  add column if not exists class_name_snapshot text,
  add column if not exists schedule_day_snapshot integer,
  add column if not exists duration_minutes_snapshot integer;

-- Jadwal Admin menyimpan hari dan durasi; waktu aktual masuk/pulang dicatat oleh Tentor
-- pada attendance_records. Existing schedule time values are retained until edited.
alter table public.schedules
  alter column start_time drop not null,
  alter column end_time drop not null;

create or replace function public.bimbelfun_admin_save_class_schedule(
  p_class_id uuid,
  p_student_id uuid,
  p_tutor_id uuid,
  p_subject text,
  p_class_grade text,
  p_group_size integer,
  p_days integer[],
  p_duration_minutes integer,
  p_location text,
  p_package_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_student_name text;
  v_student_level text;
  v_days_text text;
  v_day integer;
  v_active_student_count integer;
  v_selected_student_active boolean;
begin
  if not public.bimbelfun_is_admin() then
    raise exception 'Hanya Admin yang dapat mengubah Kelas & Jadwal.';
  end if;

  if p_student_id is null or p_tutor_id is null or p_package_id is null
     or nullif(trim(p_subject), '') is null then
    raise exception 'Murid, Tentor, Mata Pelajaran, dan Paket Pertemuan wajib dipilih.';
  end if;
  if coalesce(array_length(p_days, 1), 0) = 0
     or exists (select 1 from unnest(p_days) d where d < 1 or d > 7) then
    raise exception 'Pilih minimal satu hari jadwal yang valid.';
  end if;
  if p_duration_minutes is null or p_duration_minutes not in (60, 90, 120) then
    raise exception 'Durasi harus 60, 90, atau 120 menit.';
  end if;
  if p_group_size is not null and p_group_size not between 1 and 5 then
    raise exception 'Jumlah murid kelompok harus 1 sampai 5.';
  end if;

  if not exists (
    select 1 from public.tutor_students ts
    where ts.tutor_id = p_tutor_id and ts.student_id = p_student_id
  ) and not (
    p_class_id is not null and (
      exists (
        select 1 from public.class_tutors ct
        join public.class_students cs on cs.class_id = ct.class_id
        where ct.class_id = p_class_id and ct.tutor_id = p_tutor_id
          and cs.student_id = p_student_id
          and coalesce(lower(cs.status), 'active') not in ('inactive','nonaktif','removed')
      )
      or exists (
        select 1 from public.class_tutors ct
        join public.classes c on c.id = ct.class_id
        where ct.class_id = p_class_id and ct.tutor_id = p_tutor_id
          and c.student_id = p_student_id
      )
    )
  ) then
    raise exception 'Murid belum ditugaskan kepada Tentor tersebut di menu Tutor per Murid atau kelas lama.';
  end if;

  if not exists (
    select 1 from public.student_packages sp
    where sp.id = p_package_id
      and sp.student_id = p_student_id
      and sp.tutor_id = p_tutor_id
      and sp.subject = p_subject
      and sp.status = 'active'
      and sp.used_meetings < sp.package_meetings
      and (sp.class_id is null or sp.class_id = p_class_id)
  ) then
    raise exception 'Paket harus aktif, milik murid dan Tentor terpilih, serta masih memiliki sisa pertemuan.';
  end if;

  select full_name, education_level into v_student_name, v_student_level
  from public.students where id = p_student_id;
  if v_student_name is null then
    raise exception 'Data murid tidak ditemukan.';
  end if;

  select string_agg(
    case d when 1 then 'Senin' when 2 then 'Selasa' when 3 then 'Rabu'
      when 4 then 'Kamis' when 5 then 'Jumat' when 6 then 'Sabtu'
      when 7 then 'Minggu' end, ', ' order by d
  ) into v_days_text from (select distinct unnest(p_days) d) days;

  if p_class_id is null then
    insert into public.classes
      (class_name, student_id, subject, class_grade, class_day, group_size,
       education_level, learning_mode, status, program_id)
    values
      (v_student_name, p_student_id, p_subject, coalesce(nullif(trim(p_class_grade), ''), v_student_level), v_days_text,
       p_group_size, coalesce(nullif(trim(p_class_grade), ''), v_student_level), 'offline', 'active', null)
    returning id into v_class_id;
  else
    update public.classes
    set class_name = v_student_name,
        student_id = p_student_id,
        subject = p_subject,
        class_grade = coalesce(nullif(trim(p_class_grade), ''), v_student_level),
        class_day = v_days_text,
        group_size = p_group_size,
        education_level = coalesce(nullif(trim(p_class_grade), ''), v_student_level),
        learning_mode = 'offline'
    where id = p_class_id
    returning id into v_class_id;
    if v_class_id is null then
      raise exception 'Data kelas yang akan diubah tidak ditemukan.';
    end if;
  end if;

  -- Nonaktifkan penugasan lama tanpa menghapus riwayat relasinya.
  update public.class_tutors
  set is_active = false
  where class_id = v_class_id and tutor_id <> p_tutor_id;
  update public.class_tutors
  set is_active = true
  where class_id = v_class_id and tutor_id = p_tutor_id;
  if not found then
    insert into public.class_tutors(class_id, tutor_id, is_active)
    values (v_class_id, p_tutor_id, true);
  end if;

  -- Jangan menonaktifkan anggota kelas kelompok secara diam-diam.
  select count(*) into v_active_student_count
  from public.class_students
  where class_id = v_class_id
    and coalesce(lower(status), 'active') not in ('inactive','nonaktif','removed');

  select exists (
    select 1 from public.class_students
    where class_id = v_class_id
      and student_id = p_student_id
      and coalesce(lower(status), 'active') not in ('inactive','nonaktif','removed')
  ) into v_selected_student_active;

  if coalesce(p_group_size, 1) <= 1 then
    if v_active_student_count > 1 then
      raise exception 'Kelas ini memiliki beberapa murid aktif. Kelola anggota kelompok terlebih dahulu atau gunakan kelas terpisah sebelum mengubahnya melalui formulir satu murid.';
    end if;
    update public.class_students
    set status = 'inactive'
    where class_id = v_class_id and student_id <> p_student_id;
  else
    if (v_active_student_count + (case when v_selected_student_active then 0 else 1 end)) > p_group_size then
      raise exception 'Jumlah anggota aktif melebihi kapasitas kelompok yang dipilih.';
    end if;
    -- Anggota lain tetap aktif untuk kelas kelompok.
  end if;

  if not exists (
    select 1 from public.class_students
    where class_id = v_class_id and student_id = p_student_id
  ) then
    insert into public.class_students(class_id, student_id, status)
    values (v_class_id, p_student_id, 'active');
  else
    update public.class_students set status = 'active'
    where class_id = v_class_id and student_id = p_student_id;
  end if;

  if not exists (
    select 1 from public.tutor_students
    where tutor_id = p_tutor_id and student_id = p_student_id
  ) then
    insert into public.tutor_students(tutor_id, student_id)
    values (p_tutor_id, p_student_id);
  end if;

  -- Keep schedule IDs so existing attendance records remain linked.
  update public.schedules
  set is_active = false
  where class_id = v_class_id and not (day_of_week = any(p_days));

  for v_day in select distinct unnest(p_days) as day_value order by day_value
  loop
    update public.schedules
    set subject = p_subject,
        day_of_week = v_day,
        duration_minutes = p_duration_minutes,
        location = nullif(trim(p_location), ''),
        start_time = null,
        end_time = null,
        is_active = true
    where id = (
      select id from public.schedules
      where class_id = v_class_id and day_of_week = v_day
      order by is_active desc, id
      limit 1
    );

    if not found then
      insert into public.schedules
        (class_id, subject, day_of_week, duration_minutes, location, start_time, end_time, is_active)
      values
        (v_class_id, p_subject, v_day, p_duration_minutes,
         nullif(trim(p_location), ''), null, null, true);
    end if;
  end loop;

  update public.student_packages
  set class_id = v_class_id
  where id = p_package_id and class_id is null;

  return v_class_id;
end;
$$;

grant execute on function public.bimbelfun_admin_save_class_schedule(
  uuid, uuid, uuid, text, text, integer, integer[], integer, text, uuid
) to authenticated;

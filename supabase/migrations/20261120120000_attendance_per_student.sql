-- Bimbel Fun: presensi per murid pada setiap jadwal.
-- Additive and non-destructive: historical attendance rows are retained.

-- Isi snapshot untuk presensi lama berdasarkan data jadwal yang masih tersimpan,
-- sehingga perubahan jadwal berikutnya tidak mengubah tampilan riwayat lama.
update public.attendance_records ar
set student_name_snapshot = coalesce(
      ar.student_name_snapshot,
      (select st.full_name from public.students st where st.id = ar.student_id)
    ),
    class_name_snapshot = coalesce(ar.class_name_snapshot, c.class_name),
    schedule_day_snapshot = coalesce(ar.schedule_day_snapshot, s.day_of_week),
    duration_minutes_snapshot = coalesce(ar.duration_minutes_snapshot, s.duration_minutes)
from public.schedules s
left join public.classes c on c.id = s.class_id
where ar.schedule_id = s.id
  and (
    ar.student_name_snapshot is null
    or ar.class_name_snapshot is null
    or ar.schedule_day_snapshot is null
    or ar.duration_minutes_snapshot is null
  );

-- Satu jadwal kelompok dapat memiliki presensi untuk beberapa murid pada hari yang sama.
drop index if exists public.attendance_records_tutor_schedule_date_key;
create unique index attendance_records_tutor_schedule_student_date_key
  on public.attendance_records(tutor_id, schedule_id, student_id, attendance_date)
  where schedule_id is not null and student_id is not null;

-- Murid harus benar-benar terdaftar pada kelas yang dipilih.
-- Penugasan langsung Tutor per Murid saja tidak boleh membuka semua jadwal Tentor.
create or replace function public.bimbelfun_tutor_student_in_class(
  p_student_id uuid, p_schedule_id uuid
)
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
      )
  );
$$;

grant execute on function public.bimbelfun_tutor_student_in_class(uuid,uuid) to authenticated;

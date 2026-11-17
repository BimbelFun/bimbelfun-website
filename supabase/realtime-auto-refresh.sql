-- Bimbel Fun: aktifkan Supabase Realtime untuk pembaruan otomatis.
-- Jalankan sekali di Supabase SQL Editor.

do $$
declare
  table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Publication supabase_realtime tidak ditemukan. Aktifkan Realtime di Supabase terlebih dahulu.';
  end if;

  foreach table_name in array array[
    'tutors',
    'students',
    'programs',
    'classes',
    'class_tutors',
    'class_students',
    'schedules',
    'attendance_records'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

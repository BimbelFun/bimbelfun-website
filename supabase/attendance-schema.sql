-- BIMBEL FUN attendance records. Run in Supabase SQL Editor.
-- Confirm profile roles use exactly 'admin' and 'tentor' before enabling portal.
create or replace function public.bimbelfun_is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.user_id=auth.uid() and lower(p.role)='admin'); $$;
grant execute on function public.bimbelfun_is_admin() to authenticated;
create table if not exists public.attendance_records(
 id uuid primary key default gen_random_uuid(),
 tutor_id uuid not null references public.tutors(id) on delete cascade,
 attendance_date date not null default current_date,
 check_in timestamptz,
 check_out timestamptz,
 status text not null default 'hadir' check(status in ('hadir','terlambat','izin','sakit','alpa')),
 created_at timestamptz not null default now(),
 unique(tutor_id,attendance_date),
 constraint attendance_checkout_after_checkin check(check_out is null or check_in is not null)
);
alter table public.attendance_records enable row level security;
drop policy if exists "attendance admin read all" on public.attendance_records;
create policy "attendance admin read all" on public.attendance_records for select to authenticated using(public.bimbelfun_is_admin());
drop policy if exists "attendance tutor read own" on public.attendance_records;
create policy "attendance tutor read own" on public.attendance_records for select to authenticated using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "attendance tutor insert own" on public.attendance_records;
create policy "attendance tutor insert own" on public.attendance_records for insert to authenticated with check(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "attendance tutor update own" on public.attendance_records;
create policy "attendance tutor update own" on public.attendance_records for update to authenticated using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid())) with check(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
grant select,insert,update on public.attendance_records to authenticated;
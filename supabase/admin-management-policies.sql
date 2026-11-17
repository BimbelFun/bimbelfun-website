-- Bimbel Fun: admin permissions for existing management tables.
-- Run this migration in Supabase SQL Editor after reviewing the policies.
create or replace function public.bimbelfun_is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.user_id=auth.uid() and lower(p.role)='admin'); $$;
grant execute on function public.bimbelfun_is_admin() to authenticated;

do $$
declare t text;
begin
 foreach t in array array['tutors','students','programs','classes','class_tutors','class_students','schedules'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I','bimbelfun admin manage',t);
  execute format('create policy %I on public.%I for all to authenticated using (public.bimbelfun_is_admin()) with check (public.bimbelfun_is_admin())','bimbelfun admin manage',t);
  execute format('grant select, insert, update, delete on table public.%I to authenticated',t);
 end loop;
end $$;

-- Tentors can read their own tutor profile and their assigned classes/schedules.
drop policy if exists "bimbelfun tutor read own profile" on public.tutors;
create policy "bimbelfun tutor read own profile" on public.tutors for select to authenticated using(profile_user_id=auth.uid());
drop policy if exists "bimbelfun tutor read assigned class links" on public.class_tutors;
create policy "bimbelfun tutor read assigned class links" on public.class_tutors for select to authenticated using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "bimbelfun tutor read assigned classes" on public.classes;
create policy "bimbelfun tutor read assigned classes" on public.classes for select to authenticated using(exists(select 1 from public.class_tutors ct join public.tutors t on t.id=ct.tutor_id where ct.class_id=classes.id and t.profile_user_id=auth.uid()));
drop policy if exists "bimbelfun tutor read assigned schedules" on public.schedules;
create policy "bimbelfun tutor read assigned schedules" on public.schedules for select to authenticated using(exists(select 1 from public.class_tutors ct join public.tutors t on t.id=ct.tutor_id where ct.class_id=schedules.class_id and t.profile_user_id=auth.uid()));

-- Keep profile reads restricted to each user; admins may inspect profiles if needed.
drop policy if exists "bimbelfun admin read profiles" on public.profiles;
create policy "bimbelfun admin read profiles" on public.profiles for select to authenticated using(public.bimbelfun_is_admin());

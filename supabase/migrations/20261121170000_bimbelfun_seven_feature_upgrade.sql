-- Bimbel Fun: consolidated seven-feature upgrade.
-- Additive schema changes only. Existing students, tutors, attendance and packages are retained.

-- 1) Monthly attendance closure / archive.
create table if not exists public.attendance_monthly_closures (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors(id) on delete restrict,
  period_start date not null,
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz not null default now(),
  unique(tutor_id, period_start),
  check (extract(day from period_start) = 1)
);
alter table public.attendance_monthly_closures enable row level security;
drop policy if exists "admin manage attendance monthly closures" on public.attendance_monthly_closures;
create policy "admin manage attendance monthly closures" on public.attendance_monthly_closures
  for all to authenticated using (public.bimbelfun_is_admin()) with check (public.bimbelfun_is_admin());
drop policy if exists "tutor read own attendance monthly closures" on public.attendance_monthly_closures;
create policy "tutor read own attendance monthly closures" on public.attendance_monthly_closures
  for select to authenticated using (exists (
    select 1 from public.tutors t where t.id = tutor_id and t.profile_user_id = auth.uid()
  ));
grant select, insert, delete on public.attendance_monthly_closures to authenticated;

create or replace function public.bimbelfun_guard_closed_attendance_month()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_tutor_id uuid; v_date date;
begin
  if TG_OP='UPDATE' and exists (
    select 1 from public.attendance_monthly_closures c
    where c.tutor_id=old.tutor_id and c.period_start=date_trunc('month',old.attendance_date)::date
  ) then
    raise exception 'Rekap presensi bulan ini sudah ditutup. Admin harus membuka kembali arsip sebelum mengubah presensi.';
  end if;
  v_tutor_id := case when TG_OP='DELETE' then old.tutor_id else new.tutor_id end;
  v_date := case when TG_OP='DELETE' then old.attendance_date else new.attendance_date end;
  if exists (
    select 1 from public.attendance_monthly_closures c
    where c.tutor_id=v_tutor_id
      and c.period_start=date_trunc('month',v_date)::date
  ) then
    raise exception 'Rekap presensi bulan ini sudah ditutup. Admin harus membuka kembali arsip sebelum mengubah presensi.';
  end if;
  if TG_OP='DELETE' then return old; else return new; end if;
end;
$$;
drop trigger if exists attendance_guard_closed_month on public.attendance_records;
create trigger attendance_guard_closed_month
before insert or update or delete on public.attendance_records
for each row execute function public.bimbelfun_guard_closed_attendance_month();

create or replace function public.bimbelfun_admin_close_attendance_month(p_tutor_id uuid, p_period_start date)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_end date;
begin
  if not public.bimbelfun_is_admin() then raise exception 'Hanya Admin yang dapat menutup rekap presensi.'; end if;
  if p_period_start is null or extract(day from p_period_start)<>1 then raise exception 'Pilih tanggal awal bulan yang valid.'; end if;
  v_end := (p_period_start + interval '1 month - 1 day')::date;
  if exists(select 1 from public.attendance_records
    where tutor_id=p_tutor_id and attendance_date between p_period_start and v_end and check_in is not null and check_out is null) then
    raise exception 'Masih ada presensi yang belum melakukan presensi pulang. Periksa dahulu sebelum menutup rekap.';
  end if;
  insert into public.attendance_monthly_closures(tutor_id,period_start,closed_by)
  values(p_tutor_id,p_period_start,auth.uid())
  on conflict(tutor_id,period_start) do update set closed_by=excluded.closed_by,closed_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.bimbelfun_admin_close_attendance_month(uuid,date) to authenticated;

create or replace function public.bimbelfun_admin_reopen_attendance_month(p_tutor_id uuid, p_period_start date)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not public.bimbelfun_is_admin() then raise exception 'Hanya Admin yang dapat membuka kembali rekap presensi.'; end if;
  delete from public.attendance_monthly_closures where tutor_id=p_tutor_id and period_start=p_period_start;
  return found;
end;
$$;
grant execute on function public.bimbelfun_admin_reopen_attendance_month(uuid,date) to authenticated;

-- Admin may correct/delete attendance rows; closed periods remain protected by the trigger above.
drop policy if exists "attendance admin manage all" on public.attendance_records;
create policy "attendance admin manage all" on public.attendance_records
  for all to authenticated using (public.bimbelfun_is_admin()) with check (public.bimbelfun_is_admin());
grant delete on public.attendance_records to authenticated;

-- 2) Video tasks and tutor groups.
create table if not exists public.tutor_groups (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.tutor_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tutor_groups(id) on delete cascade,
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  unique(group_id,tutor_id)
);
create table if not exists public.tutor_video_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text not null,
  due_at timestamptz,
  assignment_type text not null check (assignment_type in ('individual','group')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.tutor_video_task_targets (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tutor_video_tasks(id) on delete cascade,
  target_type text not null check (target_type in ('individual','group')),
  tutor_id uuid references public.tutors(id) on delete cascade,
  group_id uuid references public.tutor_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((target_type='individual' and tutor_id is not null and group_id is null)
      or (target_type='group' and group_id is not null and tutor_id is null))
);
create table if not exists public.tutor_video_submissions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null unique references public.tutor_video_task_targets(id) on delete cascade,
  drive_url text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check(status in ('submitted','revision','approved')),
  admin_comment text,
  score integer check(score between 0 and 100),
  updated_at timestamptz not null default now()
);
create index if not exists tutor_video_targets_task_idx on public.tutor_video_task_targets(task_id);
create index if not exists tutor_video_targets_tutor_idx on public.tutor_video_task_targets(tutor_id);
create index if not exists tutor_group_members_tutor_idx on public.tutor_group_members(tutor_id);

alter table public.tutor_groups enable row level security;
alter table public.tutor_group_members enable row level security;
alter table public.tutor_video_tasks enable row level security;
alter table public.tutor_video_task_targets enable row level security;
alter table public.tutor_video_submissions enable row level security;

drop policy if exists "admin manage tutor groups" on public.tutor_groups;
create policy "admin manage tutor groups" on public.tutor_groups for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read own groups" on public.tutor_groups;
create policy "tutor read own groups" on public.tutor_groups for select to authenticated using(exists(
 select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
 where gm.group_id=id and t.profile_user_id=auth.uid()
));
drop policy if exists "admin manage tutor group members" on public.tutor_group_members;
create policy "admin manage tutor group members" on public.tutor_group_members for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read own group memberships" on public.tutor_group_members;
create policy "tutor read own group memberships" on public.tutor_group_members for select to authenticated
using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));

drop policy if exists "admin manage tutor video tasks" on public.tutor_video_tasks;
create policy "admin manage tutor video tasks" on public.tutor_video_tasks for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read assigned video tasks" on public.tutor_video_tasks;
create policy "tutor read assigned video tasks" on public.tutor_video_tasks for select to authenticated using(exists(
 select 1 from public.tutor_video_task_targets x
 where x.task_id=id and (
   exists(select 1 from public.tutors t where t.id=x.tutor_id and t.profile_user_id=auth.uid())
   or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
     where gm.group_id=x.group_id and t.profile_user_id=auth.uid())
 )
));
drop policy if exists "admin manage video task targets" on public.tutor_video_task_targets;
create policy "admin manage video task targets" on public.tutor_video_task_targets for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read assigned video task targets" on public.tutor_video_task_targets;
create policy "tutor read assigned video task targets" on public.tutor_video_task_targets for select to authenticated using(
 exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid())
 or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
   where gm.group_id=tutor_video_task_targets.group_id and t.profile_user_id=auth.uid())
);
drop policy if exists "admin manage video submissions" on public.tutor_video_submissions;
create policy "admin manage video submissions" on public.tutor_video_submissions for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read assigned video submissions" on public.tutor_video_submissions;
create policy "tutor read assigned video submissions" on public.tutor_video_submissions for select to authenticated using(exists(
 select 1 from public.tutor_video_task_targets x where x.id=target_id and (
  exists(select 1 from public.tutors t where t.id=x.tutor_id and t.profile_user_id=auth.uid())
  or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
    where gm.group_id=x.group_id and t.profile_user_id=auth.uid())
 )
));
drop policy if exists "tutor submit assigned video" on public.tutor_video_submissions;
create policy "tutor submit assigned video" on public.tutor_video_submissions for insert to authenticated
with check(submitted_by=auth.uid() and exists(
 select 1 from public.tutor_video_task_targets x where x.id=target_id and (
  exists(select 1 from public.tutors t where t.id=x.tutor_id and t.profile_user_id=auth.uid())
  or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
    where gm.group_id=x.group_id and t.profile_user_id=auth.uid())
 )
));
drop policy if exists "tutor update assigned video submission" on public.tutor_video_submissions;
create policy "tutor update assigned video submission" on public.tutor_video_submissions for update to authenticated
using(exists(select 1 from public.tutor_video_task_targets x where x.id=target_id and (
  exists(select 1 from public.tutors t where t.id=x.tutor_id and t.profile_user_id=auth.uid())
  or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
    where gm.group_id=x.group_id and t.profile_user_id=auth.uid())
)))
with check(submitted_by=auth.uid() and exists(select 1 from public.tutor_video_task_targets x where x.id=target_id and (
  exists(select 1 from public.tutors t where t.id=x.tutor_id and t.profile_user_id=auth.uid())
  or exists(select 1 from public.tutor_group_members gm join public.tutors t on t.id=gm.tutor_id
    where gm.group_id=x.group_id and t.profile_user_id=auth.uid())
)));
grant select,insert,update,delete on public.tutor_groups,public.tutor_group_members,public.tutor_video_tasks,
 public.tutor_video_task_targets,public.tutor_video_submissions to authenticated;

create or replace function public.bimbelfun_guard_tutor_submission_review_fields()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if not public.bimbelfun_is_admin() and (
   new.status is distinct from old.status or new.admin_comment is distinct from old.admin_comment
   or new.score is distinct from old.score
 ) then raise exception 'Hanya Admin yang dapat mengubah status, komentar, dan nilai tugas video.'; end if;
 new.updated_at=now();
 return new;
end;
$$;
drop trigger if exists tutor_video_submission_review_guard on public.tutor_video_submissions;
create trigger tutor_video_submission_review_guard before update on public.tutor_video_submissions
for each row execute function public.bimbelfun_guard_tutor_submission_review_fields();

-- 3) Student progress reports.
create table if not exists public.student_progress_reports (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete restrict,
 tutor_id uuid not null references public.tutors(id) on delete restrict,
 report_date date not null default current_date,
 period_start date,
 period_end date,
 material text not null,
 strengths text,
 improvements text,
 notes text,
 shared_to_parent boolean not null default false,
 shared_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(period_end is null or period_start is null or period_end>=period_start)
);
alter table public.student_progress_reports enable row level security;
drop policy if exists "admin manage student progress reports" on public.student_progress_reports;
create policy "admin manage student progress reports" on public.student_progress_reports for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor manage own student progress reports" on public.student_progress_reports;
create policy "tutor manage own student progress reports" on public.student_progress_reports for all to authenticated
using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid())
 and public.bimbelfun_tutor_has_student(student_id))
with check(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid())
 and public.bimbelfun_tutor_has_student(student_id));
grant select,insert,update,delete on public.student_progress_reports to authenticated;

-- 4) Tutor payrolls. Rate is snapshotted per monthly invoice and can be adjusted by Admin.
create table if not exists public.tutor_payrolls (
 id uuid primary key default gen_random_uuid(),
 tutor_id uuid not null references public.tutors(id) on delete restrict,
 period_start date not null,
 period_end date not null,
 session_count integer not null default 0 check(session_count>=0),
 rate_per_session numeric(12,2) not null check(rate_per_session>=0),
 base_amount numeric(12,2) not null check(base_amount>=0),
 adjustment_amount numeric(12,2) not null default 0,
 adjustment_note text,
 net_amount numeric(12,2) not null check(net_amount>=0),
 status text not null default 'unpaid' check(status in ('unpaid','paid')),
 paid_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tutor_id,period_start),
 check(extract(day from period_start)=1),
 check(period_end>=period_start)
);
alter table public.tutor_payrolls enable row level security;
drop policy if exists "admin manage tutor payrolls" on public.tutor_payrolls;
create policy "admin manage tutor payrolls" on public.tutor_payrolls for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read own payrolls" on public.tutor_payrolls;
create policy "tutor read own payrolls" on public.tutor_payrolls for select to authenticated
using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
grant select,insert,update,delete on public.tutor_payrolls to authenticated;

create or replace function public.bimbelfun_admin_generate_tutor_payroll(
 p_tutor_id uuid,p_period_start date,p_rate_per_session numeric,p_adjustment_amount numeric default 0,p_adjustment_note text default null
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_end date; v_count integer; v_base numeric(12,2); v_net numeric(12,2); v_id uuid;
begin
 if not public.bimbelfun_is_admin() then raise exception 'Hanya Admin yang dapat membuat invoice gaji.'; end if;
 if p_period_start is null or extract(day from p_period_start)<>1 then raise exception 'Periode harus tanggal pertama pada bulan yang dipilih.'; end if;
 if p_rate_per_session is null or p_rate_per_session<0 then raise exception 'Tarif per pertemuan tidak valid.'; end if;
 v_end := (p_period_start + interval '1 month - 1 day')::date;
 if not exists(select 1 from public.attendance_monthly_closures c where c.tutor_id=p_tutor_id and c.period_start=p_period_start) then
   raise exception 'Tutup rekap presensi Tentor untuk bulan ini sebelum membuat invoice gaji.';
 end if;
 select count(*) into v_count from (
   select distinct attendance_date,coalesce(schedule_id,id) as session_key
   from public.attendance_records
   where tutor_id=p_tutor_id and attendance_date between p_period_start and v_end
     and check_in is not null and check_out is not null
 ) sessions;
 v_base := v_count*p_rate_per_session;
 v_net := v_base+coalesce(p_adjustment_amount,0);
 if v_net<0 then raise exception 'Total gaji setelah penyesuaian tidak boleh negatif.'; end if;
 insert into public.tutor_payrolls(tutor_id,period_start,period_end,session_count,rate_per_session,base_amount,adjustment_amount,adjustment_note,net_amount,created_by)
 values(p_tutor_id,p_period_start,v_end,v_count,p_rate_per_session,v_base,coalesce(p_adjustment_amount,0),p_adjustment_note,v_net,auth.uid())
 on conflict(tutor_id,period_start) do update set
  period_end=excluded.period_end,session_count=excluded.session_count,rate_per_session=excluded.rate_per_session,
  base_amount=excluded.base_amount,adjustment_amount=excluded.adjustment_amount,adjustment_note=excluded.adjustment_note,
  net_amount=excluded.net_amount,updated_at=now()
 where public.tutor_payrolls.status<>'paid'
 returning id into v_id;
 if v_id is null then raise exception 'Invoice gaji sudah dibayar. Buka kembali secara khusus sebelum membuat ulang.'; end if;
 return v_id;
end;
$$;
grant execute on function public.bimbelfun_admin_generate_tutor_payroll(uuid,date,numeric,numeric,text) to authenticated;

-- 5) Bank Soal owned by a tutor with Admin-approved cross-tutor access.
create table if not exists public.tutor_bank_questions (
 id uuid primary key default gen_random_uuid(),
 owner_tutor_id uuid not null references public.tutors(id) on delete restrict,
 title text not null,
 education_level text,
 grade text,
 subject text not null,
 topic text,
 question_type text not null default 'essay' check(question_type in ('essay','multiple_choice')),
 question_text text not null,
 options jsonb not null default '[]'::jsonb,
 correct_answer text,
 explanation text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.tutor_bank_access_requests (
 id uuid primary key default gen_random_uuid(),
 question_id uuid not null references public.tutor_bank_questions(id) on delete cascade,
 requester_tutor_id uuid not null references public.tutors(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 requested_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 admin_note text,
 unique(question_id,requester_tutor_id)
);
create table if not exists public.tutor_bank_access_grants (
 id uuid primary key default gen_random_uuid(),
 question_id uuid not null references public.tutor_bank_questions(id) on delete cascade,
 tutor_id uuid not null references public.tutors(id) on delete cascade,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz not null default now(),
 unique(question_id,tutor_id)
);
create index if not exists tutor_bank_questions_owner_idx on public.tutor_bank_questions(owner_tutor_id);
create index if not exists tutor_bank_requests_status_idx on public.tutor_bank_access_requests(status,requested_at);
alter table public.tutor_bank_questions enable row level security;
alter table public.tutor_bank_access_requests enable row level security;
alter table public.tutor_bank_access_grants enable row level security;

drop policy if exists "admin manage tutor bank questions" on public.tutor_bank_questions;
create policy "admin manage tutor bank questions" on public.tutor_bank_questions for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "owner manage own tutor bank questions" on public.tutor_bank_questions;
create policy "owner manage own tutor bank questions" on public.tutor_bank_questions for all to authenticated
using(exists(select 1 from public.tutors t where t.id=owner_tutor_id and t.profile_user_id=auth.uid()))
with check(exists(select 1 from public.tutors t where t.id=owner_tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "approved tutor can read shared questions" on public.tutor_bank_questions;
create policy "approved tutor can read shared questions" on public.tutor_bank_questions for select to authenticated
using(exists(select 1 from public.tutor_bank_access_grants g join public.tutors t on t.id=g.tutor_id
 where g.question_id=id and t.profile_user_id=auth.uid()));

drop policy if exists "admin manage tutor bank requests" on public.tutor_bank_access_requests;
create policy "admin manage tutor bank requests" on public.tutor_bank_access_requests for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor request and read own bank requests" on public.tutor_bank_access_requests;
create policy "tutor request and read own bank requests" on public.tutor_bank_access_requests for select to authenticated
using(exists(select 1 from public.tutors t where t.id=requester_tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "tutor create own bank requests" on public.tutor_bank_access_requests;
create policy "tutor create own bank requests" on public.tutor_bank_access_requests for insert to authenticated
with check(exists(select 1 from public.tutors t where t.id=requester_tutor_id and t.profile_user_id=auth.uid()));
drop policy if exists "admin manage tutor bank grants" on public.tutor_bank_access_grants;
create policy "admin manage tutor bank grants" on public.tutor_bank_access_grants for all to authenticated
using(public.bimbelfun_is_admin()) with check(public.bimbelfun_is_admin());
drop policy if exists "tutor read own bank grants" on public.tutor_bank_access_grants;
create policy "tutor read own bank grants" on public.tutor_bank_access_grants for select to authenticated
using(exists(select 1 from public.tutors t where t.id=tutor_id and t.profile_user_id=auth.uid()));
grant select,insert,update,delete on public.tutor_bank_questions to authenticated;
grant select,insert,update,delete on public.tutor_bank_access_requests to authenticated;
grant select,insert,delete on public.tutor_bank_access_grants to authenticated;

create or replace function public.bimbelfun_admin_review_bank_access_request(p_request_id uuid,p_approve boolean,p_admin_note text default null)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_question uuid; v_tutor uuid;
begin
 if not public.bimbelfun_is_admin() then raise exception 'Hanya Admin yang dapat memproses permintaan akses Bank Soal.'; end if;
 select question_id,requester_tutor_id into v_question,v_tutor
 from public.tutor_bank_access_requests where id=p_request_id for update;
 if v_question is null then raise exception 'Permintaan akses tidak ditemukan.'; end if;
 update public.tutor_bank_access_requests set status=case when p_approve then 'approved' else 'rejected' end,
  reviewed_by=auth.uid(),reviewed_at=now(),admin_note=p_admin_note where id=p_request_id;
 if p_approve then
  insert into public.tutor_bank_access_grants(question_id,tutor_id,approved_by)
  values(v_question,v_tutor,auth.uid()) on conflict(question_id,tutor_id) do nothing;
 else
  delete from public.tutor_bank_access_grants where question_id=v_question and tutor_id=v_tutor;
 end if;
 return true;
end;
$$;
grant execute on function public.bimbelfun_admin_review_bank_access_request(uuid,boolean,text) to authenticated;

-- 6) Package metadata: only group-learning packages may omit price/date.
alter table public.student_packages alter column price drop not null;
alter table public.student_packages alter column purchased_at drop not null;

create or replace function public.bimbelfun_validate_student_package()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_group boolean := false;
begin
 if new.class_id is not null then
  select coalesce(has_group_learning,false) into v_group from public.classes where id=new.class_id;
 end if;
 if v_group then
  if new.tutor_id is null then raise exception 'Pilih Tentor untuk paket kelompok belajar.'; end if;
  if not exists(select 1 from public.class_tutors ct where ct.class_id=new.class_id and ct.tutor_id=new.tutor_id and ct.is_active=true) then
   raise exception 'Tentor tidak sesuai dengan kelas kelompok belajar yang dipilih.';
  end if;
  if not (
    exists(select 1 from public.classes c where c.id=new.class_id and c.student_id=new.student_id)
    or exists(select 1 from public.class_students cs where cs.class_id=new.class_id and cs.student_id=new.student_id and coalesce(lower(cs.status),'active') not in ('inactive','nonaktif','removed'))
  ) then raise exception 'Murid tidak terdaftar pada kelas kelompok belajar yang dipilih.'; end if;
 else
  if new.price is null or new.price<0 then raise exception 'Harga paket wajib diisi untuk jadwal biasa.'; end if;
  if new.purchased_at is null then raise exception 'Tanggal pembayaran wajib diisi untuk jadwal biasa.'; end if;
 end if;
 return new;
end;
$$;
drop trigger if exists student_packages_validate_group_learning on public.student_packages;
create trigger student_packages_validate_group_learning before insert or update on public.student_packages
for each row execute function public.bimbelfun_validate_student_package();


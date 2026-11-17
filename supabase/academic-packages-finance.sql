-- Bimbel Fun: pilihan akademik, paket pertemuan, presensi lengkap, dan keuangan.
-- Jalankan di Supabase SQL Editor setelah PR ini di-merge ke main.

alter table public.schedules
  add column if not exists subject text;

alter table public.attendance_records
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists package_id uuid,
  add column if not exists subject text,
  add column if not exists teaching_address text;

create table if not exists public.student_packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  subject text not null,
  package_meetings integer not null check (package_meetings in (4,8,12,16)),
  used_meetings integer not null default 0 check (used_meetings >= 0),
  price numeric(12,2) not null check (price >= 0),
  purchased_at date not null default current_date,
  expires_at date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (used_meetings <= package_meetings)
);

alter table public.attendance_records
  drop constraint if exists attendance_records_package_id_fkey;
alter table public.attendance_records
  add constraint attendance_records_package_id_fkey
  foreign key (package_id) references public.student_packages(id) on delete set null;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  package_id uuid references public.student_packages(id) on delete set null,
  invoice_number text not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  paid_to text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Fungsi SECURITY DEFINER menghindari policy berulang/rekursif saat memeriksa penugasan.
create or replace function public.bimbelfun_tutor_has_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tutors t
    join public.class_tutors ct on ct.tutor_id = t.id
    where t.profile_user_id = auth.uid() and ct.class_id = p_class_id
  );
$$;

create or replace function public.bimbelfun_tutor_has_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.tutors t
    join public.class_tutors ct on ct.tutor_id = t.id
    join public.class_students cs on cs.class_id = ct.class_id
    where t.profile_user_id = auth.uid()
      and cs.student_id = p_student_id
      and coalesce(lower(cs.status),'active') not in ('inactive','nonaktif','removed')
  );
$$;

create or replace function public.bimbelfun_package_is_assigned(p_package_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.student_packages sp
    where sp.id = p_package_id
      and public.bimbelfun_tutor_has_student(sp.student_id)
  );
$$;

grant execute on function public.bimbelfun_tutor_has_class(uuid) to authenticated;
grant execute on function public.bimbelfun_tutor_has_student(uuid) to authenticated;
create or replace function public.bimbelfun_tutor_student_in_class(p_student_id uuid, p_schedule_id uuid)
returns boolean language sql stable security definer set search_path = public
as $
  select exists (
    select 1 from public.schedules s
    join public.class_students cs on cs.class_id = s.class_id
    where s.id = p_schedule_id and cs.student_id = p_student_id
      and public.bimbelfun_tutor_has_class(s.class_id)
      and coalesce(lower(cs.status),'active') not in ('inactive','nonaktif','removed')
  );
$;
grant execute on function public.bimbelfun_tutor_student_in_class(uuid,uuid) to authenticated;

grant execute on function public.bimbelfun_package_is_assigned(uuid) to authenticated;

create or replace function public.bimbelfun_package_belongs_to_student(p_package_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.student_packages sp
    where sp.id = p_package_id and sp.student_id = p_student_id
      and public.bimbelfun_tutor_has_student(sp.student_id));
$$;
grant execute on function public.bimbelfun_package_belongs_to_student(uuid,uuid) to authenticated;

alter table public.student_packages enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "admin manage student packages" on public.student_packages;
create policy "admin manage student packages" on public.student_packages
  for all to authenticated using (public.bimbelfun_is_admin())
  with check (public.bimbelfun_is_admin());
drop policy if exists "tutor read assigned student packages" on public.student_packages;
create policy "tutor read assigned student packages" on public.student_packages
  for select to authenticated using (public.bimbelfun_tutor_has_student(student_id));

drop policy if exists "admin manage invoices" on public.invoices;
create policy "admin manage invoices" on public.invoices
  for all to authenticated using (public.bimbelfun_is_admin())
  with check (public.bimbelfun_is_admin());
drop policy if exists "admin manage payments" on public.payments;
create policy "admin manage payments" on public.payments
  for all to authenticated using (public.bimbelfun_is_admin())
  with check (public.bimbelfun_is_admin());
drop policy if exists "admin manage expenses" on public.expenses;
create policy "admin manage expenses" on public.expenses
  for all to authenticated using (public.bimbelfun_is_admin())
  with check (public.bimbelfun_is_admin());

drop policy if exists "tutor read assigned class students" on public.class_students;
create policy "tutor read assigned class students" on public.class_students
  for select to authenticated using (public.bimbelfun_tutor_has_class(class_id));

drop policy if exists "tutor read assigned students" on public.students;
create policy "tutor read assigned students" on public.students
  for select to authenticated using (public.bimbelfun_tutor_has_student(id));

grant select on public.students, public.class_students to authenticated;
grant select on public.student_packages to authenticated;
grant select, insert, update on public.attendance_records to authenticated;
grant select, insert, update, delete on public.student_packages to authenticated;
grant select, insert, update, delete on public.invoices, public.payments, public.expenses to authenticated;

-- A meeting is charged only when the tutor completes checkout; undo if a completed
-- attendance is deleted or its package assignment is changed.
create or replace function public.bimbelfun_sync_package_usage()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    if old.package_id is not null and old.check_out is not null then
      update public.student_packages
      set used_meetings = greatest(0, used_meetings - 1),
          status = case when status = 'completed' then 'active' else status end
      where id = old.package_id;
    end if;
    return old;
  elsif TG_OP = 'INSERT' then
    if new.package_id is not null and new.check_out is not null then
      update public.student_packages
      set used_meetings = used_meetings + 1,
          status = case when used_meetings + 1 >= package_meetings then 'completed' else status end
      where id = new.package_id and status = 'active'
        and used_meetings < package_meetings;
      if not found then
        raise exception 'Paket tidak aktif atau seluruh pertemuannya sudah digunakan.';
      end if;
    end if;
    return new;
  else
    if old.package_id is not null and old.check_out is not null
       and (new.package_id is distinct from old.package_id or new.check_out is null) then
      update public.student_packages
      set used_meetings = greatest(0, used_meetings - 1),
          status = case when status = 'completed' then 'active' else status end
      where id = old.package_id;
    end if;

    if new.package_id is not null and new.check_out is not null
       and (old.check_out is null or old.package_id is distinct from new.package_id) then
      update public.student_packages
      set used_meetings = used_meetings + 1,
          status = case when used_meetings + 1 >= package_meetings then 'completed' else status end
      where id = new.package_id and status = 'active'
        and used_meetings < package_meetings;
      if not found then
        raise exception 'Paket tidak aktif atau seluruh pertemuannya sudah digunakan.';
      end if;
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists attendance_package_usage_trigger on public.attendance_records;
create trigger attendance_package_usage_trigger
after insert or update of check_out, package_id or delete on public.attendance_records
for each row execute function public.bimbelfun_sync_package_usage();

create or replace function public.bimbelfun_refresh_invoice_status()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_invoice uuid;
declare total_paid numeric(12,2);
declare invoice_amount numeric(12,2);
begin
  target_invoice := case when TG_OP = 'DELETE' then old.invoice_id else new.invoice_id end;
  select amount into invoice_amount from public.invoices where id = target_invoice;
  select coalesce(sum(amount),0) into total_paid from public.payments where invoice_id = target_invoice;
  update public.invoices
  set status = case when total_paid >= invoice_amount then 'paid'
                    when total_paid > 0 then 'partial' else 'unpaid' end
  where id = target_invoice;
  if TG_OP = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists payments_refresh_invoice_status on public.payments;
create trigger payments_refresh_invoice_status
after insert or update or delete on public.payments
for each row execute function public.bimbelfun_refresh_invoice_status();

-- Tutor hanya dapat mengisi presensi untuk murid dan paket pada kelas yang ditugaskan.
drop policy if exists "attendance tutor insert own" on public.attendance_records;
create policy "attendance tutor insert own" on public.attendance_records
  for insert to authenticated with check (
    exists (
      select 1 from public.tutors t
      join public.class_tutors ct on ct.tutor_id = t.id
      join public.schedules s on s.class_id = ct.class_id
      where t.id = attendance_records.tutor_id
        and t.profile_user_id = auth.uid()
        and s.id = attendance_records.schedule_id
    )
    and student_id is not null
    and public.bimbelfun_tutor_student_in_class(student_id, schedule_id)
    and package_id is not null
    and public.bimbelfun_package_belongs_to_student(package_id, student_id)
    and nullif(trim(teaching_address), '') is not null
  );

drop policy if exists "attendance tutor update own" on public.attendance_records;
create policy "attendance tutor update own" on public.attendance_records
  for update to authenticated using (
    exists (select 1 from public.tutors t
      where t.id = attendance_records.tutor_id and t.profile_user_id = auth.uid())
  ) with check (
    exists (
      select 1 from public.tutors t
      join public.class_tutors ct on ct.tutor_id = t.id
      join public.schedules s on s.class_id = ct.class_id
      where t.id = attendance_records.tutor_id
        and t.profile_user_id = auth.uid()
        and s.id = attendance_records.schedule_id
    )
    and student_id is not null
    and public.bimbelfun_tutor_student_in_class(student_id, schedule_id)
    and package_id is not null
    and public.bimbelfun_package_belongs_to_student(package_id, student_id)
    and nullif(trim(teaching_address), '') is not null
  );

-- Tambahkan tabel baru ke Realtime bila publication sudah tersedia.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.student_packages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.invoices; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.payments; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end;
  end if;
end $$;

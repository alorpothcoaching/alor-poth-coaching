-- Alor Poth Coaching Centre: Supabase SQL setup
-- Supabase Dashboard > SQL Editor > New query > paste and Run.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  guardian_name text not null,
  dob date not null,
  class_name text not null,
  phone text not null,
  address text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  roll_no text not null,
  student_name text not null,
  dob date not null,
  class_name text not null,
  exam_name text not null,
  marks numeric not null,
  total_marks numeric not null,
  grade text,
  created_at timestamptz not null default now()
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_url text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.admissions enable row level security;
alter table public.results enable row level security;
alter table public.resources enable row level security;
alter table public.notices enable row level security;

create or replace function public.is_coaching_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.admins where user_id = auth.uid()); $$;

-- Public visitors may submit an admission application; only admins can read/manage it.
drop policy if exists "public admission submit" on public.admissions;
create policy "public admission submit" on public.admissions for insert to anon, authenticated with check (status = 'pending');
drop policy if exists "admin manage admissions" on public.admissions;
create policy "admin manage admissions" on public.admissions for all to authenticated using (public.is_coaching_admin()) with check (public.is_coaching_admin());

-- Result rows are not publicly readable. Public lookup uses the exact-match RPC below.
drop policy if exists "admin manage results" on public.results;
create policy "admin manage results" on public.results for all to authenticated using (public.is_coaching_admin()) with check (public.is_coaching_admin());

create or replace function public.lookup_student_result(
  p_roll_no text, p_student_name text, p_dob date, p_class_name text
)
returns table(roll_no text, student_name text, class_name text, exam_name text, marks numeric, total_marks numeric, grade text)
language sql stable security definer
set search_path = public
as $$
  select r.roll_no, r.student_name, r.class_name, r.exam_name, r.marks, r.total_marks, r.grade
  from public.results r
  where lower(trim(r.roll_no)) = lower(trim(p_roll_no))
    and lower(trim(r.student_name)) = lower(trim(p_student_name))
    and r.dob = p_dob
    and lower(trim(r.class_name)) = lower(trim(p_class_name))
  limit 1;
$$;
revoke all on function public.lookup_student_result(text,text,date,text) from public;
grant execute on function public.lookup_student_result(text,text,date,text) to anon, authenticated;

drop policy if exists "public read published resources" on public.resources;
create policy "public read published resources" on public.resources for select to anon, authenticated using (is_published = true);
drop policy if exists "admin manage resources" on public.resources;
create policy "admin manage resources" on public.resources for all to authenticated using (public.is_coaching_admin()) with check (public.is_coaching_admin());

drop policy if exists "public read published notices" on public.notices;
create policy "public read published notices" on public.notices for select to anon, authenticated using (is_published = true);
drop policy if exists "admin manage notices" on public.notices;
create policy "admin manage notices" on public.notices for all to authenticated using (public.is_coaching_admin()) with check (public.is_coaching_admin());

-- Storage bucket for public PDF reading; upload/delete restricted to admins.
insert into storage.buckets (id, name, public)
values ('study-pdfs', 'study-pdfs', true)
on conflict (id) do update set public = true;

drop policy if exists "public read study pdfs" on storage.objects;
create policy "public read study pdfs" on storage.objects for select to anon, authenticated using (bucket_id = 'study-pdfs');
drop policy if exists "admin upload study pdfs" on storage.objects;
create policy "admin upload study pdfs" on storage.objects for insert to authenticated with check (bucket_id = 'study-pdfs' and public.is_coaching_admin());
drop policy if exists "admin delete study pdfs" on storage.objects;
create policy "admin delete study pdfs" on storage.objects for delete to authenticated using (bucket_id = 'study-pdfs' and public.is_coaching_admin());

-- After creating your first admin user in Supabase Authentication > Users,
-- copy that user's UUID and run this (replace UUID):
-- insert into public.admins(user_id) values ('PASTE_AUTH_USER_UUID_HERE');

-- Shared board explicitly requested by the coordinator.
-- No login or ownership: anyone with the public API key can read/write/delete.
-- Run once in Supabase SQL Editor.
begin;
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  lecturer text not null check (lecturer in ('NC','LF','AM','CC','RM','MR','JD','TC','PGi','VOB','HAJ','PGo','CK')),
  module text not null check (module in ('Aviation Science 1','Aircraft Anatomy & Design','Mathematics 1','Avionics Fundamentals','Management Fundamentals & Communication')),
  groups text[] not null check (
    cardinality(groups) between 1 and 6
    and groups <@ array['AVIATION_1','AVIATION_2','AVIATION_3','AVIATION_4','AVIATION_5','AVIATION_6']::text[]
    and array_position(groups, null) is null
  ),
  type text not null check (type in ('Quiz','Class Test','Lab Report','Presentation','Project Milestone','Project Submission','Practical Assessment','Other')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  weighting numeric(4,1) not null check (weighting between 0 and 100),
  due_date date not null check (due_date between date '0001-01-01' and date '9999-12-31'),
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default clock_timestamp()
);
create index assessments_due_date_idx on public.assessments (due_date, id);
alter table public.assessments enable row level security;
revoke all on public.assessments from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.assessments to anon, authenticated;
create policy shared_read on public.assessments for select to anon, authenticated using (true);
create policy shared_insert on public.assessments for insert to anon, authenticated with check (true);
create policy shared_update on public.assessments for update to anon, authenticated using (true) with check (true);
create policy shared_delete on public.assessments for delete to anon, authenticated using (true);
create function public.validate_assessment_update() returns trigger language plpgsql set search_path = '' as $$
begin
  if cardinality(new.groups) <> (select count(distinct g) from unnest(new.groups) g) then
    raise exception 'Groups must be unique';
  end if;
  if TG_OP = 'UPDATE' and new.id <> old.id then
    raise exception 'Assessment ID cannot be changed';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger assessment_before_write before insert or update on public.assessments for each row execute function public.validate_assessment_update();
commit;

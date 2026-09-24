-- Run once in the Supabase SQL Editor. Public reading and editing are intentional.
create table public.reports (
  id text primary key check (length(id) between 1 and 200),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint valid_payload check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['id','reporterName','reporterType','personName','guardianName',
      'personSafety','personLocation','guardianSafety','guardianLocation','companionType',
      'reportedAt','sourceRowId','personComment','guardianComment']
    and payload->>'id' = id
    and length(trim(payload->>'reporterName')) > 0
    and length(trim(payload->>'personName')) > 0
    and length(payload::text) <= 20000
  )
);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select, insert, update on public.reports to anon, authenticated;
create policy public_read on public.reports for select to anon, authenticated using (true);
create policy public_insert on public.reports for insert to anon, authenticated with check (true);
create policy public_update on public.reports for update to anon, authenticated using (true) with check (true);

create function public.set_report_updated_at() returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger report_updated_at before update on public.reports
for each row execute function public.set_report_updated_at();

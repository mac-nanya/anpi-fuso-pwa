-- Apply once AFTER schema.sql, using the Supabase SQL Editor.
-- The transaction preserves historical rows as superseded records (no hard deletion).
begin;
lock table public.reports in access exclusive mode;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.report_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table private.report_admin enable row level security;
revoke all on private.report_admin from public, anon, authenticated;

create function public.is_report_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.report_admin where user_id = (select auth.uid()));
$$;
revoke all on function public.is_report_admin() from public;
grant execute on function public.is_report_admin() to anon, authenticated;

create function private.reporter_key(value text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(value, '[[:space:]' || chr(160) || chr(65279) || ']', '', 'g'));
$$;

alter table public.reports add column reporter_key text;
alter table public.reports add column deleted_at timestamptz;
alter table public.reports add column deleted_by uuid;
alter table public.reports add column superseded_by text references public.reports(id);
update public.reports set reporter_key = private.reporter_key(payload->>'reporterName');
-- Pick the same latest report as the UI, with stable tie-breakers.
with ranked as (
  select id, first_value(id) over (
    partition by reporter_key order by (payload->>'reportedAt')::timestamptz desc, updated_at desc, id
  ) as canonical_id from public.reports
)
update public.reports r set superseded_by = ranked.canonical_id
from ranked where r.id = ranked.id and r.id <> ranked.canonical_id;
alter table public.reports alter column reporter_key set not null;
alter table public.reports add constraint nonempty_reporter_key check (reporter_key <> '');
create unique index reports_one_per_reporter on public.reports(reporter_key) where superseded_by is null;
create index reports_updated_at on public.reports(updated_at, id);

-- No direct browser write path: all changes go through the narrowly scoped functions below.
revoke all on public.reports from public, anon, authenticated;
drop policy public_read on public.reports;
drop policy public_insert on public.reports;
drop policy public_update on public.reports;

create function private.report_json(r public.reports) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'payload', r.payload, 'updated_at', r.updated_at,
    'deleted_at', r.deleted_at, 'superseded_by', r.superseded_by);
$$;

create function public.list_reports(p_since timestamptz default null, p_after_id text default null, p_limit integer default 500)
returns table(id text, payload jsonb, updated_at timestamptz, deleted_at timestamptz, superseded_by text)
language sql stable security definer set search_path = '' as $$
  select r.id,
    case when r.deleted_at is null and r.superseded_by is null then r.payload
      else jsonb_build_object('id', r.id, 'reporterName', '', 'reportedAt', r.payload->>'reportedAt') end,
    r.updated_at, r.deleted_at, r.superseded_by
  from public.reports r
  where (p_since is null or r.updated_at >= p_since) and (p_after_id is null or r.id > p_after_id)
  order by r.id limit least(greatest(p_limit, 1), 500);
$$;

create function public.save_report(p_report jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.reports;
  requested_id text := p_report->>'id';
  name_key text := private.reporter_key(p_report->>'reporterName');
  target_id text;
begin
  -- Thirty users: serialize mutations to resolve concurrent first submissions and deletion safely.
  perform pg_advisory_xact_lock(20260925, 1);
  if requested_id is null or name_key is null or name_key = '' then
    raise exception '入力者名と回答IDが必要です' using errcode = '22023';
  end if;
  select * into r from public.reports where id = requested_id;
  if found then
    if r.superseded_by is not null then
      select * into r from public.reports where id = r.superseded_by;
      -- A historical offline edit cannot rename or revive a retired identity.
      if r.reporter_key <> name_key then
        raise exception '古い回答です。再読み込みして入力し直してください' using errcode = 'P0001';
      end if;
    end if;
    target_id := r.id;
  else
    select * into r from public.reports where reporter_key = name_key and superseded_by is null;
    if found then target_id := r.id; end if;
  end if;
  if target_id is not null then
    if r.deleted_at is not null then
      raise exception 'この入力者の回答は削除済みです。管理者に復元を依頼してください' using errcode = 'P0002';
    end if;
    if exists(select 1 from public.reports where reporter_key = name_key and superseded_by is null and id <> target_id) then
      raise exception 'その入力者名は使用済みです。別の名前にしてください' using errcode = 'P0001';
    end if;
    update public.reports set payload = (p_report - array['isLocalDraft','isSynced','isDeleted','isSuperseded','serverUpdatedAt']) || jsonb_build_object('id', target_id),
      reporter_key = name_key where id = target_id returning * into r;
  else
    insert into public.reports(id, payload, reporter_key)
    values(requested_id, p_report - array['isLocalDraft','isSynced','isDeleted','isSuperseded','serverUpdatedAt'], name_key)
    returning * into r;
  end if;
  return private.report_json(r);
end;
$$;

create function public.set_report_deleted(p_id text, p_deleted boolean, p_expected_updated_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  if not public.is_report_admin() then raise exception '管理者ログインが必要です' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(20260925, 1);
  select * into r from public.reports where id = p_id and superseded_by is null for update;
  if not found then raise exception '回答が見つかりません' using errcode = 'P0001'; end if;
  if p_deleted is null or p_expected_updated_at is null or r.updated_at <> p_expected_updated_at then
    raise exception '回答が更新されています。最新の内容を確認してやり直してください' using errcode = 'P0001';
  end if;
  update public.reports set deleted_at = case when p_deleted then clock_timestamp() else null end,
    deleted_by = case when p_deleted then auth.uid() else null end
  where id = p_id returning * into r;
  return private.report_json(r);
end;
$$;

create function public.list_deleted_reports(p_after_id text default null, p_limit integer default 500)
returns table(id text, payload jsonb, updated_at timestamptz, deleted_at timestamptz, superseded_by text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_report_admin() then raise exception '管理者ログインが必要です' using errcode = '42501'; end if;
  return query select r.id, r.payload, r.updated_at, r.deleted_at, r.superseded_by
    from public.reports r where r.deleted_at is not null and r.superseded_by is null
      and (p_after_id is null or r.id > p_after_id)
    order by r.id limit least(greatest(p_limit, 1), 500);
end;
$$;

revoke all on function public.list_reports(timestamptz,text,integer) from public;
revoke all on function public.save_report(jsonb) from public;
revoke all on function public.set_report_deleted(text,boolean,timestamptz) from public, anon;
revoke all on function public.list_deleted_reports(text,integer) from public, anon;
grant execute on function public.list_reports(timestamptz,text,integer) to anon, authenticated;
grant execute on function public.save_report(jsonb) to anon, authenticated;
grant execute on function public.set_report_deleted(text,boolean,timestamptz) to authenticated;
grant execute on function public.list_deleted_reports(text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;

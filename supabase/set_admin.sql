-- Run after creating the confirmed user in Supabase Authentication > Users.
-- Replace the email below only when changing the designated administrator.
begin;
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users
    where lower(email) = lower('mac.nanya@gmail.com') and email_confirmed_at is not null;
  if admin_id is null then
    raise exception '先にAuthentication > Usersで管理者を作成し、メール確認を完了してください';
  end if;
  insert into private.report_admin(singleton, user_id) values(true, admin_id)
    on conflict(singleton) do update set user_id = excluded.user_id;
end;
$$;
commit;

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const adminId = '11111111-1111-1111-1111-111111111111';
const otherId = '22222222-2222-2222-2222-222222222222';
const report = (id, name, date = '2026-09-25T00:00:00Z') => ({
  id, reporterName: name, reporterType: '本人', personName: '本人', guardianName: '',
  personSafety: '無事', personLocation: '自宅', guardianSafety: '', guardianLocation: '',
  companionType: '', reportedAt: date, sourceRowId: '', personComment: '', guardianComment: '',
});

test('database migration, public saves, admin authorization, tombstones, restoration and stale clients', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      insert into auth.users values ('${adminId}', 'mac.nanya@gmail.com', now()), ('${otherId}', 'other@example.test', now());`);
    await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
    for (const r of [report('old', '山田', '2026-08-17T00:00:00Z'), report('current', '山 田'), report('other', '別名')]) {
      await db.query('insert into public.reports(id,payload) values($1,$2)', [r.id, r]);
    }
    await db.exec(readFileSync(new URL('../supabase/migrations/20260925_admin_reports.sql', import.meta.url), 'utf8'));
    const archived = await db.query("select superseded_by from public.reports where id='old'");
    assert.equal(archived.rows[0].superseded_by, 'current');
    assert.equal((await db.query('select count(*)::int as n from public.reports')).rows[0].n, 3, 'migration preserves history');
    await db.exec(readFileSync(new URL('../supabase/set_admin.sql', import.meta.url), 'utf8'));
    await db.exec(readFileSync(new URL('../supabase/set_admin.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('select count(*)::int as n from private.report_admin')).rows[0].n, 1);
    const role = async (name, uid = '') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
      await db.exec(`set role ${name}`);
    };
    const save = async r => (await db.query('select public.save_report($1) as r', [r])).rows[0].r;
    const feed = async since => (await db.query('select * from public.list_reports($1)', [since ?? null])).rows;
    const deletion = async (id, deleted, version) => (await db.query('select public.set_report_deleted($1,$2,$3) as r', [id, deleted, version])).rows[0].r;
    await role('anon');
    assert.equal((await db.query('select public.is_report_admin() as ok')).rows[0].ok, false);
    await assert.rejects(db.query('select * from public.reports'), /permission denied/);
    await assert.rejects(db.query('delete from public.reports'), /permission denied/);
    await assert.rejects(db.query("update public.reports set deleted_at=now()"), /permission denied/);
    await assert.rejects(db.query('select * from private.report_admin'), /permission denied/);
    await assert.rejects(db.query('select * from public.list_deleted_reports()'), /permission denied/);
    const firstFeed = await feed();
    assert.equal(firstFeed.find(r => r.id === 'old').payload.reporterName, '', 'archive is a redacted tombstone');
    const same = await save(report('new-device', '山　田'));
    assert.equal(same.id, 'current', 'same normalized name updates canonical row');
    const oldEdit = await save(report('old', '山田'));
    assert.equal(oldEdit.id, 'current', 'old offline ID maps to canonical row');
    await assert.rejects(save(report('current', '別名')), /使用済み/);
    await assert.rejects(save({ ...report('bad', '不完全'), personName: '' }), /valid_payload/);
    const fresh = await save({ ...report('fresh', '新規'), isDeleted: true, isSuperseded: true });
    assert.equal(fresh.payload.isDeleted, undefined);
    assert.equal(fresh.payload.isSuperseded, undefined);
    assert.equal(fresh.id, 'fresh');
    await assert.rejects(deletion('current', true, oldEdit.updated_at), /permission denied/);
    await role('authenticated', otherId);
    assert.equal((await db.query('select public.is_report_admin() as ok')).rows[0].ok, false);
    await assert.rejects(deletion('current', true, oldEdit.updated_at), /管理者ログイン/);
    await assert.rejects(db.query('select * from public.list_deleted_reports()'), /管理者ログイン/);
    await role('authenticated', adminId);
    assert.equal((await db.query('select public.is_report_admin() as ok')).rows[0].ok, true);
    await assert.rejects(deletion('current', true, '2020-01-01T00:00:00Z'), /更新されています/);
    const deleted = await deletion('current', true, oldEdit.updated_at);
    assert.ok(deleted.deleted_at);
    const trash = (await db.query('select * from public.list_deleted_reports()')).rows;
    assert.deepEqual(trash.map(r => r.id), ['current']);
    assert.equal(trash[0].payload.reporterName, '山田');
    await role('anon');
    const delta = await feed(oldEdit.updated_at);
    assert.ok(delta.some(r => r.id === 'current' && r.deleted_at), 'deletion is visible in delta feed');
    assert.equal(delta.find(r => r.id === 'current').payload.reporterName, '', 'deleted content is not public');
    await assert.rejects(save(report('current', '山田')), /削除済み/);
    await assert.rejects(save(report('old', '山田')), /削除済み/);
    await assert.rejects(save(report('another-new-id', '山 田')), /削除済み/);
    await role('authenticated', adminId);
    const restored = await deletion('current', false, deleted.updated_at);
    assert.equal(restored.deleted_at, null);
    assert.equal((await db.query('select * from public.list_deleted_reports()')).rows.length, 0);
    await role('anon');
    const restoredFeed = await feed(deleted.updated_at);
    assert.equal(restoredFeed.find(r => r.id === 'current').payload.reporterName, '山田');
    assert.ok(restoredFeed.find(r => r.id === 'old')?.superseded_by || !restoredFeed.some(r => r.id === 'old'));
    const renamed = await save(report('current', '新しい名前'));
    assert.equal(renamed.payload.reporterName, '新しい名前');
    await assert.rejects(save(report('old', '山田')), /古い回答/);
    // A table-level unique index is the final guard against competing initial submissions.
    await role('postgres');
    await assert.rejects(db.query('insert into public.reports(id,payload,reporter_key) values($1,$2,$3)', ['duplicate', report('duplicate', '新しい名前'), '新しい名前']), /unique constraint/);
    assert.equal((await db.query('select count(*)::int as n from public.reports')).rows[0].n, 4);
  } finally { await db.close(); }
});

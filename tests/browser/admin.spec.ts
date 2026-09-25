import { test, expect } from '@playwright/test';

test('admin logs in, deletes one report, restores it, and logs out; regular users have no delete button', async ({ page }) => {
  let deleted = false;
  let generation = 0;
  const payload = {
    id: 'test-one', reporterName: '検証用入力者', reporterType: '本人', personName: '検証用本人', guardianName: '',
    personSafety: '無事', personLocation: '自宅', guardianSafety: '', guardianLocation: '', companionType: '',
    reportedAt: '2026-09-25T00:00:00Z', sourceRowId: '', personComment: '', guardianComment: '',
  };
  const record = () => ({ id: payload.id, payload, updated_at: `2026-09-25T01:00:0${generation}Z`, deleted_at: deleted ? '2026-09-25T01:00:01Z' : null, superseded_by: null });
  const user = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-09-25T00:00:00Z' };
  // Intercept every Supabase request. Browser tests never read or mutate real reports.
  await page.route('https://*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const respond = (json: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    if (url.pathname.endsWith('/token')) return respond({ access_token: 'test-token', refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user });
    if (url.pathname.endsWith('/user')) return respond(user);
    if (url.pathname.endsWith('/logout')) return respond({});
    if (url.pathname.endsWith('/is_report_admin')) return respond(route.request().headers().authorization === 'Bearer test-token');
    if (url.pathname.endsWith('/list_reports')) return respond([{ ...record(), payload: deleted ? { id: payload.id, reporterName: '', reportedAt: payload.reportedAt } : payload }]);
    if (url.pathname.endsWith('/list_deleted_reports')) return respond(deleted ? [record()] : []);
    if (url.pathname.endsWith('/set_report_deleted')) {
      expect(route.request().headers().authorization).toBe('Bearer test-token');
      const body = route.request().postDataJSON();
      expect(body.p_expected_updated_at).toBe(record().updated_at);
      deleted = body.p_deleted;
      generation++;
      return respond(record());
    }
    return respond({ message: 'Unexpected test request' }, 400);
  });
  await page.goto('/');
  await expect(page.getByRole('status').first()).toHaveText('同期済み');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'リスト', exact: true }).first().click();
  await page.getByRole('button', { name: /入力者：検証用入力者/ }).click();
  await expect(page.getByRole('button', { name: 'この回答を削除する' })).toHaveCount(0);
  await page.getByRole('button', { name: '管理者ログイン', exact: true }).click();
  await page.getByLabel('メールアドレス', { exact: true }).fill('admin@example.test');
  await page.getByLabel('パスワード', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();
  await expect(page.getByText('管理者としてログインしました。')).toBeVisible();
  const deleteButton = page.getByRole('button', { name: 'この回答を削除する' });
  await expect(deleteButton).toBeEnabled();
  page.once('dialog', dialog => dialog.dismiss());
  await deleteButton.click();
  expect(deleted).toBe(false);
  page.once('dialog', dialog => { expect(dialog.message()).toContain('検証用入力者'); return dialog.accept(); });
  await deleteButton.click();
  await expect(page.getByText('回答をごみ箱に移しました。管理者メニューから復元できます。')).toBeVisible();
  await expect(page.getByRole('button', { name: /入力者：検証用入力者/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'ごみ箱を表示・更新' }).click();
  await expect(page.getByRole('heading', { name: 'ごみ箱', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '復元', exact: true }).click();
  await expect(page.getByText('削除済みの回答はありません。')).toBeVisible();
  await expect(page.getByRole('button', { name: /入力者：検証用入力者/ })).toBeVisible();
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await expect(page.getByText('ログアウトしました。')).toBeVisible();
  await page.getByRole('button', { name: /入力者：検証用入力者/ }).click();
  await expect(page.getByRole('button', { name: 'この回答を削除する' })).toHaveCount(0);
});

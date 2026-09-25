import { test, expect } from '@playwright/test';

test('detail heading follows the selected subject, not the reporter', async ({ page }) => {
  let reporterType = '保護者';
  const personName = '本人テスト氏名';
  const guardianName = '保護者テスト氏名';
  const reporterName = '入力者テスト氏名';
  await page.route('https://*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/list_reports')) {
      return route.fulfill({ json: [{
        id: 'subject-test', updated_at: '2026-09-25T01:00:00Z', deleted_at: null, superseded_by: null,
        payload: { id: 'subject-test', reporterName, reporterType, personName, guardianName,
          personSafety: '無事', guardianSafety: '軽症', personLocation: '自宅', guardianLocation: '避難所',
          companionType: '家族', reportedAt: '2026-09-25T00:00:00Z', sourceRowId: '', personComment: '本人のコメント', guardianComment: '保護者のコメント' },
      }] });
    }
    return route.fulfill({ status: 400, json: { message: 'Unexpected request' } });
  });
  const scenarios = [
    { tab: 'リスト', subject: '本人', category: '', reporter: '保護者' },
    { tab: '安否', subject: '本人', category: '無事', reporter: '保護者' },
    { tab: '安否', subject: '保護者', category: '軽症', reporter: '保護者' },
    { tab: '現在地', subject: '保護者', category: '避難所', reporter: '本人' },
    { tab: '現在地', subject: '本人', category: '自宅', reporter: '保護者' },
  ];
  const actual = [];
  const expected = [];
  for (const scenario of scenarios) {
    reporterType = scenario.reporter;
    await page.goto('/');
    await expect(page.getByRole('status').first()).toHaveText('同期済み');
    await page.getByRole('button', { name: scenario.tab, exact: true }).click();
    const name = scenario.subject === '本人' ? personName : guardianName;
    if (scenario.tab === 'リスト') {
      await page.locator('.list-row').click();
    } else {
      await page.locator('.segment-control').getByRole('button', { name: scenario.subject, exact: true }).click();
      await page.locator('.summary-row').filter({ has: page.getByText(scenario.category, { exact: true }) }).click();
      await page.locator('.target-row').filter({ hasText: name }).click();
    }
    const detail = page.locator('.detail-view');
    await expect(page.locator('.mobile-title')).toHaveText(name);
    actual.push({ route: `${scenario.tab}/${scenario.subject}`, label: await detail.locator('.eyebrow').innerText(), name: await detail.locator('h1').innerText(), firstSection: await detail.locator('.detail-section h2').first().innerText() });
    expected.push({ route: `${scenario.tab}/${scenario.subject}`, label: scenario.subject, name, firstSection: scenario.subject });
    // The reporter remains independently identified in the input metadata.
    await expect(detail.locator('.detail-section').filter({ has: page.getByRole('heading', { name: '入力した人', exact: true }) })).toContainText(reporterName);
    await expect(detail.locator('.date-muted')).not.toBeEmpty();
    await detail.getByRole('button', { name: 'もどる', exact: true }).click();
    if (scenario.tab !== 'リスト') await expect(page.locator('.breadcrumb')).toContainText(`${scenario.subject}の${scenario.tab}`);
  }
  expect(actual).toEqual(expected);
});

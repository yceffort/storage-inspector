import { expect, test } from '@playwright/test'

test('IIFE 를 head 에 넣어도 body 에 마운트되고 편집이 된다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/e2e/iife.html')

  await page.locator('si-launcher button').click()
  expect(await page.evaluate(() => document.querySelector('storage-inspector')?.parentElement?.tagName)).toBe('BODY')

  const row = page.locator('si-entry-row').filter({ hasText: 'foo' })
  await expect(row.locator('.desc')).toHaveText('푸')
  await row.locator('.row').click()
  await page.locator('si-entry-sheet label:last-of-type input').fill('42')
  await page.locator('si-entry-sheet button.primary').click()
  expect(await page.evaluate(() => localStorage.getItem('foo'))).toBe('42')
  expect(errors).toEqual([])
})

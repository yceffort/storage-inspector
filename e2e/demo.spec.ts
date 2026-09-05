import { expect, test, type Page } from '@playwright/test'

async function openPanel(page: Page) {
  await page.goto('/')
  await page.locator('si-launcher button').click()
  await expect(page.locator('si-panel')).toBeVisible()
}

const rowByKey = (page: Page, key: string) => page.locator('si-entry-row').filter({ hasText: key })

test('스키마 항목과 미등록 항목을 함께 보여준다', async ({ page }) => {
  await openPanel(page)
  const keys = await page.locator('si-entry-row .key').allTextContents()
  expect(keys).toEqual(['accessToken', 'darkMode', 'neverSet', 'retryCount', 'lastVisited'])
  await expect(rowByKey(page, 'retryCount').locator('.badge.unregistered')).toHaveText('미등록')
  await expect(rowByKey(page, 'neverSet').locator('.preview')).toHaveText('값 없음')

  await page.locator('si-panel .tabs button', { hasText: 'sessionStorage' }).click()
  await expect(page.locator('si-entry-row .key')).toHaveText(['draft'])
})

test('boolean 값을 토글해 저장한다', async ({ page }) => {
  await openPanel(page)
  await rowByKey(page, 'darkMode').locator('.row').click()
  const checkbox = page.locator('si-entry-sheet input[type=checkbox]')
  await expect(checkbox).toBeChecked()
  await checkbox.click()
  await page.locator('si-entry-sheet button.primary').click()
  await expect(page.locator('si-entry-sheet')).toHaveCount(0)
  await expect(rowByKey(page, 'darkMode').locator('.preview')).toHaveText('false')
  expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('false')
})

test('잘못된 JSON 은 저장을 막는다', async ({ page }) => {
  await openPanel(page)
  await page.locator('si-panel .tabs button', { hasText: 'sessionStorage' }).click()
  await rowByKey(page, 'draft').locator('.row').click()
  const textarea = page.locator('si-entry-sheet textarea')
  await textarea.fill('{"title": ')
  await expect(page.locator('si-entry-sheet .error')).toContainText('JSON 파싱 실패')
  await expect(page.locator('si-entry-sheet button.primary')).toBeDisabled()
  await textarea.fill('{"title": "수정"}')
  await page.locator('si-entry-sheet button.primary').click()
  expect(await page.evaluate(() => sessionStorage.getItem('draft'))).toBe('{"title":"수정"}')
})

test('바꾼 타입은 패널을 닫았다 열어도 유지된다', async ({ page }) => {
  await openPanel(page)
  await rowByKey(page, 'retryCount').locator('.row').click()
  await page.locator('si-entry-sheet select').first().selectOption('string')
  await page.locator('si-entry-sheet button.primary').click()
  await expect(rowByKey(page, 'retryCount').locator('.badge').first()).toHaveText('string')
  await page.locator('si-panel header button', { hasText: '닫기' }).click()
  await page.locator('si-launcher button').click()
  await expect(rowByKey(page, 'retryCount').locator('.badge').first()).toHaveText('string')
})

test('삭제 버튼은 즉시 지운다', async ({ page }) => {
  await openPanel(page)
  await rowByKey(page, 'lastVisited').locator('button').click()
  await expect(rowByKey(page, 'lastVisited')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('lastVisited'))).toBeNull()
})

test('새 키를 추가하고 중복 키는 막는다', async ({ page }) => {
  await openPanel(page)
  await page.locator('si-panel header button', { hasText: '추가' }).click()
  const inputs = page.locator('si-entry-sheet input')
  await inputs.nth(0).fill('accessToken')
  await expect(page.locator('si-entry-sheet .error')).toHaveText('이미 있는 키입니다')
  await inputs.nth(0).fill('newKey')
  await inputs.nth(1).fill('hello')
  await page.locator('si-entry-sheet button.primary').click()
  await expect(rowByKey(page, 'newKey').locator('.badge.unregistered')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('newKey'))).toBe('hello')
})

test('새로고침 버튼이 외부 변경을 반영한다', async ({ page }) => {
  await openPanel(page)
  await page.evaluate(() => localStorage.setItem('external', '1'))
  await expect(rowByKey(page, 'external')).toHaveCount(0)
  await page.locator('si-panel header button', { hasText: '새로고침' }).click()
  await expect(rowByKey(page, 'external')).toHaveCount(1)
})

test.describe('다크 모드', () => {
  test.use({ colorScheme: 'dark' })

  test('시스템이 다크면 패널이 어두운 배경을 쓴다', async ({ page }) => {
    await openPanel(page)
    const bg = await page.locator('si-panel').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(28, 28, 30)')
    const scheme = await page.locator('storage-inspector').evaluate((el) => getComputedStyle(el).colorScheme)
    expect(scheme).toBe('dark')
  })

  test('theme="light" 를 주면 시스템 설정보다 우선한다', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      document.querySelector('storage-inspector')?.setAttribute('theme', 'light')
    })
    await page.locator('si-launcher button').click()
    const bg = await page.locator('si-panel').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(255, 255, 255)')
  })
})

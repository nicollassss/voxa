import { test, expect } from '@playwright/test';

const contact = { id: 998001, name: 'Contato de teste', avatar_url: '/images/avatar-default.svg' };
const password = 'History-Test-2026!';
const message = id => ({
    id: String(id).padStart(4, '0'), from_id: contact.id, to_id: 0,
    body: `Histórico ${id}`, created_at: '2026-09-09T00:00:00.000Z', sender: contact,
});
const history = (first, last, cursor = null) => ({
    messages: Array.from({ length: last - first + 1 }, (_, i) => message(first + i)), next_cursor: cursor,
});

test.beforeEach(async ({ page }) => {
    await page.route('**/chat/users', route => route.fulfill({ json: { users: [contact] } }));
    await page.goto('/register');
    await page.locator('#name').fill('Teste de histórico');
    await page.locator('#email').fill(`history-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`);
    await page.locator('#password').fill(password);
    await page.locator('#password_confirmation').fill(password);
    await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByTestId('connection-status')).toHaveText('WebSocket conectado');
});

test.afterEach(async ({ page, context }) => {
    const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    const response = await context.request.delete('/profile', {
        headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' }, data: { password },
        maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location).pathname).toBe('/');
});

test('botão de nova tentativa recupera o histórico após falha HTTP', async ({ page }) => {
    let attempts = 0;
    await page.route(`**/chat/${contact.id}/messages*`, route => {
        attempts++;
        return attempts === 1
            ? route.fulfill({ status: 503, json: {} })
            : route.fulfill({ json: history(1, 1) });
    });
    await page.getByRole('button', { name: contact.name, exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar o histórico. Tente novamente.');
    await page.locator('#message').fill('Rascunho preservado');
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByTestId('message-body')).toHaveText(['Histórico 1']);
    await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeHidden();
    await expect(page.locator('#message')).toHaveValue('Rascunho preservado');
    expect(attempts).toBe(2);
});

test('reconexão preenche automaticamente mais de uma página de mensagens', async ({ page }) => {
    let disconnectedHistory = false;
    const cursors = [];
    await page.route(`**/chat/${contact.id}/messages*`, route => {
        const cursor = new URL(route.request().url()).searchParams.get('cursor');
        cursors.push(cursor);
        return route.fulfill({ json: !disconnectedHistory ? history(1, 1)
            : cursor ? history(1, 11) : history(12, 61, 'before-12') });
    });
    await page.getByRole('button', { name: contact.name, exact: true }).click();
    await expect(page.getByTestId('message-body')).toHaveText(['Histórico 1']);
    await page.evaluate(() => window.Echo.disconnect());
    await expect(page.getByTestId('connection-status')).toContainText('Sem conexão');
    disconnectedHistory = true;
    await page.evaluate(() => window.Echo.connector.pusher.connect());
    await expect(page.getByTestId('connection-status')).toHaveText('WebSocket conectado');
    await expect(page.getByTestId('message-body')).toHaveText(Array.from({ length: 61 }, (_, i) => `Histórico ${i + 1}`));
    expect(cursors).toEqual([null, null, 'before-12']);
});

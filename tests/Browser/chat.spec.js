import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('dois usuários trocam mensagens pelo WebSocket, recuperam histórico e reconectam', async ({ browser }, testInfo) => {
    const suffix = `${Date.now()}`;
    const password = 'Chat-Teste-2026!';
    const contexts = [await browser.newContext({ baseURL: 'http://127.0.0.1:8000' }), await browser.newContext({ baseURL: 'http://127.0.0.1:8000' })];
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    const accounts = [
        { name: `Alice ${suffix}`, email: `alice-${suffix}@example.test` },
        { name: `Bruno ${suffix}`, email: `bruno-${suffix}@example.test` },
    ];
    const frames = [[], []];
    const handshakes = [];
    const historyRequests = [[], []];
    const pageErrors = [];
    let uploadedAvatar;

    try {
        for (const [index, page] of pages.entries()) {
            const cdp = await contexts[index].newCDPSession(page);
            await cdp.send('Network.enable');
            cdp.on('Network.webSocketHandshakeResponseReceived', event => handshakes.push(event.response.status));
            page.on('pageerror', error => pageErrors.push(error.message));
            page.on('websocket', socket => {
                socket.on('framereceived', event => {
                    try { frames[index].push(JSON.parse(String(event.payload))); } catch { /*controle binário */ }
                });
            });
            page.on('request', request => {
                if (request.method() === 'GET' && /\/chat\/\d+\/messages/.test(request.url())) historyRequests[index].push(request.url());
            });
            await page.goto('/register');
            await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
            await expect(page.locator('body')).toHaveCSS('font-size', '17px');
            await expect(page.getByAltText('Voxa')).toBeVisible();
            await page.locator('#name').fill(accounts[index].name);
            await page.locator('#email').fill(accounts[index].email);
            await page.locator('#password').fill(password);
            await page.locator('#password_confirmation').fill(password);
            await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
            await expect(page).toHaveURL(/\/chat$/);
            await expect(page.getByTestId('connection-status')).toHaveText('WebSocket conectado');
        }
        await pages[0].goto('/profile');
        const profileAvatar = pages[0].getByTestId('profile-avatar');
        await expect(profileAvatar).toHaveAttribute('src', /avatar-default\.svg$/);
        await pages[0].locator('#avatar').setInputFiles(fileURLToPath(new URL('../Fixtures/avatar.png', import.meta.url)));
        await pages[0].getByRole('button', { name: 'Salvar', exact: true }).first().click();
        await expect(profileAvatar).toHaveAttribute('src', /\/storage\/users-avatar\/.+\.png$/);
        const firstAvatar = await profileAvatar.getAttribute('src');
        expect((await contexts[0].request.get(firstAvatar)).status()).toBe(200);

        await pages[0].locator('#avatar').setInputFiles(fileURLToPath(new URL('../Fixtures/avatar.png', import.meta.url)));
        await pages[0].getByRole('button', { name: 'Salvar', exact: true }).first().click();
        await expect(profileAvatar).not.toHaveAttribute('src', firstAvatar);
        uploadedAvatar = await profileAvatar.getAttribute('src');
        expect([403, 404]).toContain((await contexts[0].request.get(firstAvatar)).status());
        expect((await contexts[0].request.get(uploadedAvatar)).status()).toBe(200);
        await expect.poll(() => profileAvatar.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);

        await pages[0].setViewportSize({ width: 390, height: 844 });
        expect(await pages[0].evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await pages[0].screenshot({ path: testInfo.outputPath('voxa-perfil-mobile.png'), fullPage: true });
        await pages[0].getByRole('button', { name: 'Excluir conta', exact: true }).first().click();
        await expect(pages[0].getByRole('dialog')).toBeVisible();
        await expect(pages[0].getByRole('dialog')).toHaveCSS('background-color', 'rgb(18, 29, 49)');
        await pages[0].getByRole('button', { name: 'Cancelar', exact: true }).click();
        await pages[0].setViewportSize({ width: 1280, height: 900 });
        await pages[0].goto('/chat');
        await expect(pages[0].getByTestId('connection-status')).toHaveText('WebSocket conectado');
        await pages[0].getByRole('button', { name: accounts[0].name, exact: true }).click();
        await pages[0].getByRole('link', { name: 'Sair', exact: true }).filter({ visible: true }).click();
        await expect(pages[0]).toHaveURL(/\/login$/);
        await expect(pages[0].getByAltText('Voxa')).toBeVisible();
        await pages[0].screenshot({ path: testInfo.outputPath('voxa-login.png'), fullPage: true });
        await pages[0].locator('#email').fill(accounts[0].email);
        await pages[0].locator('#password').fill(password);
        await pages[0].getByRole('button', { name: 'Entrar', exact: true }).click();
        await expect(pages[0]).toHaveURL(/\/chat$/);
        await expect(pages[0].getByTestId('connection-status')).toHaveText('WebSocket conectado');

        for (const [index, page] of pages.entries()) {
            await page.getByRole('button', { name: accounts[1 - index].name, exact: false }).last().click();
            await expect(page.getByText('A conversa começa com um olá.', { exact: false })).toBeVisible();
        }
        const requestCounts = historyRequests.map(requests => requests.length);
        const navigationCounts = [0, 0];
        pages.forEach((page, index) => page.on('framenavigated', frame => {
            if (frame === page.mainFrame()) navigationCounts[index]++;
        }));

        const hello = `Olá, tudo bem? ${suffix}`;
        await pages[0].locator('#message').fill(hello);
        await pages[0].getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(pages[1].getByTestId('message-body').filter({ hasText: hello })).toHaveCount(1);
        await expect(pages[1].locator('article').filter({ hasText: hello }).getByTestId('message-avatar')).toHaveAttribute('src', uploadedAvatar);
        await expect(pages[0].getByTestId('message-body').filter({ hasText: hello })).toHaveCount(1);

        const reply = `Tudo bem! Resposta em tempo real ${suffix}`;
        await pages[1].locator('#message').fill(reply);
        await pages[1].getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(pages[0].getByTestId('message-body').filter({ hasText: reply })).toHaveCount(1);
        await expect(pages[1].getByTestId('message-body').filter({ hasText: reply })).toHaveCount(1);
        await expect(pages[1].getByTestId('message-body')).toHaveText([hello, reply]);
        await expect(pages[0].locator('article').filter({ hasText: reply }).getByTestId('message-avatar')).toHaveAttribute('src', /avatar-default\.svg$/);
        await pages[1].screenshot({ path: testInfo.outputPath('chat-dois-usuarios.png'), fullPage: true });
        await pages[1].setViewportSize({ width: 390, height: 844 });
        expect(await pages[1].evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await expect(pages[1].getByRole('button', { name: 'Enviar', exact: true })).toBeVisible();
        await pages[1].screenshot({ path: testInfo.outputPath('voxa-chat-mobile.png'), fullPage: true });
        await pages[1].setViewportSize({ width: 1280, height: 900 });
        const literal = '<img src=x onerror="window.chatXss=true">';
        await pages[0].locator('#message').fill(literal);
        await pages[0].getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(pages[1].getByTestId('message-body').filter({ hasText: literal })).toHaveCount(1);
        expect(await pages[1].evaluate(() => window.chatXss)).toBeUndefined();
        await pages[1].waitForTimeout(2500);
        expect(historyRequests.map(requests => requests.length)).toEqual(requestCounts);
        expect(navigationCounts).toEqual([0, 0]);
        expect(handshakes).toContain(101);
        expect(frames[1].some(frame => frame.event === 'message.sent' && JSON.parse(frame.data).message.body === hello)).toBeTruthy();
        expect(frames[0].some(frame => frame.event === 'message.sent' && JSON.parse(frame.data).message.body === reply)).toBeTruthy();

        // O refresh é intencional apenas para verificar persistência.
        await pages[1].reload();
        await expect(pages[1].getByTestId('connection-status')).toHaveText('WebSocket conectado');
        await pages[1].getByRole('button', { name: accounts[0].name, exact: false }).last().click();
        await expect(pages[1].getByTestId('message-body').filter({ hasText: hello })).toHaveCount(1);

        // Mensagem enviada enquanto Bruno está desconectado aparece após reconectar.
        await pages[1].evaluate(() => window.Echo.disconnect());
        await expect(pages[1].getByTestId('connection-status')).toContainText('Sem conexão');
        const missed = `Mensagem durante desconexão ${suffix}`;
        await pages[0].locator('#message').fill(missed);
        await pages[0].getByRole('button', { name: 'Enviar', exact: true }).click();
        await expect(pages[0].getByTestId('message-body').filter({ hasText: missed })).toHaveCount(1);
        await expect(pages[1].getByTestId('message-body').filter({ hasText: missed })).toHaveCount(0);
        await pages[1].evaluate(() => window.Echo.connector.pusher.connect());
        await expect(pages[1].getByTestId('connection-status')).toHaveText('WebSocket conectado');
        await expect(pages[1].getByTestId('message-body').filter({ hasText: missed })).toHaveCount(1);
        expect(pageErrors).toEqual([]);

        await testInfo.attach('websocket-evidence.json', {
            body: JSON.stringify({ handshakes, messageFrames: frames.map(items => items.filter(frame => frame.event === 'message.sent')), requestCounts, noPolling: true, noReloadDuringExchange: true, reconnectRecoveredHistory: true }, null, 2),
            contentType: 'application/json',
        });
    } finally {
        for (const [index, page] of pages.entries()) {
            try {
                const token = await page.locator('meta[name="csrf-token"]').getAttribute('content');
                await contexts[index].request.delete('/profile', {
                    headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                    data: { password },
                });
            } catch { /* preserva a falha original do teste */ }
            await contexts[index].close();
        }
    }
});

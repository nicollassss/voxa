import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

// Executa o módulo real; somente HTTP, WebSocket e referências ao DOM são simulados.
const source = await readFile(new URL('../../resources/js/chat.js', import.meta.url), 'utf8');
const message = id => ({ id: String(id).padStart(4, '0'), created_at: '2026-09-09T00:00:00.000Z' });
const page = (first, last, cursor = null) => ({
    data: { messages: Array.from({ length: last - first + 1 }, (_, i) => message(first + i)), next_cursor: cursor },
});
const ids = component => Array.from(component.messages, item => item.id);

async function setup() {
    const requests = [];
    let respond = async () => page(1, 1);
    let subscribed;
    let stateChanged;
    const context = vm.createContext({ window: {}, console });
    const channel = {
        listen() { return this; },
        subscribed(callback) { subscribed = callback; return this; },
        error() { return this; },
    };
    const axios = new vm.SyntheticModule(['default'], function () {
        this.setExport('default', { get: async (url, options) => {
            if (url.endsWith('/users')) return { data: { users: [] } };
            requests.push({ url, cursor: options.params.cursor ?? null });
            return respond(url, options);
        } });
    }, { context });
    const echo = new vm.SyntheticModule(['createEcho'], function () {
        this.setExport('createEcho', () => ({
            connector: { pusher: { connection: { bind(_, callback) { stateChanged = callback; } } } },
            private: () => channel,
        }));
    }, { context });
    const module = new vm.SourceTextModule(source, { context });
    await module.link(specifier => specifier === 'axios' ? axios : echo);
    await module.evaluate();
    const component = module.namespace.default();
    component.$el = { dataset: { user: '{"id":1}', baseUrl: '/chat', websocket: '{}' } };
    component.$refs = { messages: { scrollHeight: 100, scrollTop: 0 }, composer: { focus() {} } };
    component.$nextTick = callback => callback();
    component.init();
    subscribed();
    component.selected = { id: 2 };
    return {
        component, requests,
        respondWith(callback) { respond = callback; },
        async reconnect() {
            stateChanged({ current: 'disconnected' });
            stateChanged({ current: 'connected' });
            subscribed();
            while (component.loading) await new Promise(resolve => setImmediate(resolve));
        },
    };
}

test('clicar novamente na conversa repete o histórico sem apagar o rascunho', async () => {
    const { component, requests, respondWith } = await setup();
    respondWith(async () => { throw new Error('offline'); });
    await component.loadHistory();
    assert.match(component.historyError, /Tente novamente/);
    component.draft = 'Rascunho preservado';
    respondWith(async () => page(1, 1));
    await component.selectUser({ id: 2 });
    assert.equal(requests.length, 2);
    assert.deepEqual(ids(component), ['0001']);
    assert.equal(component.historyError, '');
    assert.equal(component.draft, 'Rascunho preservado');
});

test('a ação de tentar novamente repete a página antiga que falhou', async () => {
    const { component, requests, respondWith } = await setup();
    respondWith(async () => page(51, 100, 'before-51'));
    await component.loadHistory();
    respondWith(async () => { throw new Error('offline'); });
    await component.loadHistory(true);
    respondWith(async () => page(1, 50));
    await component.retryHistory();
    assert.equal(requests.at(-1).cursor, 'before-51');
    assert.equal(component.messages.length, 100);
    assert.equal(component.nextCursor, null);
    assert.equal(component.historyError, '');
});

test('reconexão recupera 120 mensagens em várias páginas, sem duplicatas', async () => {
    const state = await setup();
    await state.component.loadHistory();
    state.respondWith(async (_, { params }) => {
        if (!params.cursor) return page(72, 121, 'before-72');
        if (params.cursor === 'before-72') return page(22, 71, 'before-22');
        return page(1, 21);
    });
    await state.reconnect();
    assert.deepEqual(ids(state.component), Array.from({ length: 121 }, (_, i) => message(i + 1).id));
    assert.equal(state.requests.length, 4);
    assert.equal(state.component.nextCursor, null);
});

test('reconexão mantém o cursor das mensagens antigas já carregadas', async () => {
    const state = await setup();
    state.respondWith(async () => page(151, 200, 'before-151'));
    await state.component.loadHistory();
    state.respondWith(async () => page(101, 150, 'before-101'));
    await state.component.loadHistory(true);
    state.respondWith(async (_, { params }) => params.cursor
        ? page(161, 210, 'before-161') : page(211, 260, 'before-211'));
    await state.reconnect();
    assert.equal(state.component.nextCursor, 'before-101');
    assert.deepEqual(ids(state.component), Array.from({ length: 160 }, (_, i) => message(i + 101).id));
});

test('conversa inicialmente vazia recupera o intervalo após mensagens ao vivo', async () => {
    const state = await setup();
    state.respondWith(async () => ({ data: { messages: [], next_cursor: null } }));
    await state.component.loadHistory();
    state.component.receive({ ...message(1), from_id: 2, sender: { id: 2 } });
    state.respondWith(async (_, { params }) => params.cursor ? page(1, 11) : page(12, 61, 'before-12'));
    await state.reconnect();
    assert.deepEqual(ids(state.component), Array.from({ length: 61 }, (_, i) => message(i + 1).id));
});

test('falha intermediária permite recuperar todo o intervalo na nova tentativa', async () => {
    const state = await setup();
    await state.component.loadHistory();
    state.respondWith(async (_, { params }) => {
        if (params.cursor) throw new Error('offline');
        return page(12, 61, 'before-12');
    });
    await state.reconnect();
    assert.ok(state.component.historyError);
    assert.deepEqual(ids(state.component), ['0001']);
    state.respondWith(async (_, { params }) => params.cursor ? page(1, 11) : page(12, 61, 'before-12'));
    await state.component.retryHistory();
    assert.equal(state.component.messages.length, 61);
    assert.equal(state.component.historyError, '');
});

test('mensagem ao vivo durante a recuperação não encerra a busca antes do intervalo', async () => {
    const state = await setup();
    await state.component.loadHistory();
    state.respondWith(async (_, { params }) => {
        if (params.cursor) return page(1, 11);
        state.component.receive({ ...message(61), from_id: 2, sender: { id: 2 } });
        return page(12, 61, 'before-12');
    });
    await state.reconnect();
    assert.equal(state.component.messages.length, 61);
    assert.equal(new Set(ids(state.component)).size, 61);
});

test('resposta atrasada da reconexão não aparece em outra conversa', async () => {
    const state = await setup();
    await state.component.loadHistory();
    let finishOldRequest;
    state.respondWith(() => new Promise(resolve => { finishOldRequest = resolve; }));
    const recovery = state.component.loadHistory();
    state.respondWith(async () => page(500, 500));
    state.component.selectUser({ id: 3 });
    await new Promise(resolve => setImmediate(resolve));
    finishOldRequest(page(12, 61, 'before-12'));
    await recovery;
    assert.deepEqual(ids(state.component), ['0500']);
    assert.equal(state.component.selected.id, 3);
    assert.equal(state.component.loading, false);
});

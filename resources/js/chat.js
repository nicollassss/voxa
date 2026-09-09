import axios from 'axios';
import { createEcho } from './echo';

export default function chat() {
    let echo;
    let requestVersion = 0;
    let pendingAttempt;
    let historyAnchor = null;
    let historyRetryOlder = false;
    const receivedIds = new Set();

    return {
        me: {}, users: [], selected: null, messages: [], unread: {},
        draft: '', error: '', historyError: '', status: 'connecting', nextCursor: null,
        loading: false, loadingUsers: false, sending: false, baseUrl: '',

        get statusLabel() {
            return {
                online: 'WebSocket conectado',
                connecting: 'Conectando ao chat…',
                offline: 'Sem conexão · tentando reconectar…',
                error: 'Não foi possível conectar ao chat',
            }[this.status];
        },

        init() {
            this.me = JSON.parse(this.$el.dataset.user);
            this.baseUrl = this.$el.dataset.baseUrl;
            this.loadUsers();

            try {
                echo = createEcho(JSON.parse(this.$el.dataset.websocket));
                window.Echo = echo;
                echo.connector.pusher.connection.bind('state_change', ({ current }) => {
                    if (this.status === 'online' && !this.loading && !this.historyError) {
                        historyAnchor = this.messages.at(-1)?.id ?? historyAnchor;
                    }
                    this.status = ['connecting', 'connected'].includes(current) ? 'connecting' : 'offline';
                });
                echo.private(`chatify.${this.me.id}`)
                    .listen('.message.sent', ({ message }) => this.receive(message))
                    .subscribed(() => {
                        this.status = 'online';
                        if (this.selected) this.loadHistory();
                    })
                    .error(() => {
                        this.status = 'error';
                        this.error = 'A autorização do chat falhou. Entre novamente na sua conta.';
                    });
            } catch {
                this.status = 'error';
                this.error = 'A configuração da conexão está indisponível.';
            }
        },

        destroy() {
            requestVersion++;
            echo?.disconnect();
            if (window.Echo === echo) delete window.Echo;
        },

        async loadUsers() {
            this.loadingUsers = true;
            try {
                const { data } = await axios.get(`${this.baseUrl}/users`);
                this.users = data.users;
            } catch (error) {
                this.error = this.explainError(error, 'Não foi possível carregar os usuários.');
            } finally {
                this.loadingUsers = false;
            }
        },

        selectUser(user) {
            if (this.sending) return;
            if (this.selected?.id === user.id) {
                if (this.historyError && !this.loading) return this.retryHistory();
                return;
            }
            if (this.draft.trim() && !window.confirm('Descartar a mensagem que você está escrevendo?')) return;
            this.selected = user;
            this.messages = [];
            this.draft = '';
            this.error = '';
            this.historyError = '';
            historyAnchor = null;
            this.nextCursor = null;
            this.unread[user.id] = 0;
            pendingAttempt = null;
            this.loadHistory();
            this.$nextTick(() => this.$refs.composer.focus());
        },

        retryHistory() {
            if (!this.loading) return this.loadHistory(historyRetryOlder);
        },

        async loadHistory(older = false) {
            if (!this.selected) return;
            const version = ++requestVersion;
            const userId = this.selected.id;
            const oldHeight = this.$refs.messages.scrollHeight;
            const oldTop = this.$refs.messages.scrollTop;
            const anchor = older ? null : historyAnchor;
            let cursor = older ? this.nextCursor : null;
            let reachedAnchor = false;
            let newestId = null;
            const incoming = [];
            this.loading = true;
            this.historyError = '';
            historyRetryOlder = older;
            try {
                do {
                    const { data } = await axios.get(`${this.baseUrl}/${userId}/messages`, {
                        params: cursor ? { cursor } : {},
                    });
                    if (version !== requestVersion) return;
                    newestId ??= data.messages.at(-1)?.id;
                    incoming.push(...data.messages);
                    reachedAnchor = anchor !== null && data.messages.some(message => message.id === anchor);
                    cursor = data.next_cursor;
                } while (!older && anchor !== null && !reachedAnchor && cursor);

                this.merge(incoming);
                if (older || !reachedAnchor) this.nextCursor = cursor;
                if (!older) historyAnchor = newestId ?? historyAnchor;
                this.$nextTick(() => {
                    this.$refs.messages.scrollTop = older
                        ? oldTop + this.$refs.messages.scrollHeight - oldHeight
                        : this.$refs.messages.scrollHeight;
                });
            } catch (error) {
                if (version === requestVersion) this.historyError = this.explainError(error, 'Não foi possível carregar o histórico. Tente novamente.');
            } finally {
                if (version === requestVersion) this.loading = false;
            }
        },

        merge(incoming, animate = false) {
            const byId = new Map(this.messages.map(message => [message.id, message]));
            for (const message of incoming) {
                byId.set(message.id, { ...message, animate: animate && !byId.has(message.id) });
            }
            this.messages = [...byId.values()].sort((a, b) =>
                a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
        },

        receive(message) {
            const other = message.from_id === this.me.id ? message.recipient : message.sender;
            const contact = this.users.find(user => user.id === other.id);
            if (contact) Object.assign(contact, other);
            else this.users.push(other);
            if (this.selected?.id === other.id) {
                const nearBottom = this.$refs.messages.scrollHeight - this.$refs.messages.scrollTop - this.$refs.messages.clientHeight < 100;
                this.merge([message], true);
                if (nearBottom) this.scrollToBottom();
            } else if (message.from_id !== this.me.id && !receivedIds.has(message.id)) {
                this.unread[other.id] = (this.unread[other.id] || 0) + 1;
            }
            receivedIds.add(message.id);
        },

        async sendMessage() {
            const body = this.draft.trim();
            if (!body || !this.selected || this.sending || this.status !== 'online') return;
            const toId = this.selected.id;
            if (!pendingAttempt || pendingAttempt.body !== body || pendingAttempt.to_id !== toId) {
                pendingAttempt = { client_id: crypto.randomUUID(), body, to_id: toId };
            }
            this.sending = true;
            this.error = '';
            try {
                const { data } = await axios.post(`${this.baseUrl}/messages`, pendingAttempt, {
                    headers: { 'X-Socket-ID': echo.socketId() },
                });
                this.merge([data.message], true);
                this.draft = '';
                pendingAttempt = null;
                this.scrollToBottom();
            } catch (error) {
                if (error.response?.status === 503 && error.response.data.message?.id) {
                    this.merge([error.response.data.message], true);
                }
                this.error = this.explainError(error, 'Não foi possível enviar. Tente novamente.');
            } finally {
                this.sending = false;
                this.$nextTick(() => this.$refs.composer.focus());
            }
        },

        explainError(error, fallback) {
            if ([401, 419].includes(error.response?.status)) return 'Sua sessão expirou. Entre novamente na sua conta.';
            if (error.response?.status === 429) return 'Muitas mensagens em pouco tempo. Aguarde um minuto.';
            return error.response?.data.error || Object.values(error.response?.data.errors || {}).flat()[0] || fallback;
        },

        scrollToBottom() {
            this.$nextTick(() => { this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight; });
        },

        formatTime(value) {
            return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
        },
    };
}

<x-app-layout>

    <section x-data="chat" data-user="{{ json_encode($chatUser) }}" data-websocket="{{ json_encode($websocket) }}"
        data-base-url="{{ route('chat.index') }}" class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p class="text-muted">Conectado como <strong class="text-ink">{{ $chatUser['name'] }}</strong></p>
            <span role="status" data-testid="connection-status" class="rounded-full px-3 py-1 font-medium"
                :class="status === 'online' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-200'"
                x-text="statusLabel">Conectando…</span>
        </div>

        <div class="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:grid-cols-[260px_1fr]">
            <aside class="border-b border-line bg-raised md:border-b-0 md:border-r">
                <div class="flex items-center justify-between border-b border-line p-4">
                    <h2 class="font-semibold text-ink">Conversas</h2>
                    <button type="button" @click="loadUsers()" :disabled="loadingUsers" class="text-xs font-medium text-accent hover:underline disabled:opacity-50">Atualizar usuários</button>
                </div>
                <div class="max-h-48 overflow-y-auto p-2 md:max-h-[580px]">
                    <p x-show="users.length === 0" class="p-3 text-sm text-subtle">Cadastre outro usuário em uma janela anônima e atualize esta lista.</p>
                    <template x-for="user in users" :key="user.id">
                        <button type="button" @click="selectUser(user)" :aria-pressed="selected?.id === user.id"
                            class="conversation-button mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left"
                            :class="selected?.id === user.id ? 'bg-brand/25 text-ink' : 'text-muted'">
                            <img :src="user.avatar_url" alt="" class="h-9 w-9 shrink-0 rounded-full border border-line bg-raised object-cover"
                                x-on:error.once="$el.src = '{{ asset('images/avatar-default.svg') }}'">
                            <span class="min-w-0 flex-1 truncate font-medium" x-text="user.name"></span>
                            <span x-show="unread[user.id]" class="rounded-full bg-brand px-2 text-xs text-white" x-text="unread[user.id]"></span>
                        </button>
                    </template>
                </div>
            </aside>

            <div class="flex min-w-0 flex-col">
                <div class="border-b border-line px-5 py-4">
                    <h2 class="font-semibold text-ink" x-text="selected ? selected.name : 'Suas mensagens'"></h2>
                    <p class="text-xs text-subtle" x-text="selected ? 'Conversa privada · histórico salvo' : 'Selecione alguém para começar'"></p>
                </div>
                <div x-ref="messages" role="log" aria-label="Mensagens da conversa" aria-live="polite"
                    class="h-[48vh] min-h-64 overflow-y-auto bg-raised/50 px-4 py-5 sm:px-6">
                    <div x-show="nextCursor" class="mb-4 text-center">
                        <button type="button" @click="loadHistory(true)" :disabled="loading" class="text-sm font-medium text-accent hover:underline disabled:opacity-50">Carregar mensagens anteriores</button>
                    </div>
                    <p x-show="loading" class="mb-3 text-center text-sm text-subtle">Carregando histórico…</p>
                    <div x-cloak x-show="historyError" class="mb-3 rounded-lg bg-red-950 p-3 text-sm text-red-200">
                        <p role="alert" x-text="historyError"></p>
                        <button type="button" @click="retryHistory()" :disabled="loading"
                            class="mt-2 font-medium underline disabled:opacity-50">Tentar novamente</button>
                    </div>
                    <div x-show="messages.length === 0 && !loading && !historyError" class="flex h-full items-center justify-center text-center text-sm text-subtle">
                        <p x-text="selected ? 'A conversa começa com um olá. Envie sua primeira mensagem.' : 'Escolha uma pessoa na lista de conversas.'"></p>
                    </div>
                    <template x-for="message in messages" :key="message.id">
                        <article :data-message-id="message.id" class="mb-4 flex items-end gap-2"
                            :class="{ 'flex-row-reverse': message.from_id === me.id, 'flex-row': message.from_id !== me.id, 'message-enter': message.animate }"
                            @animationend.self="message.animate = false">
                            <img :src="message.sender.avatar_url" :alt="'Foto de ' + message.sender.name" data-testid="message-avatar"
                                class="h-8 w-8 shrink-0 rounded-full border border-line bg-raised object-cover"
                                x-on:error.once="$el.src = '{{ asset('images/avatar-default.svg') }}'">
                            <div class="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%]"
                                :class="message.from_id === me.id ? 'bg-brand text-white rounded-br-sm' : 'bg-surface border border-line text-ink rounded-bl-sm'">
                                <p class="mb-1 text-xs font-semibold opacity-80" x-text="message.from_id === me.id ? 'Você' : message.sender.name"></p>
                                <p class="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]" data-testid="message-body" x-text="message.body"></p>
                                <time class="mt-2 block text-right text-[12px] opacity-90" :datetime="message.created_at" x-text="formatTime(message.created_at)"></time>
                            </div>
                        </article>
                    </template>
                </div>

                <form @submit.prevent="sendMessage()" class="border-t border-line p-4">
                    <p x-cloak x-show="error" role="alert" class="mb-3 rounded-lg bg-red-950 p-3 text-sm text-red-200" x-text="error"></p>
                    <label for="message" class="sr-only">Sua mensagem</label>
                    <div class="flex items-end gap-3">
                        <textarea id="message" x-ref="composer" x-model="draft" :disabled="!selected || sending"
                            @keydown.enter="if (!$event.shiftKey && !$event.isComposing) { $event.preventDefault(); sendMessage(); }"
                            rows="2" maxlength="5000" placeholder="Escreva uma mensagem…"
                            class="min-w-0 flex-1 resize-none rounded-xl border-line text-sm focus:border-accent focus:ring-accent disabled:bg-raised"></textarea>
                        <button type="submit" :disabled="!selected || !draft.trim() || sending || status !== 'online'"
                            class="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
                            x-text="sending ? 'Enviando…' : 'Enviar'">Enviar</button>
                    </div>
                    <p class="mt-2 text-xs text-subtle">Enter para enviar · Shift + Enter para uma nova linha · <span x-text="draft.length">0</span>/5000</p>
                </form>
            </div>
        </div>
    </section>
</x-app-layout>

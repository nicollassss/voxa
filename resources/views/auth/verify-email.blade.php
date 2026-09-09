<x-guest-layout>
    <div class="mb-4 text-sm text-muted">
        {{ __('Obrigado por se cadastrar! Antes de começar, você pode verificar seu endereço de email clicando no link que enviamos para você? Se você não recebeu o email, podemos enviar outro.') }}
    </div>

    @if (session('status') == 'verification-link-sent')
        <div class="mb-4 font-medium text-sm text-emerald-300">
            {{ __('Um novo link de verificação foi enviado para o endereço de email que você forneceu durante o cadastro.') }}
        </div>
    @endif

    <div class="mt-4 flex items-center justify-between">
        <form method="POST" action="{{ route('verification.send') }}">
            @csrf

            <div>
                <x-primary-button>
                    {{ __('Reenviar Email de Verificação') }}
                </x-primary-button>
            </div>
        </form>

        <form method="POST" action="{{ route('logout') }}">
            @csrf

            <button type="submit" class="underline text-sm text-muted hover:text-ink rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">
                {{ __('Sair') }}
            </button>
        </form>
    </div>
</x-guest-layout>

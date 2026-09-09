<section>
    <header>
        <h2 class="text-lg font-medium text-ink">
            {{ __('Informações do Perfil') }}
        </h2>

        <p class="mt-1 text-sm text-muted">
            {{ __("Atualize as informações do seu perfil e endereço de email.") }}
        </p>
    </header>

    <form id="send-verification" method="post" action="{{ route('verification.send') }}">
        @csrf
    </form>

    <form method="post" action="{{ route('profile.update') }}" enctype="multipart/form-data" class="mt-6 space-y-6">
        @csrf
        @method('patch')

        <div>
            <x-input-label for="avatar" value="Foto de perfil" />
            <div class="mt-3 flex flex-wrap items-center gap-4">
                <img src="{{ $user->avatar_url }}" alt="Foto de {{ $user->name }}" data-testid="profile-avatar"
                    class="h-20 w-20 rounded-full border border-line bg-raised object-cover">
                <div class="min-w-0 flex-1 basis-48">
                    <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="avatar-help"
                        class="block w-full min-w-0 rounded-md text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-brand">
                    <p id="avatar-help" class="mt-2 text-xs text-subtle">JPG, PNG ou WebP. Até 2 MB e 2048 × 2048 pixels. Escolha uma foto e clique em Salvar.</p>
                </div>
            </div>
            <x-input-error class="mt-2" :messages="$errors->get('avatar')" />
        </div>

        <div>
            <x-input-label for="name" :value="__('Name')" />
            <x-text-input id="name" name="name" type="text" class="mt-1 block w-full" :value="old('name', $user->name)" required autofocus autocomplete="name" />
            <x-input-error class="mt-2" :messages="$errors->get('name')" />
        </div>

        <div>
            <x-input-label for="email" :value="__('Email')" />
            <x-text-input id="email" name="email" type="email" class="mt-1 block w-full" :value="old('email', $user->email)" required autocomplete="username" />
            <x-input-error class="mt-2" :messages="$errors->get('email')" />

            @if ($user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail && ! $user->hasVerifiedEmail())
                <div>
                    <p class="text-sm mt-2 text-ink">
                        {{ __('Seu endereço de email não está verificado.') }}

                        <button form="send-verification" class="underline text-sm text-muted hover:text-ink rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent">
                            {{ __('Clique aqui para reenviar o email de verificação.') }}
                        </button>
                    </p>

                    @if (session('status') === 'verification-link-sent')
                        <p class="mt-2 font-medium text-sm text-emerald-300">
                            {{ __('Um novo link de verificação foi enviado para o seu endereço de email.') }}
                        </p>
                    @endif
                </div>
            @endif
        </div>

        <div class="flex items-center gap-4">
            <x-primary-button>{{ __('Save') }}</x-primary-button>

            @if (session('status') === 'profile-updated')
                <p
                    x-data="{ show: true }"
                    x-show="show"
                    x-transition
                    x-init="setTimeout(() => show = false, 2000)"
                    class="text-sm text-muted"
                >{{ __('Saved.') }}</p>
            @endif
        </div>
    </form>
</section>

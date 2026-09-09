# Voxa

Aplicação web de conversas privadas em tempo real. O projeto oferece cadastro, autenticação, perfil com foto, lista de usuários, histórico persistente e troca de mensagens por WebSocket.

## Visão geral

- **Backend:** PHP 8.2+, Laravel 12, Laravel Breeze e Chatify 1.6.3.
- **Tempo real:** Laravel Broadcasting + Echo + Reverb local ou Pusher Channels.
- **Frontend:** Blade, Alpine.js, Tailwind CSS e Vite.
- **Banco padrão:** MySQL, configurado no ambiente de desenvolvimento para `127.0.0.1:3307`.
- **Testes:** PHPUnit/Laravel Test e Playwright com duas sessões reais do Chrome.

O fluxo de uma mensagem é: o navegador envia um POST autenticado ao Laravel; a mensagem é validada e gravada em `ch_messages`; o evento `message.sent` é transmitido aos canais privados dos participantes; o Echo atualiza a conversa sem recarregar a página.

## Requisitos

Instale os seguintes programas antes de começar:

- PHP 8.2 ou superior, com as extensões exigidas pelo Laravel e pelo driver MySQL;
- Composer;
- Node.js e npm;
- MySQL 8.0+ ou 9.x;
- Chrome instalado, apenas para o teste E2E.

As versões usadas na validação desta cópia foram PHP 8.4.14, Composer 2.8.12, Node.js 22.19.0, npm 10.9.3 e MySQL 9.5.0. As versões exatas das dependências ficam registradas em `composer.lock` e `package-lock.json`.

## Instalação

No PowerShell, a partir da pasta do projeto:

```powershell
cd C:\dev\chatbot
composer install
npm ci
Copy-Item .env.example .env
php artisan key:generate
php artisan storage:link
```

O comando `storage:link` disponibiliza as fotos de perfil armazenadas em `storage/app/public` por meio de `public/storage`.

### Configurar o ambiente

O arquivo `.env.example` já contém uma configuração local funcional para MySQL e Reverb:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=chatweb3ams
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_CONNECTION=reverb
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
```

Altere `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD` quando usar um MySQL próprio. Nesse caso, crie o banco manualmente e não execute os scripts de instância local descritos abaixo.

## Banco de dados

### Opção A: MySQL local incluído no projeto (Windows)

O script abaixo inicia uma instância isolada em `.local/mysql`, limitada a `127.0.0.1:3307`. Ele não altera nem reinicia outro serviço MySQL da máquina.

Na primeira execução:

```powershell
cd C:\dev\chatbot
.\scripts\mysql.ps1 -Initialize
```

Nas execuções seguintes:

```powershell
.\scripts\mysql.ps1
```

Por padrão, o script procura o servidor em `C:\Program Files\MySQL\MySQL Server 9.5`. Para outra instalação:

```powershell
.\scripts\mysql.ps1 -MySqlDirectory 'C:\caminho\para\MySQL Server 9.5'
```

Em outro terminal, crie o banco e aplique as migrations:

```powershell
php scripts/create-database.php
php artisan migrate
```

### Opção B: servidor MySQL existente

Crie o banco configurado no `.env` e execute:

```powershell
php artisan migrate
```

Não use `scripts/mysql.ps1` nem `scripts/create-database.php` nessa opção: eles usam exclusivamente `127.0.0.1:3307`, usuário `root` e senha vazia.

Para criar o usuário de demonstração do seeder, opcionalmente execute:

```powershell
php artisan db:seed
```

Isso cria `Test User` com o e-mail `test@example.com`. Para uma base limpa em desenvolvimento, use `php artisan migrate:fresh --seed` com cuidado, pois o comando apaga as tabelas existentes.

## Executar em desenvolvimento

Com o banco em execução, o comando recomendado inicia Laravel, Reverb e Vite juntos:

```powershell
composer run dev
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000).

O comando inicia:

| Serviço | Endereço | Função |
| --- | --- | --- |
| Laravel | `127.0.0.1:8000` | Aplicação HTTP e API do chat |
| Reverb | `127.0.0.1:8080` | Servidor WebSocket |
| Vite | porta exibida no terminal | Assets frontend em modo desenvolvimento |

Para iniciar os serviços separadamente:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
php artisan reverb:start --host=127.0.0.1 --port=8080 --debug
npm run dev
```

Para gerar os assets de produção:

```powershell
npm run build
```

Depois do build, mantenha Laravel, Reverb e MySQL em execução e não inicie `npm run dev`.

## Usar a aplicação

1. Acesse a aplicação e crie o usuário A.
2. Abra uma janela anônima ou outro navegador e crie o usuário B.
3. Em cada sessão, atualize a lista de usuários e selecione o outro participante.
4. Confirme o estado **WebSocket conectado**.
5. Envie mensagens nos dois sentidos. Elas devem aparecer sem recarregar a página.
6. Recarregue uma sessão e selecione novamente a conversa para verificar o histórico persistido.

As conversas são privadas entre pares de usuários. Não há sala de grupo nesta implementação.

### Verificar o WebSocket

No DevTools do navegador, abra **Network/Rede > WS**. No modo Reverb, a conexão usa `ws://127.0.0.1:8080/app/` e deve retornar `101 Switching Protocols`.

Os eventos esperados são:

- `pusher:connection_established`;
- `pusher_internal:subscription_succeeded`;
- `message.sent` ao receber uma nova mensagem.

O histórico é consultado apenas ao abrir uma conversa, carregar mensagens antigas ou recuperar uma conversa após reconexão. O envio em tempo real não usa polling.

## Usar Pusher Channels

Reverb local é o modo padrão e não exige conta externa. Para usar Pusher Channels, crie uma aplicação própria e substitua no `.env`:

```dotenv
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=seu_app_id
PUSHER_APP_KEY=sua_chave
PUSHER_APP_SECRET=seu_segredo
PUSHER_APP_CLUSTER=us2
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
```

Depois, limpe a configuração e reinicie o Laravel e o Vite:

```powershell
php artisan config:clear
php artisan serve --host=127.0.0.1 --port=8000
npm run dev
```

Nesse modo, não inicie `php artisan reverb:start`. As credenciais devem ser próprias; nunca publique o arquivo `.env`.

## Testes e validações

Os testes PHP usam SQLite em memória e não alteram o MySQL de desenvolvimento:

```powershell
php artisan test --compact
```

Validações adicionais do projeto:

```powershell
composer validate --no-check-publish
composer check-platform-reqs
npm run build
```

O teste E2E precisa do MySQL, Laravel e Reverb em execução:

```powershell
npm run test:e2e
npx playwright show-report
```

O Playwright está configurado para usar o Chrome instalado, a URL `http://127.0.0.1:8000` e uma única execução por vez. O cenário cobre cadastro, login, upload de avatar, WebSocket, mensagens nos dois sentidos, persistência, reconexão e proteção contra HTML executável.

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `app/Http/Controllers/ChatController.php` | Interface, usuários, histórico e envio de mensagens |
| `app/Events/MessageSent.php` | Evento broadcast nos canais privados |
| `app/Models/ChMessage.php` | Modelo das mensagens do Chatify |
| `app/Models/User.php` | Usuário, autenticação e avatar |
| `routes/chatify/web.php` | Rotas do chat sob `/chat` |
| `routes/channels.php` | Autorização dos canais privados |
| `resources/js/echo.js` e `chat.js` | Conexão WebSocket e atualização da interface |
| `resources/views/chat/index.blade.php` | Tela principal do chat |
| `database/migrations/` | Usuários, sessões, mensagens, favoritos e avatares |
| `scripts/mysql.ps1` | Instância MySQL local para Windows |
| `scripts/create-database.php` | Criação do banco local `chatweb3ams` |
| `tests/Feature/` | Testes de autenticação, perfil, avatar e chat |
| `tests/Browser/chat.spec.js` | Teste de ponta a ponta com dois navegadores |

## Solução de problemas

**A aplicação não conecta ao banco**

Confirme que o MySQL está em execução e que `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD` correspondem ao servidor usado. Depois execute `php artisan config:clear`.

**O estado do WebSocket fica desconectado**

Confirme que o Reverb está ativo na porta `8080`, que `BROADCAST_CONNECTION=reverb` e que `REVERB_HOST`, `REVERB_PORT` e `REVERB_SCHEME` correspondem ao frontend. Reinicie Laravel após alterar o `.env`.

**As fotos de perfil retornam 404**

Execute `php artisan storage:link` e confirme que o arquivo está em `storage/app/public/users-avatar`.

**O teste E2E não inicia**

Inicie banco, Laravel e Reverb antes de rodar `npm run test:e2e` e confirme que o Chrome está instalado. Para usar o Chromium gerenciado pelo Playwright, ajuste `playwright.config.js`.

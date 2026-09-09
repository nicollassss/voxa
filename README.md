# Voxa

Voxa é uma aplicação web de mensagens privadas em tempo real, desenvolvida com Laravel.

A plataforma permite criar uma conta, personalizar o perfil, encontrar outros usuários e trocar mensagens instantaneamente por WebSocket, mantendo o histórico das conversas persistido no banco de dados.

## Principais recursos

* Cadastro e autenticação de usuários
* Perfil com foto
* Listagem de usuários
* Conversas privadas entre dois usuários
* Mensagens em tempo real via WebSocket
* Histórico persistente de mensagens
* Reconexão com recuperação da conversa
* Proteção contra execução de HTML enviado em mensagens
* Testes automatizados de backend
* Testes End-to-End com duas sessões independentes

---

## Tecnologias

| Camada                | Tecnologias                           |
| --------------------- | ------------------------------------- |
| Backend               | PHP 8.2+, Laravel 12                  |
| Autenticação          | Laravel Breeze                        |
| Chat                  | Chatify 1.6.3                         |
| Tempo real            | Laravel Broadcasting, Echo e Reverb   |
| Alternativa WebSocket | Pusher Channels                       |
| Frontend              | Blade, Alpine.js, Tailwind CSS e Vite |
| Banco de dados        | MySQL                                 |
| Testes                | PHPUnit, Laravel Test e Playwright    |

---

## Arquitetura

O envio de uma mensagem segue, de forma simplificada, este fluxo:

```text
Navegador
    ↓
POST autenticado
    ↓
Laravel
    ↓
Validação da mensagem
    ↓
Banco de dados (ch_messages)
    ↓
Evento MessageSent
    ↓
Laravel Broadcasting
    ↓
Reverb / Pusher
    ↓
Laravel Echo
    ↓
Interface atualizada em tempo real
```

Quando uma mensagem é enviada, o navegador realiza uma requisição autenticada ao Laravel.

O backend valida os dados, registra a mensagem na tabela `ch_messages` e dispara o evento `message.sent`.

Esse evento é transmitido através de um canal privado para os participantes da conversa. O Laravel Echo recebe o evento no navegador e atualiza a interface sem necessidade de recarregar a página.

O histórico armazenado no banco é consultado ao abrir uma conversa, carregar mensagens anteriores ou recuperar a interface após uma reconexão.

O envio em tempo real não utiliza polling.

---

## Requisitos

Antes de iniciar o projeto, instale:

* PHP 8.2 ou superior
* Composer
* Node.js
* npm
* MySQL 8.0 ou superior
* Google Chrome, caso queira executar os testes E2E

As versões exatas das dependências PHP e JavaScript utilizadas no projeto ficam registradas em:

```text
composer.lock
package-lock.json
```

<details>
<summary>Ambiente utilizado durante o desenvolvimento</summary>

* PHP 8.4.14
* Composer 2.8.12
* Node.js 22.19.0
* npm 10.9.3
* MySQL 9.5.0

</details>

---

## Instalação

Clone o repositório:

```powershell
git clone <https://github.com/nicollassss/voxa>
cd voxa
```

Instale as dependências:

```powershell
composer install
npm ci
```

Crie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

Gere a chave da aplicação:

```powershell
php artisan key:generate
```

Crie o link público para os arquivos armazenados:

```powershell
php artisan storage:link
```

O comando `storage:link` disponibiliza arquivos armazenados em:

```text
storage/app/public
```

através de:

```text
public/storage
```

Isso é utilizado, entre outras coisas, para as fotos de perfil dos usuários.

---

## Configuração do ambiente

O projeto pode utilizar MySQL e Laravel Reverb localmente.

Exemplo de configuração no `.env`:

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

Caso utilize outro servidor MySQL, altere:

```dotenv
DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
```

de acordo com o seu ambiente.

---

## Banco de dados

### Opção 1 — MySQL existente

Caso já tenha um servidor MySQL instalado e configurado, crie o banco informado no `.env` e execute:

```powershell
php artisan migrate
```

Opcionalmente, para criar os dados definidos nos seeders:

```powershell
php artisan db:seed
```

O seeder padrão cria o seguinte usuário de demonstração:

```text
Nome: Test User
E-mail: test@example.com
```

Durante o desenvolvimento, também é possível recriar completamente o banco:

```powershell
php artisan migrate:fresh --seed
```

> Atenção: `migrate:fresh` remove todas as tabelas existentes antes de executar novamente as migrations.

---

### Opção 2 — MySQL local automatizado no Windows

O projeto inclui um script PowerShell capaz de iniciar uma instância MySQL isolada em:

```text
127.0.0.1:3307
```

Essa instância utiliza a pasta:

```text
.local/mysql
```

e não altera nem reinicia outros serviços MySQL instalados na máquina.

Na primeira execução:

```powershell
.\scripts\mysql.ps1 -Initialize
```

Nas próximas execuções:

```powershell
.\scripts\mysql.ps1
```

Por padrão, o script procura o MySQL em:

```text
C:\Program Files\MySQL\MySQL Server 9.5
```

Caso o servidor esteja instalado em outro diretório:

```powershell
.\scripts\mysql.ps1 -MySqlDirectory 'C:\caminho\para\MySQL Server 9.5'
```

Depois, em outro terminal:

```powershell
php scripts/create-database.php
php artisan migrate
```

Os scripts `mysql.ps1` e `create-database.php` foram desenvolvidos especificamente para o ambiente local utilizando:

```text
Host: 127.0.0.1
Porta: 3307
Usuário: root
Senha: vazia
```

Não utilize esses scripts caso esteja trabalhando com outro servidor MySQL.

---

## Executar em desenvolvimento

Com o banco de dados em execução, utilize:

```powershell
composer run dev
```

Esse comando inicia os principais serviços necessários para o ambiente de desenvolvimento.

| Serviço | Endereço                  | Responsabilidade         |
| ------- | ------------------------- | ------------------------ |
| Laravel | `127.0.0.1:8000`          | Aplicação HTTP e backend |
| Reverb  | `127.0.0.1:8080`          | Servidor WebSocket       |
| Vite    | Porta exibida no terminal | Assets do frontend       |

A aplicação estará disponível em:

```text
http://127.0.0.1:8000
```

---

## Executar os serviços separadamente

Laravel:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Reverb:

```powershell
php artisan reverb:start --host=127.0.0.1 --port=8080 --debug
```

Vite:

```powershell
npm run dev
```

---

## Build de produção

Para gerar os assets do frontend:

```powershell
npm run build
```

Depois do build, mantenha Laravel, Reverb e MySQL em execução.

Nesse caso, não é necessário iniciar:

```powershell
npm run dev
```

---

## Utilização

Para testar uma conversa em tempo real:

1. Acesse a aplicação e crie o usuário A.
2. Abra uma janela anônima ou outro navegador.
3. Crie o usuário B.
4. Em cada sessão, abra a lista de usuários.
5. Selecione o outro participante.
6. Verifique se o WebSocket está conectado.
7. Envie mensagens nos dois sentidos.
8. Confirme que as mensagens aparecem sem recarregar a página.
9. Recarregue uma das sessões.
10. Abra novamente a conversa e confirme que o histórico foi mantido.

Atualmente, o Voxa trabalha com conversas privadas entre dois usuários.

Chats em grupo ainda não fazem parte desta implementação.

---

## WebSocket

Para verificar manualmente a conexão em tempo real, abra as ferramentas de desenvolvedor do navegador:

```text
DevTools → Network/Rede → WS
```

Utilizando Laravel Reverb, a conexão normalmente será aberta em:

```text
ws://127.0.0.1:8080/app/
```

Uma conexão estabelecida corretamente deve retornar:

```text
101 Switching Protocols
```

Entre os eventos esperados estão:

```text
pusher:connection_established

pusher_internal:subscription_succeeded

message.sent
```

O evento `message.sent` é recebido quando uma nova mensagem é transmitida para o participante da conversa.

---

## Pusher Channels

Laravel Reverb é utilizado por padrão e não exige uma conta externa.

Também é possível utilizar o Pusher Channels.

Nesse caso, altere o `.env`:

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

Depois, limpe a configuração:

```powershell
php artisan config:clear
```

Reinicie o Laravel:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

E o frontend:

```powershell
npm run dev
```

Ao utilizar Pusher Channels, não é necessário iniciar:

```powershell
php artisan reverb:start
```

Nunca publique credenciais privadas ou o arquivo `.env` no repositório.

---

## Testes

O Voxa possui testes automatizados de backend e testes de ponta a ponta.

### Testes PHP

Os testes PHP utilizam SQLite em memória e não alteram o banco MySQL utilizado durante o desenvolvimento.

Execute:

```powershell
php artisan test --compact
```

---

### Validações adicionais

```powershell
composer validate --no-check-publish
composer check-platform-reqs
npm run build
```

---

### Testes End-to-End

Os testes E2E utilizam Playwright.

Antes de executá-los, mantenha em funcionamento:

* MySQL
* Laravel
* Laravel Reverb

Execute:

```powershell
npm run test:e2e
```

Para visualizar o relatório:

```powershell
npx playwright show-report
```

O Playwright está configurado para utilizar o Google Chrome instalado e executar uma única instância de teste por vez.

O cenário E2E utiliza duas sessões independentes e valida:

* cadastro de usuários;
* autenticação;
* upload de avatar;
* conexão WebSocket;
* troca de mensagens nos dois sentidos;
* persistência das mensagens;
* reconexão;
* proteção contra execução de HTML enviado através do chat.

---

## Estrutura do projeto

```text
app/
├── Events/
│   └── MessageSent.php
│
├── Http/
│   └── Controllers/
│       └── ChatController.php
│
└── Models/
    ├── ChMessage.php
    └── User.php

database/
└── migrations/

resources/
├── js/
│   ├── echo.js
│   └── chat.js
│
└── views/
    └── chat/
        └── index.blade.php

routes/
├── channels.php
└── chatify/
    └── web.php

scripts/
├── mysql.ps1
└── create-database.php

tests/
├── Feature/
└── Browser/
    └── chat.spec.js
```

### Arquivos principais

| Caminho                                   | Responsabilidade                                    |
| ----------------------------------------- | --------------------------------------------------- |
| `app/Http/Controllers/ChatController.php` | Usuários, interface, histórico e envio de mensagens |
| `app/Events/MessageSent.php`              | Evento transmitido pelos canais privados            |
| `app/Models/ChMessage.php`                | Modelo das mensagens                                |
| `app/Models/User.php`                     | Usuário, autenticação e avatar                      |
| `routes/chatify/web.php`                  | Rotas relacionadas ao chat                          |
| `routes/channels.php`                     | Autorização dos canais privados                     |
| `resources/js/echo.js`                    | Configuração da conexão WebSocket                   |
| `resources/js/chat.js`                    | Atualização da interface e comportamento do chat    |
| `resources/views/chat/index.blade.php`    | Interface principal                                 |
| `database/migrations/`                    | Estrutura do banco de dados                         |
| `tests/Feature/`                          | Testes de backend                                   |
| `tests/Browser/chat.spec.js`              | Teste E2E                                           |

---

## Segurança

Algumas medidas implementadas no projeto incluem:

* autenticação das rotas;
* autorização dos canais privados;
* validação das mensagens no backend;
* isolamento das conversas entre seus participantes;
* proteção contra execução de HTML enviado através das mensagens;
* credenciais sensíveis armazenadas no `.env`.

O arquivo `.env` nunca deve ser publicado no repositório.

---

## Solução de problemas

### A aplicação não conecta ao banco

Confirme se o MySQL está em execução e se as seguintes configurações correspondem ao servidor utilizado:

```dotenv
DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
```

Depois execute:

```powershell
php artisan config:clear
```

---

### WebSocket desconectado

Confirme se o Laravel Reverb está executando na porta `8080`.

Verifique:

```dotenv
BROADCAST_CONNECTION=reverb

REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
```

Depois de alterar o `.env`, reinicie a aplicação Laravel.

---

### Fotos de perfil retornam 404

Execute:

```powershell
php artisan storage:link
```

E confirme se os avatares estão armazenados em:

```text
storage/app/public/users-avatar
```

---

### O teste E2E não inicia

Antes de executar:

```powershell
npm run test:e2e
```

confirme que estão ativos:

* MySQL;
* Laravel;
* Laravel Reverb.

Também é necessário possuir o Google Chrome instalado.

Caso queira utilizar o Chromium gerenciado pelo Playwright, altere a configuração em:

```text
playwright.config.js
```

---

## Limitações atuais

A versão atual do Voxa possui foco em comunicação privada entre dois usuários.

Ainda não fazem parte do escopo atual:

* conversas em grupo;
* chamadas de voz;
* chamadas de vídeo;
* reações às mensagens;
* edição de mensagens;
* envio de arquivos;
* notificações push.

---

## Roadmap

* [x] Cadastro de usuários
* [x] Autenticação
* [x] Perfil de usuário
* [x] Upload de avatar
* [x] Listagem de usuários
* [x] Conversas privadas
* [x] Mensagens em tempo real
* [x] Histórico persistente
* [x] WebSocket com Laravel Reverb
* [x] Suporte a Pusher Channels
* [x] Testes automatizados
* [x] Testes E2E
* [x] Proteção contra HTML executável
* [ ] Indicador de usuário digitando
* [ ] Status online
* [ ] Confirmação de leitura
* [ ] Envio de imagens e arquivos
* [ ] Reações às mensagens
* [ ] Conversas em grupo

---

## Autor

Desenvolvido por **Nicollas Lopes Costa**.

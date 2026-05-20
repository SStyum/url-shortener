# URL Shortener

Encurtador de URLs com autenticação JWT e métricas de cliques.

## Stack

- API: NestJS + TypeORM + PostgreSQL
- Web: React + TanStack Query + Tailwind

## Como rodar

1. `cp .env.example .env`
2. `docker compose up -d`
3. `cd apps/api && pnpm dev`
4. `cd apps/web && pnpm dev`

## Endpoints

| Método | Rota             | Auth   | Descrição                                                  |
| ------ | ---------------- | ------ | ---------------------------------------------------------- |
| POST   | `/auth/register` | pública | Cria um usuário e retorna `accessToken` + cookie de refresh |
| POST   | `/auth/login`    | pública | Autentica e retorna `accessToken` + cookie de refresh       |
| POST   | `/auth/refresh`  | cookie  | Troca o refresh cookie por um novo `accessToken`            |
| POST   | `/auth/logout`   | cookie  | Limpa o cookie de refresh                                   |
| POST   | `/links`         | Bearer  | Cria um link com `shortCode` aleatório de 8 caracteres      |
| GET    | `/links`         | Bearer  | Lista todos os links (mais recentes primeiro)               |
| GET    | `/links/:id/stats` | Bearer | Cliques por dia nos últimos 7 dias para o link              |
| GET    | `/:code`         | pública | Redireciona (302), registra `Click` (IP hashed) e incrementa contador |

### Exemplo

```bash
# registrar e guardar o cookie de refresh
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"alice@example.com","password":"secret123"}'

# usar o access token para criar um link
TOKEN="..."  # accessToken da resposta acima
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"originalUrl":"https://www.anthropic.com"}'

# resolver o link encurtado (público)
curl -I http://localhost:3000/fZ1OPXUe
# HTTP/1.1 302 Found
# Location: https://www.anthropic.com
```

## Autenticação

Fluxo JWT com **access token + refresh token**:

- **Access token** (15 min): assinado com `JWT_ACCESS_SECRET`, retornado no JSON
  e enviado pelo cliente no header `Authorization: Bearer <token>`. Usado para
  acessar os endpoints protegidos (`/links`).
- **Refresh token** (7 dias): assinado com `JWT_REFRESH_SECRET`, devolvido pela
  API em um cookie `httpOnly` (`path=/auth`, `sameSite=lax`, `secure` em prod).
  O cliente nunca acessa esse token via JavaScript — o navegador o envia
  automaticamente para `/auth/refresh` e `/auth/logout`.

Fluxo típico:

```
register/login  ─►  { accessToken } + Set-Cookie: refreshToken=...
                                          │
   (15 min depois, access expira)         │
                                          ▼
                  POST /auth/refresh ─►  { novo accessToken } + novo cookie
                                          │
                                          ▼
                  POST /auth/logout  ─►  cookie limpo
```

Senhas são armazenadas como hash **bcrypt** (10 rounds) na entidade `User`.

## Frontend

App React (Vite) em `apps/web/` consumindo a API.

- **Stack**: React 18 + React Router v7 + Axios + TanStack Query v5 + Tailwind v4 + Recharts
- **Rotas**:
  - `/login` e `/register` — públicas; redirecionam pra `/` se já autenticado
  - `/` — Dashboard com formulário de criação e listagem de links
  - `/links/:id` — Detalhe do link com métricas + gráfico de barras dos últimos 7 dias
- **AuthContext**: guarda o `accessToken` **em memória** (não em localStorage,
  defesa contra XSS). O refresh token vive em cookie httpOnly e o navegador o
  envia automaticamente nas chamadas a `/auth`.
- **Axios interceptor**:
  - Request: injeta `Authorization: Bearer <accessToken>` em toda chamada
  - Response: ao receber 401 numa rota protegida, dispara `POST /auth/refresh`
    (com de-duplicação — refreshes paralelos compartilham a mesma promise),
    atualiza o token e retenta a requisição original. Se o refresh falhar,
    desloga e cai pra `/login`.
- **Bootstrap**: ao montar, o `AuthProvider` tenta `POST /auth/refresh` —
  se o cookie ainda for válido, o usuário já entra logado.

```
URL              Comportamento
/login       →   PublicOnly (redireciona pra / se autenticado)
/register    →   PublicOnly
/            →   ProtectedRoute → Dashboard (form + listagem)
/links/:id   →   ProtectedRoute → Detalhe + gráfico Recharts
```

### Dashboard

- **Encurtar URL**: formulário no topo dispara `POST /links` via mutation do
  TanStack Query; ao sucesso, invalida o cache da listagem para o link novo
  aparecer instantaneamente
- **Listagem**: tabela com URL original (truncada), link curto clicável, botão
  **Copiar** (`navigator.clipboard`, feedback visual "Copiado!"), contador de
  cliques e link **Detalhes →**
- **Detalhe** (`/links/:id`): mostra URL original, link curto, total de cliques,
  data de criação e um `BarChart` (Recharts) com a série diária dos últimos
  7 dias retornada por `GET /links/:id/stats`

## Segurança

| Vetor | Defesa |
| ----- | ------ |
| Senha em trânsito | **TLS (HTTPS)** em produção — o body fica criptografado pelo TLS antes de sair do navegador. Em DevTools você vê o payload *antes* de o navegador criptografar, mas na rede ninguém consegue lê-lo. |
| Senha em repouso | **bcrypt** com 10 rounds e salt único por usuário, armazenado em `User.passwordHash`. O servidor nunca persiste a senha em texto plano. |
| Roubo do access token via XSS | Access token vive **só em memória** do React (nada de `localStorage` ou `sessionStorage`). |
| Roubo do refresh token via XSS | Refresh token vive em **cookie `httpOnly`** — JavaScript da página nem enxerga, só o navegador envia automaticamente para `/auth/refresh` e `/auth/logout`. |
| CSRF no refresh | Cookie com `SameSite=Lax`, `Path=/auth` e `Secure` em produção. |
| Força bruta / abuso | Rate limit global (60 req/min/IP) + limite estrito em `POST /links` (10/min/IP) via `@nestjs/throttler`. |
| Validação de entrada | `ValidationPipe` global com `whitelist` + `forbidNonWhitelisted` + DTOs com `class-validator`. |
| Privacidade dos cliques | IPs nunca são armazenados em texto plano — apenas o `SHA-256(ip)` em `clicks.ip_hash`. |

> **Por que não hashear a senha no cliente?** Se o hash do cliente fosse o que o servidor compara, ele *viraria* a senha — quem roubasse o hash do banco poderia se autenticar enviando-o diretamente. O bcrypt do servidor precisa do plaintext para recomputar com o salt armazenado. TLS resolve o problema do trânsito; bcrypt resolve o do repouso.

## Rate Limiting

Throttling é aplicado globalmente via `@nestjs/throttler` (`ThrottlerGuard`):

- **Default**: 60 requisições / minuto por IP em qualquer rota
- **`POST /links`**: limite mais apertado de **10 requisições / minuto** por IP
  (decorator `@Throttle` na rota)

Acima do limite a API responde **HTTP 429** com `{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}`.

## Métricas

Cada redirecionamento em `GET /:code` grava uma linha em `clicks` com o `link_id`
e um hash SHA-256 do IP do cliente (sem armazenar o IP em texto plano).

`GET /links/:id/stats` retorna uma série diária de 7 dias (dias sem cliques são
preenchidos com zero) e o total agregado da janela:

```json
{
  "linkId": "6556e656-1ea1-4c27-8ae8-6fa158c75a9a",
  "days": [
    { "date": "2026-05-14", "clicks": 0 },
    { "date": "2026-05-15", "clicks": 0 },
    { "date": "2026-05-16", "clicks": 0 },
    { "date": "2026-05-17", "clicks": 0 },
    { "date": "2026-05-18", "clicks": 0 },
    { "date": "2026-05-19", "clicks": 0 },
    { "date": "2026-05-20", "clicks": 3 }
  ],
  "total": 3
}
```

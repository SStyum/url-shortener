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

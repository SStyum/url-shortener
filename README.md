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
| GET    | `/:code`         | pública | Redireciona (302) para `originalUrl` e incrementa `clicks`  |

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

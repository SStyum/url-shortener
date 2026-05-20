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

| Método | Rota       | Descrição                                                       |
| ------ | ---------- | --------------------------------------------------------------- |
| POST   | `/links`   | Cria um link com `shortCode` aleatório de 8 caracteres          |
| GET    | `/links`   | Lista todos os links (mais recentes primeiro)                   |
| GET    | `/:code`   | Redireciona (302) para `originalUrl` e incrementa `clicks`      |

### Exemplo

```bash
# criar
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://www.anthropic.com"}'

# resposta
{
  "id": "31e36d48-...",
  "originalUrl": "https://www.anthropic.com",
  "shortCode": "fZ1OPXUe",
  "shortUrl": "http://localhost:3000/fZ1OPXUe",
  "clicks": 0,
  "createdAt": "2026-05-20T17:43:40.946Z"
}

# usar
curl -I http://localhost:3000/fZ1OPXUe
# HTTP/1.1 302 Found
# Location: https://www.anthropic.com
```

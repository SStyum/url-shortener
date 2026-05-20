# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
WORKDIR /repo

# ---- deps (full workspace install for build) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @urlshort/api...

# ---- build ----
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
RUN pnpm --filter @urlshort/api build

# ---- prod deps via pnpm deploy (flattens workspace into a portable bundle) ----
FROM build AS prod
RUN pnpm --filter=@urlshort/api --prod --legacy deploy /prod

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod /prod/node_modules ./node_modules
COPY --from=prod /prod/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

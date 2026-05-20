# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
WORKDIR /repo

# ---- deps ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @urlshort/web...

# ---- build ----
FROM base AS build
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY tsconfig.base.json package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web
RUN pnpm --filter @urlshort/web build

# ---- runtime (nginx static) ----
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

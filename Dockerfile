# ==============================================================================
# DOCKERFILE — RITMO CLARO API (NestJS + Prisma 7 + PostgreSQL)
# Multi-stage build optimizado para producción y despliegue en Dokploy
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Instalar dependencias nativas requeridas por Prisma en Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Habilitar pnpm versión fijada del proyecto (10.31.0)
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate

# Copiar manifiestos de dependencias para aprovechar el cache de Docker
COPY package.json pnpm-lock.yaml ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN pnpm install --frozen-lockfile

# Copiar esquemas y configuraciones de Prisma y NestJS
COPY prisma/ ./prisma/
COPY prisma.config.ts tsconfig*.json nest-cli.json ./

# Variables temporales para compilación estática
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"

# Generar el cliente de Prisma tipado en src/generated/prisma
RUN pnpm exec prisma generate

# Copiar código fuente
COPY src/ ./src/

# Compilar la aplicación NestJS a JavaScript en /dist
RUN pnpm run build

# Limpiar devDependencies para reducir el tamaño final de node_modules
RUN pnpm prune --prod

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Dependencias necesarias para ejecutar Prisma Query Engine en Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar artefactos y dependencias asignando propiedad directa al usuario 'node'
# (Evita la capa lenta 'RUN chown -R' que se congela en servidores y VPS con IOPS limitados)
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts

USER node

EXPOSE 3000

# Al arrancar el contenedor:
# 1. Aplica migraciones pendientes de Prisma contra la BD (npx prisma migrate deploy)
# 2. Inicia la aplicación NestJS en modo producción
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

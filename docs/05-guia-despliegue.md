# 05. Guía de Ejecución Local y Despliegue en Producción

## Ritmo Claro API — Manual Operativo y Publicación en la Nube

Este documento describe paso a paso cómo ejecutar la API en entornos de desarrollo local (con o sin Docker) y el procedimiento verificado para desplegarla en plataformas en la nube utilizando **Dokploy** con PostgreSQL administrado.

---

## 1. Requisitos Previos

- **Node.js:** Versión 20.x o 22.x LTS instalada (desarrollado y probado con Node 22).
- **Gestor de paquetes:** `pnpm` (versión 10.31.0 fijada en el proyecto con Corepack).
- **Docker & Docker Compose:** Para pruebas locales y empaquetado de producción.
- **Git:** Para control de versiones.

---

## 2. Variables de Entorno

Crear el archivo `.env` a partir de la plantilla `.env.example`:

```bash
cp .env.example .env
```

Contenido representativo para entorno local:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/ritmo-claro?schema=public"
JWT_SECRET="clave_secreta_super_segura_ritmo_claro_2026"
JWT_EXPIRES_IN="1h"
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

---

## 3. Ejecución Local Paso a Paso

### 3.1 Opción A: API en Node.js local con PostgreSQL local

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Ejecutar migraciones de Prisma y generar el cliente tipado:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Iniciar la API en modo desarrollo (hot-reload):**
   ```bash
   pnpm start:dev
   ```

4. **Verificar disponibilidad:**
   - API: `http://localhost:3000`
   - Documentación Swagger interactiva: `http://localhost:3000/docs`

---

### 3.2 Opción B: Todo el entorno en Docker Compose (Contenedor completo)

Para levantar tanto la base de datos como la API completamente dentro de contenedores:

```bash
docker compose up --build -d
```
> El servicio PostgreSQL iniciará en el puerto `5433` (para evitar colisión con Postgres local) y la API en el puerto `3000`.

---

## 4. Construcción de Imagen Docker Multi-Stage (`Dockerfile`)

Se utiliza un `Dockerfile` multi-stage optimizado para producción sobre Alpine Linux:

```dockerfile
# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY prisma/ ./prisma/
COPY prisma.config.ts tsconfig*.json nest-cli.json ./
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN pnpm exec prisma generate
COPY src/ ./src/
RUN pnpm run build
RUN pnpm prune --prod

# Stage 2: Production Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

---

## 5. Despliegue en Producción Verificado: Dokploy

La API se encuentra actualmente desplegada y operativa en producción sobre **Dokploy**.

- **URL Pública:** `https://p2.dev.viptelcomunicaciones.com`
- **Swagger UI en Vivo:** `https://p2.dev.viptelcomunicaciones.com/docs`
- **OpenAPI JSON:** `https://p2.dev.viptelcomunicaciones.com/docs-json`

### 5.1 Arquitectura de Despliegue en Dokploy

```
┌─────────────────────────────────────────────────────────────┐
│                       DOKPLOY HOST                          │
│                                                             │
│   Internet ──HTTPS──> Traefik (Proxy Inverso + SSL)         │
│                              │                              │
│                      p2.dev.viptelcomunicaciones.com        │
│                              ▼                              │
│                  ┌───────────────────────┐                  │
│                  │  ritmo-claro-api      │                  │
│                  │  (Node 22 / NestJS)   │                  │
│                  │  Puerto 3000          │                  │
│                  └───────────┬───────────┘                  │
│                              │ Red Interna Docker           │
│                              ▼                              │
│                  ┌───────────────────────┐                  │
│                  │  ritmo-db             │                  │
│                  │  PostgreSQL 5432      │                  │
│                  └───────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Pasos de Configuración en Dokploy

1. **Creación de la Base de Datos:**
   - Servicio tipo **Database** -> **PostgreSQL**.
   - Nombre del contenedor: `cesardevsenior-dbritmo-hope4k`.
   - Base de datos: `ritmo-db`.

2. **Creación de la Aplicación:**
   - Servicio tipo **Application**.
   - Repositorio GitHub: `https://github.com/viptelcomunicaciones/Ritmo-Claro-Api`.
   - Rama: `main`.
   - Build Type: **Dockerfile**.

3. **Variables de Entorno en Dokploy:**
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@cesardevsenior-dbritmo-hope4k:5432/ritmo-db?schema=public
   JWT_SECRET=tu_clave_secreta_de_produccion_2026
   JWT_EXPIRES_IN=24h
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=100
   ```

4. **Dominio y Certificados SSL:**
   - En la pestaña **Domains**, asignar:
     - Dominio: `p2.dev.viptelcomunicaciones.com`
     - Container Port: `3000`
     - HTTPS: Activado (Let's Encrypt automático vía Traefik).

### 5.3 Evidencia de Migración y Arranque en Dokploy

```text
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "ritmo-db", schema "public" at "cesardevsenior-dbritmo-hope4k:5432"
1 migration found in prisma/migrations
Applying migration `20261006180844_modelo_inicial`
The following migration(s) have been applied:
migrations/
└─ 20261006180844_modelo_inicial/
   └─ migration.sql
All migrations have been successfully applied.

[Nest] 1 - LOG [NestFactory] Starting Nest application...
[Nest] 1 - LOG [RoutesResolver] AuthController {/auth}:
[Nest] 1 - LOG [RouterExplorer] Mapped {/auth/register, POST} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/auth/login, POST} route
[Nest] 1 - LOG [RoutesResolver] HabitosController {/habitos}:
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos/admin/todos, GET} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos, POST} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos, GET} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos/:id, GET} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos/:id, PATCH} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/habitos/:id, DELETE} route
[Nest] 1 - LOG [NestApplication] Nest application successfully started
```

---

## 6. Verificación de Endpoints en Producción

### 6.1 Registro de Usuario en Producción
```bash
curl -X POST https://p2.dev.viptelcomunicaciones.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Cesar Barrero", "email": "cesar.dokploy@viptelcomunicaciones.com", "password": "DevSenior2026!"}'
```
**Respuesta (HTTP 201 Created):**
```json
{
  "id": "9b964603-f42f-4bb2-a0f9-0d0dfff79716",
  "nombre": "Cesar Barrero",
  "email": "cesar.dokploy@viptelcomunicaciones.com",
  "rol": "USUARIO",
  "creadoEn": "2026-10-09T18:41:59.000Z"
}
```

### 6.2 Inicio de Sesión y Emisión de JWT
```bash
curl -X POST https://p2.dev.viptelcomunicaciones.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "cesar.dokploy@viptelcomunicaciones.com", "password": "DevSenior2026!"}'
```
**Respuesta (HTTP 200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 6.3 Creación de Hábito Persistido
```bash
curl -X POST https://p2.dev.viptelcomunicaciones.com/habitos \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Lectura de Arquitectura Cloud", "descripcion": "30 minutos diarios de estudio en Dokploy y Docker", "frecuencia": "DIARIA"}'
```
**Respuesta (HTTP 201 Created):**
```json
{
  "id": "fd786e5e-76e3-4bc6-8904-08250055a5cb",
  "nombre": "Lectura de Arquitectura Cloud",
  "descripcion": "30 minutos diarios de estudio en Dokploy y Docker",
  "estado": "ACTIVO",
  "frecuencia": "DIARIA",
  "usuarioId": "9b964603-f42f-4bb2-a0f9-0d0dfff79716",
  "creadoEn": "2026-10-09T18:42:46.000Z"
}
```

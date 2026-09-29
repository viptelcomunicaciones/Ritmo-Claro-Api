# 05. Guía de Ejecución Local y Despliegue en Producción

## Ritmo Claro API — Manual Operativo y Publicación en la Nube

Este documento describe paso a paso cómo ejecutar la API en entornos de desarrollo local (con o sin Docker) y el procedimiento para desplegarla en plataformas en la nube públicas (Render, Railway o Neon).

---

## 1. Requisitos Previos

- **Node.js:** Versión 20.x o 22.x LTS instalada.
- **Gestor de paquetes:** `pnpm` (versión 10+ recomendada) o `npm`.
- **Docker & Docker Compose:** Para levantar la base de datos PostgreSQL localmente en contenedor.
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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ritmo_claro_db?schema=public"
JWT_SECRET="clave_secreta_super_segura_ritmo_claro_2026"
JWT_EXPIRES_IN="24h"
```

---

## 3. Ejecución Local Paso a Paso

### 3.1 Opción A: Base de datos en Docker + API en Node.js local (Recomendado para desarrollo)

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Levantar PostgreSQL con Docker Compose:**
   ```bash
   docker compose up -d postgres
   ```

3. **Ejecutar migraciones de Prisma y generar el cliente:**
   ```bash
   pnpm prisma migrate dev --name init
   ```

4. **Poblar la base de datos con el usuario ADMIN inicial (Seed):**
   ```bash
   pnpm prisma db seed
   ```

5. **Iniciar la API en modo observación (hot-reload):**
   ```bash
   pnpm run start:dev
   ```

6. **Verificar disponibilidad:**
   - API: `http://localhost:3000`
   - Documentación Swagger interactiva: `http://localhost:3000/docs`

---

### 3.2 Opción B: Todo el entorno en Docker Compose (Contenedor completo)

Para levantar tanto la base de datos como la API completamente dentro de contenedores:

```bash
docker compose up --build -d
```

---

## 4. Construcción de Imagen Docker de Producción (`Dockerfile`)

Se utiliza un `Dockerfile` multi-stage para optimizar el tamaño y la seguridad de la imagen:

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## 5. Despliegue en la Nube (Producción Pública)

### 5.1 Base de Datos en la Nube (Neon / Supabase)
1. Crear un proyecto en [Neon.tech](https://neon.tech) o [Supabase.com](https://supabase.com).
2. Crear una base de datos PostgreSQL llamada `ritmo_claro_db`.
3. Copiar la cadena de conexión de producción con SSL activado (`DATABASE_URL`), por ejemplo:
   `postgresql://usuario:password@ep-xyz.us-east-2.aws.neon.tech/ritmo_claro_db?sslmode=require`

### 5.2 Publicación del Servicio Web (Render / Railway)
1. Conectar el repositorio de GitHub en [Render](https://render.com) como **Web Service**.
2. Configurar los comandos de compilación y arranque:
   - **Build Command:**
     ```bash
     pnpm install && npx prisma generate && pnpm run build
     ```
   - **Start Command:**
     ```bash
     npx prisma migrate deploy && node dist/main
     ```
3. Configurar las variables de entorno en el panel de Render:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (o el asignado por la plataforma)
   - `DATABASE_URL`: *Cadena copiada de Neon/Supabase*
   - `JWT_SECRET`: *Clave criptográfica secreta de producción*
   - `JWT_EXPIRES_IN`: `24h`
4. Desplegar y verificar:
   - Al terminar el deploy, Render entregará una URL pública (ejemplo: `https://ritmo-claro-api.onrender.com`).
   - Comprobar que `/docs` sea accesible públicamente: `https://ritmo-claro-api.onrender.com/docs`.

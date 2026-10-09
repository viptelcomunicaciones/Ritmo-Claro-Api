# Plan de Implementación — Parte 9: Preparación para GitHub, Docker y Despliegue en Dokploy (Actualizado)

## Propósito
Dejar el proyecto **100% reproducible, portable y seguro**, garantizando la ausencia total de secretos en el control de versiones (`.env` estrictamente ignorado) y encapsulando la aplicación en una imagen Docker optimizada mediante **multi-stage build** (Node 22 Alpine, pnpm 10.31.0, NestJS 11 y Prisma 7). Al arrancar en producción, la imagen aplicará automáticamente las migraciones pendientes en PostgreSQL. Tras verificar localmente que la imagen compila y arranca, se ejecutará una **limpieza total de los contenedores e imágenes temporales** de prueba para dejar la máquina del usuario limpia y lista para el despliegue final en **Dokploy**.

---

## 1. Análisis del Estado Actual vs. Requisitos

| Componente | Requisito Parte 9 | Estado Actual | Acción a Realizar en Parte 9 |
| :--- | :--- | :--- | :--- |
| **Variables de Entorno (`.env.example`)** | Documentar `PORT`, `DATABASE_URL`, `JWT_SECRET`, etc. con valores genéricos y explicativos, sin credenciales reales. | Versión básica presente. | Pulir y documentar con comentarios claros para entornos locales y Dokploy. |
| **Control de Ignorados (`.gitignore` y `.dockerignore`)** | Excluir `.env`, `node_modules`, `/dist`, pero conservar `prisma/migrations`. | `.gitignore` configurado. Falta `.dockerignore`. | Crear `.dockerignore` estricto (excluir `.env`, `.git`, `node_modules`, `dist`, `logs`). |
| **Dockerfile Multi-Stage** | Multi-stage reproducible con pnpm 10.31.0, compilación NestJS, generación Prisma y auto-migración al arrancar. | No existe en el repositorio. | Crear `Dockerfile` optimizado y seguro (usuario no root `node`). |
| **Orquestación Local (`docker-compose.yml`)** | Facilitar levantamiento opcional de PostgreSQL y API en una sola orden. | No existe. | Crear `docker-compose.yml` de referencia para evaluadores o pruebas aisladas. |
| **Compilación y Build Docker** | Ejecutar `docker build -t ritmo-claro-api .` para verificar que la imagen construye limpiamente sin `.env`. | Docker Desktop está activo. | Ejecutar construcción de la imagen y comprobar ausencia de `.env` interno. |
| **Prueba y Limpieza de Recursos Locales** | Verificar arranque y **limpiar/eliminar** la imagen y contenedor temporal de prueba. | Pendiente de ejecutar. | Detener el contenedor de prueba y ejecutar `docker rmi ritmo-claro-api` para no dejar residuos en el disco. |
| **Documentación para Dokploy (`README.md`)** | Explicar cómo desplegar en Dokploy conectando la API con el PostgreSQL creado en Dokploy. | Pendiente de documentar. | Añadir guía paso a paso para Dokploy en el `README.md`. |
| **Auditoría Git Zero Leakage** | Confirmar que ningún commit contenga `.env` y que el árbol esté limpio antes del push. | Verificado en historial (`git log --all -- "**.env"` vacío). | Certificar que no existan secretos antes del push final. |

---

## 2. Arquitectura de Despliegue en Dokploy

```mermaid
flowchart TD
    subgraph Dokploy["Servidor Dokploy (Producción)"]
        subgraph PostgresService["Servicio: Base de Datos PostgreSQL"]
            DB[("Base de Datos vacía\n(ritmo_claro)")]
        end

        subgraph AppService["Servicio: Ritmo Claro API"]
            Build["1. Dokploy clona repo y construye Dockerfile"] --> Run["2. Dokploy enciende el contenedor"]
            Run --> Migrate["3. npx prisma migrate deploy\n(Crea tablas en PostgreSQL)"]
            Migrate --> Start["4. node dist/main.js\n(NestJS escucha en PORT y sirve Swagger)"]
        end

        Migrate -- "Aplica schema y migraciones" --> DB
        Start -- "Consultas y operaciones" --> DB
    end
```

---

## 3. Plan de Trabajo Paso a Paso

### Paso 1: Actualizar `.env.example`
- Añadir documentación exhaustiva de las variables requeridas:
  - `PORT`: Puerto donde escucha la aplicación (ej. `3000`).
  - `NODE_ENV`: Modo de ejecución (`production` o `development`).
  - `DATABASE_URL`: Cadena de conexión para PostgreSQL con explicación para entornos locales y red interna de Dokploy (ej. `postgresql://usuario:password@postgres-db:5432/ritmo_claro?schema=public`).
  - `JWT_SECRET`: Instrucciones para generar una clave criptográfica de al menos 32 caracteres.
  - `JWT_EXPIRES_IN`: Tiempo de expiración del token (ej. `1h`).

### Paso 2: Crear `.dockerignore`
- Excluir explícitamente:
  - Archivos de entorno: `.env`, `.env.*` (excepto `.env.example`).
  - Directorios pesados y generados: `node_modules`, `dist`, `src/generated`.
  - Control de versiones y metadatos: `.git`, `.gitignore`, `.github`.
  - Herramientas y pruebas: `test`, `coverage`, `postman/*.test_run.json`.
  - Logs y temporales: `*.log`, `.tmp`.

### Paso 3: Crear `Dockerfile` Multi-Stage de Alto Rendimiento
- **Base:** `node:22-alpine` (alineado a Node 22 local, tamaño ultra ligero ~150MB).
- **Herramienta de paquetes:** `corepack enable && corepack prepare pnpm@10.31.0 --activate` (versión exacta del usuario).
- **Generación de Prisma 7:** Ejecutar `pnpm exec prisma generate` durante el build.
- **Arranque en Producción / Dokploy:**
  ```dockerfile
  CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
  ```
- **Seguridad:** Copiar archivos finales al usuario sin privilegios `node`.

### Paso 4: Crear `docker-compose.yml` (Opcional de Referencia)
- Definir servicios `db` (Postgres 17 con healthcheck) y `api` (construido desde el `Dockerfile`).

### Paso 5: Probar Construcción Local con Docker
- Ejecutar:
  ```bash
  docker build -t ritmo-claro-api:latest .
  ```
- Inspeccionar que la imagen se construya con éxito sin errores de compilación ni de Prisma.
- Confirmar mediante inspección que `.env` **no** está presente dentro de la imagen construida.

### Paso 6: Prueba de Arranque y Limpieza Total en Local
- Probar arranque temporal con `--rm`:
  ```bash
  docker run --rm -d --name test-api -p 3001:3000 -e PORT=3000 -e JWT_SECRET="secreto_temporal_para_prueba_local_123456" ritmo-claro-api:latest
  ```
- Verificar logs para confirmar que el runtime arranca correctamente.
- Detener y limpiar contenedor:
  ```bash
  docker stop test-api
  ```
- **Limpieza de imagen local:** Eliminar la imagen construida para no dejar residuos en el Docker Desktop del usuario:
  ```bash
  docker rmi ritmo-claro-api:latest
  ```
- Dejar la base de datos local y el entorno Docker 100% limpios.

### Paso 7: Actualizar `README.md` con la Guía para Dokploy
- Documentar:
  1. Pasos exactos para crear la base de datos PostgreSQL en Dokploy.
  2. Cómo copiar la URL de conexión interna de Dokploy.
  3. Cómo crear la aplicación desde GitHub seleccionando `Dockerfile`.
  4. Cómo pegar las variables de entorno en Dokploy.

### Paso 8: Versionado Git Local (Sin Push)
- Realizar commit convencional con todos los archivos listos:
  `feat: add multi-stage Dockerfile, .dockerignore and Dokploy deployment guide`.
- Dejar el árbol de Git limpio y listo para que el usuario realice el `git push` cuando lo decida.

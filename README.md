# Ritmo Claro API — Backend Profesional RESTful

API RESTful desarrollada con **NestJS 11**, **PostgreSQL**, **Prisma 7**, **JWT**, **Passport** y **Helmet** para la gestión segura de hábitos personales, control de acceso basado en roles (**RBAC**) y validación estricta de propiedad de recursos (**Ownership**).

---

## 1. Características Principales

- **Arquitectura Modular:** Separación por módulos desacoplados (`AuthModule`, `HabitosModule`, `PrismaModule`).
- **Autenticación Robusta:** Hashing de contraseñas con `bcryptjs` (10 rondas de salt) y tokens `JWT` firmados con vigencia de 1 hora.
- **Control de Acceso (RBAC & Ownership):**
  - Roles `USUARIO` y `ADMIN`.
  - Endpoint administrativo global (`GET /habitos/admin/todos`) reservado estrictamente para `ADMIN`.
  - Comprobación de propiedad: un usuario solo puede consultar, modificar o eliminar sus propios hábitos; intentos sobre recursos ajenos retornan `403 Forbidden`.
- **Validaciones Estrictas:** `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`.
- **Contrato Uniforme de Errores (Zero Leakage):** Todas las excepciones (400, 401, 403, 404, 409, 500) devuelven el esquema `{ statusCode, timestamp, path, message }` sin exponer stack traces, hashes ni secretos de base de datos.
- **Documentación Interactiva:** OpenAPI / Swagger disponible en `/docs` con soporte para autorización Bearer token.

---

## 2. Requisitos Previos

- **Node.js:** Versión `>= 20.x` (Recomendado Node 22).
- **pnpm:** Versión `>= 9.x`.
- **PostgreSQL:** Instancia local o contenedor Docker en el puerto `5432`.

---

## 3. Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno:**
   Copia el archivo de plantilla `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Asegúrate de configurar los valores de conexión:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/ritmo-claro?schema=public"
   JWT_SECRET="clave_secreta_super_segura_ritmo_claro_2026"
   JWT_EXPIRES_IN="1h"
   ```

3. **Ejecutar migraciones de Prisma:**
   ```bash
   npx prisma migrate deploy
   ```

---

## 4. Ejecución del Servidor

```bash
# Modo desarrollo con recarga automática
pnpm start:dev

# Compilar proyecto TypeScript
pnpm build

# Modo producción
pnpm start:prod
```

El servidor iniciará por defecto en `http://localhost:3000`.

---

## 5. Documentación Interactiva (Swagger / OpenAPI)

Una vez iniciado el servidor, abre en tu navegador:
```text
http://localhost:3000/docs
```

### Cómo probar endpoints protegidos en Swagger:
1. Dirígete a la sección **auth** y ejecuta `POST /auth/login` con tus credenciales.
2. Copia el valor de `access_token` retornado.
3. Haz clic en el botón verde **Authorize** (ubicado en la parte superior derecha de la interfaz de Swagger).
4. Pega el token JWT en el campo de texto (sin la palabra `Bearer`).
5. Haz clic en **Authorize** y luego en **Close**. Ahora puedes ejecutar cualquiera de los endpoints protegidos bajo la etiqueta **habitos**.

---

## 6. Colección de Postman

La colección de pruebas reproducible se encuentra en el repositorio:
📁 `postman/Ritmo-Claro.postman_collection.json`

### Instrucciones para Postman:
1. Abre **Postman** y haz clic en **Import**.
2. Selecciona el archivo `postman/Ritmo-Claro.postman_collection.json`.
3. La colección incluye las siguientes variables precargadas (sin secretos vigentes):
   - `baseUrl`: `http://localhost:3000`
   - `token`: Cadena vacía (se autocompleta automáticamente al ejecutar `1.2 Login de Usuario Normal`).
   - `adminToken`: Cadena vacía (se autocompleta automáticamente al ejecutar `1.3 Login de Administrador`).
   - `habitoId`: Identificador UUID capturado tras la creación del hábito.
4. Ejecuta la colección en orden numérico para comprobar el camino feliz, control de acceso de roles, validaciones y rechazos controlados.

---

## 7. Tabla de Endpoints de la API

| Tag | Método | Ruta | Acceso | Descripción | Códigos HTTP |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **auth** | `POST` | `/auth/register` | Público | Registro de usuario (nace como `USUARIO`) | `201`, `400`, `409` |
| **auth** | `POST` | `/auth/login` | Público | Login y emisión de token JWT (1 hora) | `200`, `400`, `401` |
| **habitos** | `GET` | `/habitos/admin/todos` | Bearer (`ADMIN`) | Listado global administrativo | `200`, `401`, `403` |
| **habitos** | `POST` | `/habitos` | Bearer (`USUARIO`, `ADMIN`) | Crea hábito asociado al JWT del autor | `201`, `400`, `401` |
| **habitos** | `GET` | `/habitos` | Bearer (`USUARIO`, `ADMIN`) | Lista únicamente hábitos propios | `200`, `401` |
| **habitos** | `GET` | `/habitos/:id` | Bearer (`Ownership`) | Detalle de hábito propio | `200`, `401`, `403`, `404` |
| **habitos** | `PATCH` | `/habitos/:id` | Bearer (`Ownership`) | Actualización parcial de hábito propio | `200`, `400`, `401`, `403`, `404` |
| **habitos** | `DELETE`| `/habitos/:id` | Bearer (`Ownership`) | Eliminación de hábito propio | `200`, `401`, `403`, `404` |

---

## 8. Pruebas Automatizadas

```bash
# Ejecutar pruebas unitarias (filtro de excepciones, etc.)
pnpm test

# Ejecutar análisis de linter (ESLint)
pnpm lint

# Formatear código (Prettier)
pnpm format
```

# Plan de Implementación: Ritmo Claro API

Construcción, aseguramiento, documentación y despliegue de una API RESTful profesional para la gestión de hábitos de bienestar empresarial, cumpliendo estrictamente con el contrato del cliente y los criterios de evaluación de los Módulos 2 y 3.

---

## 1. Contexto y Objetivos

**Ritmo Claro** requiere reemplazar el registro de hábitos en hojas de cálculo y formularios dispersos por un backend robusto, escalable y seguro.

### Objetivos Clave
1. **Identidad y Privacidad**: Autenticación JWT sin exposición de datos sensibles. El `usuarioId` se extrae siempre del token. Los usuarios solo pueden operar sobre sus propios hábitos.
2. **Control de Acceso Basado en Roles (RBAC)**: Rol `USUARIO` para participantes regulares y rol `ADMIN` para soporte y supervisión global (`GET /habitos/admin/todos`).
3. **Persistencia Profesional**: Base de datos relacional PostgreSQL modelada y versionada con Prisma ORM y migraciones.
4. **Resiliencia y Contrato de Errores**: Formato uniforme de error `{ statusCode, timestamp, path, message }` para todos los códigos HTTP (400, 401, 403, 404, 409, 500).
5. **Documentación Swagger**: Publicada en `/docs` con esquema OpenAPI interactivo y autenticación Bearer.
6. **Contenedorización y Producción**: `Dockerfile` multi-stage optimizado, soporte Docker Compose local y preparación para despliegue público (Render/Railway/Neon).
7. **Documentación de Proyecto**: Estructurada y versionada en la carpeta `docs/`.

---

## 2. Decisiones de Arquitectura y Diseño

```
src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts      # Extrae el usuario autenticado de la request
│   │   └── roles.decorator.ts             # Metadata de roles requeridos (@Roles('ADMIN'))
│   ├── filters/
│   │   └── http-exception.filter.ts       # Normaliza respuestas de error { statusCode, timestamp, path, message }
│   ├── guards/
│   │   ├── jwt-auth.guard.ts              # Guard de autenticación JWT (Passport)
│   │   └── roles.guard.ts                 # Guard de verificación de rol (RBAC)
│   └── prisma/
│       ├── prisma.module.ts               # Módulo global para base de datos
│       └── prisma.service.ts              # Cliente Prisma con ciclo de vida NestJS
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   │   ├── register.dto.ts            # Validaciones nombre, email, password
│   │   │   └── login.dto.ts               # Validaciones email, password
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts            # Estrategia Passport JWT
│   │   ├── auth.controller.ts             # POST /auth/register, POST /auth/login
│   │   ├── auth.service.ts                # Hash con bcrypt, firma de JWT, validación de credenciales
│   │   └── auth.module.ts
│   └── habitos/
│       ├── dto/
│       │   ├── create-habito.dto.ts       # Validaciones nombre (3-120), descripcion, estado, frecuencia
│       │   └── update-habito.dto.ts       # PartialType de create-habito
│       ├── habitos.controller.ts          # CRUD usuario + endpoint admin /habitos/admin/todos
│       ├── habitos.service.ts             # Lógica de negocio y verificación estricta de propiedad
│       └── habitos.module.ts
├── app.module.ts                          # Ensamblado de ConfigModule, PrismaModule, AuthModule, HabitosModule
└── main.ts                                # Pipeline global (ValidationPipe, Filter, Swagger en /docs, CORS, Helmet)
```

### Reglas No Negociables del Contrato
| Regla | Implementación Técnica |
| :--- | :--- |
| **Identidad** | En `POST /habitos`, el `usuarioId` se inyecta desde `@CurrentUser('id')`, ignorando cualquier campo del body. |
| **Privacidad** | En `GET /habitos`, `GET /habitos/:id`, `PATCH /habitos/:id` y `DELETE /habitos/:id`, la consulta filtra o valida que `habito.usuarioId === req.user.id`. Si no pertenece al usuario, retorna 404 (o 403) sin revelar existencia ajena. |
| **Privilegio** | `POST /auth/register` fuerza `rol: Rol.USUARIO`. `GET /habitos/admin/todos` está protegido con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(Rol.ADMIN)`. |
| **Secretos** | `DATABASE_URL` y `JWT_SECRET` se inyectan por `ConfigService` / variables de entorno. Archivo `.env` en `.gitignore` y plantilla `.env.example` en el repositorio. |
| **Errores** | `AllExceptionsFilter` captura excepciones HTTP y no controladas, retornando `{ statusCode, timestamp, path, message }` sin exponer trazas de pila ni passwords. |

---

## 3. Modelo de Datos Prisma (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Rol {
  USUARIO
  ADMIN
}

enum EstadoHabito {
  ACTIVO
  PAUSADO
  ARCHIVADO
}

enum FrecuenciaHabito {
  DIARIA
  SEMANAL
  MENSUAL
}

model Usuario {
  id           String    @id @default(uuid())
  nombre       String
  email        String    @unique
  passwordHash String
  rol          Rol       @default(USUARIO)
  creadoEn     DateTime  @default(now())
  habitos      Habito[]

  @@map("usuarios")
}

model Habito {
  id          String           @id @default(uuid())
  nombre      String
  descripcion String?
  estado      EstadoHabito     @default(ACTIVO)
  frecuencia  FrecuenciaHabito
  usuarioId   String
  usuario     Usuario          @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  creadoEn    DateTime         @default(now())

  @@index([usuarioId])
  @@map("habitos")
}
```

> [!NOTE]
> Usaremos UUID v4 para los identificadores de `Usuario` y `Habito`, garantizando que no se puedan enumerar secuencialmente los IDs por atacantes (buena práctica de seguridad en APIs REST).

---

## 4. Fases de Ejecución Paso a Paso (Las 10 Partes del Taller)

### Parte 1: Documentación Inicial y Criterios de Aceptación
- Crear la documentación base en `docs/`:
  - `docs/01-requerimientos-y-alcance.md`: Reglas de negocio, actores, permisos y límites del MVP.
  - `docs/02-modelo-de-datos.md`: Entidades, enums, relaciones y restricciones.
  - `docs/03-contrato-api.md`: Especificación de endpoints y contrato uniforme de errores.

### Parte 2: Arquitectura Modular y Dependencias
- Instalar dependencias de producción y desarrollo:
  ```bash
  pnpm add @nestjs/config @nestjs/swagger @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer helmet @prisma/client
  pnpm add -D prisma @types/passport-jwt @types/bcrypt
  ```
- Configurar `ConfigModule` global (`.env`, `.env.example`).
- Modularizar la aplicación: `PrismaModule`, `AuthModule`, `HabitosModule`, `CommonModule`.

### Parte 3: Modelo Prisma, Migraciones y Persistencia PostgreSQL
- Inicializar Prisma: `npx prisma init`.
- Definir el esquema con enums `Rol`, `EstadoHabito`, `FrecuenciaHabito`.
- Configurar contenedor Docker de PostgreSQL para desarrollo local (`docker-compose.yml`).
- Ejecutar primera migración versionada: `npx prisma migrate dev --name init`.
- Crear script de Seed (`prisma/seed.ts`) para poblar un usuario con rol `ADMIN` inicial de forma segura, permitiendo probar la ruta administrativa.

### Parte 4: Autenticación, Hashing y JWT
- DTOs con validaciones estrictas:
  - `RegisterDto`: `nombre` (string, no vacío), `email` (IsEmail), `password` (mínimo 6-8 caracteres). *Nota: No expone ni acepta campo `rol`*.
  - `LoginDto`: `email` (IsEmail), `password` (string).
- Servicio de Hash: `bcrypt` con 10 rondas de salt.
- `AuthService`:
  - `register`: Verifica email único (lanza `ConflictException` 409 si ya existe), hashea password, crea usuario con rol `USUARIO`. Retorna usuario sin `passwordHash`.
  - `login`: Valida email y password (lanza `UnauthorizedException` 401 si falla). Genera `access_token` JWT con payload `{ sub, email, rol }`.
- `JwtStrategy` y `JwtAuthGuard`: Valida token Bearer y adjunta usuario autenticado a `req.user`.

### Parte 5: CRUD de Hábitos Conectado a la Base de Datos
- DTOs:
  - `CreateHabitoDto`:
    - `nombre`: string, longitud de 3 a 120 caracteres (`@Length(3, 120)`).
    - `descripcion`: string opcional, hasta 500 caracteres (`@MaxLength(500)`).
    - `estado`: enum `EstadoHabito` opcional (default `ACTIVO`).
    - `frecuencia`: enum `FrecuenciaHabito` obligatorio (`DIARIA`, `SEMANAL`, `MENSUAL`).
  - `UpdateHabitoDto`: `PartialType(CreateHabitoDto)` (actualiza solo campos enviados).
- `HabitosService`:
  - `create(dto, usuarioId)`: Asigna `usuarioId` del JWT.
  - `findAllByUser(usuarioId)`: Lista únicamente hábitos donde `usuarioId === usuarioId`.
  - `findOneByUser(id, usuarioId)`: Busca hábito; si no existe o no pertenece al usuario, retorna 404 (evita revelar información).
  - `updateByUser(id, usuarioId, dto)`: Actualiza solo si pertenece al usuario.
  - `removeByUser(id, usuarioId)`: Elimina solo si pertenece al usuario.

### Parte 6: Control de Acceso por Roles (RBAC) y Ruta Administrativa
- Decorador `@Roles(Rol.ADMIN)` y `@CurrentUser()`.
- `RolesGuard`: Compara los roles requeridos con `req.user.rol`. Si no coincide, lanza `ForbiddenException` (403).
- Endpoint `GET /habitos/admin/todos`:
  - Exclusivo para rol `ADMIN`.
  - Retorna todos los hábitos del sistema con información básica del usuario (id, nombre, email), garantizando **nunca** exponer `passwordHash`.

### Parte 7: Filtro Global de Errores y Seguridad
- Implementar `HttpExceptionFilter`:
  ```typescript
  {
    statusCode: number,
    timestamp: string, // ISO 8601
    path: string,
    message: string | string[]
  }
  ```
  - Mapeo de errores de Prisma (ej. código `P2002` a 409 Conflict, `P2025` a 404 Not Found).
  - Captura de errores inesperados con mensaje genérico `Internal server error` y código 500 (sin stack traces en producción).
- `ValidationPipe` global con `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- Configurar `helmet()` y CORS en `main.ts`.

### Parte 8: Swagger y Colección de Pruebas
- Configuración de Swagger en `/docs`:
  - Documentación detallada de endpoints, parámetros, esquemas de solicitud y respuesta.
  - Autenticación Bearer (`addBearerAuth()`).
  - Documentación de posibles códigos de respuesta (200, 201, 400, 401, 403, 404, 409).
- Crear archivo de pruebas HTTP (`ritmo-claro.http`) en la carpeta `docs/` o raíz para probar fácilmente con REST Client / Postman:
  - Registro de usuario normal (201).
  - Registro con email duplicado (409).
  - Login con credenciales válidas e inválidas (200 / 401).
  - Creación de hábitos asociados al token (201).
  - Intentar consultar/editar/eliminar hábito de otro usuario (404/403).
  - Acceso a `/habitos/admin/todos` con usuario normal (403).
  - Acceso a `/habitos/admin/todos` con admin (200).

### Parte 9: Dockerización y Repositorio Reproducible
- `Dockerfile` multi-stage:
  - Stage 1: Build y compilación NestJS con Prisma Client generado.
  - Stage 2: Runtime ligero Node 22 Alpine, copiando solo `dist/` y `node_modules` de producción.
- `.dockerignore` asegurando excluir `.env`, `node_modules`, `dist`, `.git`.
- `docker-compose.yml` para levantar PostgreSQL y la API en un comando.
- `.env.example` documentado con todas las variables necesarias.
- README.md completo con instrucciones claras de instalación, ejecución local y Docker.

### Parte 10: Despliegue en la Nube y URL Pública
- Guía documentada en `docs/05-guia-despliegue.md` para publicar en:
  - Base de datos: Neon PostgreSQL o Supabase (gratuitos y robustos).
  - Backend API: Render o Railway (conectado al repositorio GitHub).
  - Configuración del script `build` (`prisma generate && nest build`) y `start:prod` con ejecución de migraciones (`prisma migrate deploy && node dist/main`).

---

## 5. Plan de Verificación

### Pruebas Automatizadas y Compilación
```bash
# 1. Verificación de tipos y linting
pnpm run lint
pnpm run build

# 2. Pruebas unitarias y de integración
pnpm test
```

### Verificación Manual con Contrato de Casos
| Caso de Prueba | Método / Ruta | Rol / Header | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| Registro exitoso | `POST /auth/register` | Ninguno | 201 Created, rol `USUARIO` |
| Registro email duplicado | `POST /auth/register` | Ninguno | 409 Conflict, `{ statusCode, timestamp, path, message }` |
| Intento de inyectar rol ADMIN | `POST /auth/register` | Ninguno (body `{ rol: "ADMIN" }`) | 400 Bad Request (forbidNonWhitelisted) o forzado a `USUARIO` |
| Login exitoso | `POST /auth/login` | Ninguno | 200 OK con `{ access_token }` |
| Login credenciales erróneas | `POST /auth/login` | Ninguno | 401 Unauthorized |
| Crear hábito | `POST /habitos` | Bearer Token USUARIO | 201 Created con `usuarioId` del token |
| Listar hábitos propios | `GET /habitos` | Bearer Token USUARIO | 200 OK con array de hábitos propios |
| Modificar hábito propio | `PATCH /habitos/:id` | Bearer Token Dueño | 200 OK |
| Modificar hábito ajeno | `PATCH /habitos/:id` | Bearer Token Otro Usuario | 404 Not Found (o 403 Forbidden) |
| Ruta admin con usuario normal | `GET /habitos/admin/todos` | Bearer Token USUARIO | 403 Forbidden |
| Ruta admin con administrador | `GET /habitos/admin/todos` | Bearer Token ADMIN | 200 OK con todos los hábitos |
| Documentación Swagger | `GET /docs` | Ninguno | 200 OK Interfaz Swagger UI interactiva |

---

## 6. Documentación del Proyecto en `docs/`
Se creará y mantendrá la siguiente estructura dentro de `docs/`:
- `docs/01-requerimientos-y-alcance.md`: Definición formal del problema, actores y reglas no negociables.
- `docs/02-modelo-de-datos.md`: Diagrama entidad-relación y especificación Prisma.
- `docs/03-contrato-api.md`: Detalle de endpoints, payloads y contrato uniforme de errores.
- `docs/04-seguridad-y-permisos.md`: Explicación de la arquitectura de JWT, RBAC y propiedad de recursos.
- `docs/05-guia-despliegue.md`: Pasos para ejecución local (con Docker Compose) y despliegue público (Render/Neon).
- `docs/pruebas-api.http`: Colección ejecutable de peticiones con todos los casos de prueba.

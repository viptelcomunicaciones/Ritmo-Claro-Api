# 03. Contrato de la API y Especificación de Endpoints

## Ritmo Claro API — Contrato Funcional REST y Manejo de Errores

Este documento define el contrato público y protegido de la API, detallando las rutas, métodos HTTP, esquemas de entrada/salida y el formato uniforme de respuestas de error.

---

## 1. Resumen de Endpoints Obligatorios

| Método | Ruta | Acceso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | **Público** | Registra una cuenta nueva con rol obligatorio `USUARIO`. |
| `POST` | `/auth/login` | **Público** | Valida credenciales y emite token JWT con identidad y rol. |
| `POST` | `/habitos` | **Autenticado** | Crea un nuevo hábito asociado al usuario autenticado. |
| `GET` | `/habitos` | **Autenticado** | Lista únicamente los hábitos propios del usuario autenticado. |
| `GET` | `/habitos/:id` | **Autenticado (Dueño)** | Obtiene un hábito propio por su ID. |
| `PATCH` | `/habitos/:id` | **Autenticado (Dueño)** | Modifica parcialmente un hábito propio. |
| `DELETE`| `/habitos/:id` | **Autenticado (Dueño)** | Elimina un hábito propio. |
| `GET` | `/habitos/admin/todos` | **Rol ADMIN** | Lista todos los hábitos del sistema con información básica del propietario. |

---

## 2. Detalle de Endpoints

### 2.1 Módulo de Autenticación (`/auth`)

#### `POST /auth/register`
- **Descripción:** Crea un nuevo usuario. No acepta rol en el cuerpo (si se envía, es ignorado o rechazado). El servidor siempre asigna `USUARIO`.
- **Cuerpo de Solicitud (JSON):**
```json
{
  "nombre": "Ana Pérez",
  "email": "ana.perez@empresa.com",
  "password": "PasswordSegura123!"
}
```
- **Validaciones DTO:**
  - `nombre`: `string`, no vacío (`@IsNotEmpty()`, `@IsString()`).
  - `email`: `string`, formato de email válido (`@IsEmail()`).
  - `password`: `string`, longitud mínima 6 caracteres (`@MinLength(6)`).
- **Respuesta Exitosa (`201 Created`):**
```json
{
  "id": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
  "nombre": "Ana Pérez",
  "email": "ana.perez@empresa.com",
  "rol": "USUARIO",
  "creadoEn": "2026-09-29T15:30:00.000Z"
}
```
*(Nota: Jamás expone `passwordHash`)*.

---

#### `POST /auth/login`
- **Descripción:** Autentica al usuario contra su hash y devuelve el token Bearer JWT.
- **Cuerpo de Solicitud (JSON):**
```json
{
  "email": "ana.perez@empresa.com",
  "password": "PasswordSegura123!"
}
```
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Estructura del Payload decodificado del JWT:**
```json
{
  "sub": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
  "email": "ana.perez@empresa.com",
  "rol": "USUARIO",
  "iat": 1759160000,
  "exp": 1759246400
}
```

---

### 2.2 Módulo de Hábitos (`/habitos`)

> [!IMPORTANT]
> Todas las rutas de hábitos requieren el encabezado:
> `Authorization: Bearer <access_token>`

#### `POST /habitos`
- **Descripción:** Crea un hábito para el usuario del token. El `usuarioId` se inyecta desde el JWT y no desde el body.
- **Cuerpo de Solicitud (JSON):**
```json
{
  "nombre": "Caminata de 15 minutos",
  "descripcion": "Caminar al aire libre después del almuerzo",
  "estado": "ACTIVO",
  "frecuencia": "DIARIA"
}
```
- **Validaciones DTO:**
  - `nombre`: string, longitud entre 3 y 120 caracteres (`@Length(3, 120)`).
  - `descripcion`: string opcional, máximo 500 caracteres (`@IsOptional()`, `@MaxLength(500)`).
  - `estado`: enum opcional `EstadoHabito` (`ACTIVO`, `PAUSADO`, `ARCHIVADO`), valor por defecto `ACTIVO`.
  - `frecuencia`: enum obligatorio `FrecuenciaHabito` (`DIARIA`, `SEMANAL`, `MENSUAL`).
- **Respuesta Exitosa (`201 Created`):**
```json
{
  "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a",
  "nombre": "Caminata de 15 minutos",
  "descripcion": "Caminar al aire libre después del almuerzo",
  "estado": "ACTIVO",
  "frecuencia": "DIARIA",
  "usuarioId": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
  "creadoEn": "2026-09-29T15:35:00.000Z"
}
```

---

#### `GET /habitos`
- **Descripción:** Retorna una lista con únicamente los hábitos pertenecientes al usuario autenticado.
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a",
    "nombre": "Caminata de 15 minutos",
    "descripcion": "Caminar al aire libre después del almuerzo",
    "estado": "ACTIVO",
    "frecuencia": "DIARIA",
    "usuarioId": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
    "creadoEn": "2026-09-29T15:35:00.000Z"
  }
]
```

---

#### `GET /habitos/:id`
- **Descripción:** Obtiene el detalle de un hábito específico. Si el ID no existe o pertenece a otro usuario, responde `404 Not Found`.
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a",
  "nombre": "Caminata de 15 minutos",
  "descripcion": "Caminar al aire libre después del almuerzo",
  "estado": "ACTIVO",
  "frecuencia": "DIARIA",
  "usuarioId": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
  "creadoEn": "2026-09-29T15:35:00.000Z"
}
```

---

#### `PATCH /habitos/:id`
- **Descripción:** Actualiza parcialmente los campos enviados de un hábito propio.
- **Cuerpo de Solicitud (JSON - Campos opcionales):**
```json
{
  "estado": "PAUSADO",
  "descripcion": "Pausado temporalmente por viaje"
}
```
- **Respuesta Exitosa (`200 OK`):**
```json
{
  "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a",
  "nombre": "Caminata de 15 minutos",
  "descripcion": "Pausado temporalmente por viaje",
  "estado": "PAUSADO",
  "frecuencia": "DIARIA",
  "usuarioId": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
  "creadoEn": "2026-09-29T15:35:00.000Z"
}
```

---

#### `DELETE /habitos/:id`
- **Descripción:** Elimina definitivamente un hábito propio.
- **Respuesta Exitosa (`200 OK` o `204 No Content`):**
```json
{
  "mensaje": "Hábito eliminado exitosamente",
  "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a"
}
```

---

### 2.3 Módulo Administrativo (`/habitos/admin/todos`)

#### `GET /habitos/admin/todos`
- **Descripción:** Lista todos los hábitos del sistema. Exige rol `ADMIN`. Incluye datos básicos del propietario (`id`, `nombre`, `email`) sin datos sensibles.
- **Respuesta Exitosa (`200 OK`):**
```json
[
  {
    "id": "7b0b2e84-18c7-43df-97f2-a279df14d59a",
    "nombre": "Caminata de 15 minutos",
    "descripcion": "Caminar al aire libre después del almuerzo",
    "estado": "ACTIVO",
    "frecuencia": "DIARIA",
    "usuarioId": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
    "creadoEn": "2026-09-29T15:35:00.000Z",
    "usuario": {
      "id": "e4f8d22e-b6a1-432a-89a1-8d2a6a61b8f1",
      "nombre": "Ana Pérez",
      "email": "ana.perez@empresa.com"
    }
  }
]
```

---

## 3. Contrato Uniforme de Respuestas de Error

Toda respuesta con código HTTP de error ($\ge 400$) implementará rigurosamente la interfaz:

```typescript
interface ErrorResponse {
  statusCode: number;
  timestamp: string; // Formato ISO 8601
  path: string;       // Ruta de la petición
  message: string | string[]; // Descripción comprensible
}
```

### Catálogo de Códigos y Ejemplos de Error

#### 1. Código 400 Bad Request (Validación fallida)
Ocurre cuando el cuerpo enviado no cumple con los DTOs o contiene campos no permitidos:
```json
{
  "statusCode": 400,
  "timestamp": "2026-09-29T15:40:00.000Z",
  "path": "/habitos",
  "message": [
    "nombre must be longer than or equal to 3 characters",
    "frecuencia must be one of the following values: DIARIA, SEMANAL, MENSUAL"
  ]
}
```

#### 2. Código 401 Unauthorized (Falta de identidad)
Ocurre cuando no se envía el header `Authorization` o el token expiró/es inválido:
```json
{
  "statusCode": 401,
  "timestamp": "2026-09-29T15:41:00.000Z",
  "path": "/habitos",
  "message": "Token de autenticación inválido o no proporcionado"
}
```

#### 3. Código 403 Forbidden (Falta de privilegios)
Ocurre cuando un usuario con rol `USUARIO` intenta acceder a una ruta reservada para `ADMIN`:
```json
{
  "statusCode": 403,
  "timestamp": "2026-09-29T15:42:00.000Z",
  "path": "/habitos/admin/todos",
  "message": "No tiene los permisos requeridos para acceder a este recurso"
}
```

#### 4. Código 404 Not Found (Recurso inexistente o privado)
Ocurre cuando el ID de hábito no existe o pertenece a otro usuario (regla de privacidad):
```json
{
  "statusCode": 404,
  "timestamp": "2026-09-29T15:43:00.000Z",
  "path": "/habitos/7b0b2e84-18c7-43df-97f2-a279df14d59a",
  "message": "Hábito no encontrado"
}
```

#### 5. Código 409 Conflict (Conflicto de unicidad)
Ocurre cuando se intenta registrar un correo electrónico que ya existe:
```json
{
  "statusCode": 409,
  "timestamp": "2026-09-29T15:44:00.000Z",
  "path": "/auth/register",
  "message": "El correo electrónico ya se encuentra registrado"
}
```

#### 6. Código 500 Internal Server Error (Error inesperado)
Ocurre por fallos imprevistos en servidor. **Nunca expone stack traces ni detalles internos**:
```json
{
  "statusCode": 500,
  "timestamp": "2026-09-29T15:45:00.000Z",
  "path": "/habitos",
  "message": "Ocurrió un error interno en el servidor"
}
```

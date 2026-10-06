# Plan — Parte 4: Implementación de Registro y Login

## 1. Propósito y Alcance
Implementar el ciclo completo de autenticación e identidad para **Ritmo Claro API**:
- Creación de cuenta con hash seguro no reversible (`bcryptjs`, 10 rondas de salt).
- Rechazo de correos repetidos con código `409 Conflict`.
- Inicio de sesión con mensaje genérico contra enumeración de usuarios (`401 Unauthorized`).
- Emisión de token JWT firmado con reclamos `{ sub, email, rol }` y expiración estricta de 1 hora (`1h`).
- Estrategia Passport JWT (`JwtStrategy`), Guard de autenticación (`JwtAuthGuard`) y decorador de extracción de identidad (`UsuarioActual` / `CurrentUser`).
- Batería de pruebas que verifique los 6 escenarios de seguridad requeridos.

---

## 2. Diagnóstico del Estado Actual: Qué está hecho vs. Qué hace falta

| Elemento | Estado Actual | Qué hace falta en la Parte 4 |
| :--- | :--- | :--- |
| **Dependencias** | Instaladas: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs`. | Ninguna adicional. |
| **Variables de Entorno** | `JWT_SECRET` validado en `env.validation.ts` ($\ge 32$ caracteres); `.env` configurado. | Configurar `JWT_EXPIRES_IN="1h"` (o fallback a `1h`). |
| **Base de Datos** | Tabla `usuarios` migrada en PostgreSQL con campo `email` único y enum `Rol`. | Listo para almacenar usuarios reales. |
| **`RegisterDto` & `LoginDto`** | Esqueletos creados con validaciones básicas. | Ajustar validaciones finales (`@IsEmail`, `@MinLength(8)`, `@IsNotEmpty`, sin propiedad `rol`). |
| **`AuthService`** | Lanza `NotImplementedException('Pendiente: Parte 4')`. | Implementar lógica real: consulta de unicidad, hash con bcryptjs, creación en Prisma, comparación segura de passwords y firma de JWT con `JwtService`. |
| **`AuthModule`** | Módulo básico sin proveedores JWT. | Importar y configurar `PassportModule` y `JwtModule.registerAsync` con `ConfigService`. Registrar `JwtStrategy`. |
| **`JwtStrategy`** | No existe. | Crear `src/auth/jwt.strategy.ts` extrayendo el token de `Authorization: Bearer <token>` y validando la firma. |
| **`JwtAuthGuard`** | No existe. | Crear `src/auth/jwt-auth.guard.ts` extendiendo `AuthGuard('jwt')`. |
| **`UsuarioActual`** | No existe. | Crear `src/auth/usuario-actual.decorator.ts` para extraer `req.user` de forma desacoplada y tipada. |
| **Pruebas** | No existen pruebas de auth. | Implementar pruebas automatizadas y batería de peticiones para los 6 casos de verificación. |

---

## 3. Auditoría de Riesgos y Verificaciones Faltantes (Requisito 7)

Analizamos los vectores de ataque comunes en autenticación backend y cómo mitigamos cada uno:

### Riesgo 1: Enumeración de Usuarios en Login (User Enumeration)
- **Amenaza:** Si la API responde *"Usuario no encontrado"* cuando el email no existe y *"Contraseña incorrecta"* cuando sí existe, un atacante puede descubrir qué colaboradores tienen cuenta en Ritmo Claro.
- **Mitigación:** En `auth.service.ts`, tanto el fallo de búsqueda de usuario como la discordancia de contraseña arrojan exactamente la misma excepción:
  ```typescript
  throw new UnauthorizedException('Credenciales inválidas');
  ```

### Riesgo 2: Elevación de Privilegios en Registro (Privilege Escalation)
- **Amenaza:** Un usuario malintencionado envía `{"rol": "ADMIN"}` en el payload de registro.
- **Mitigación:**
  1. `RegisterDto` no declara el campo `rol`.
  2. `ValidationPipe` tiene activo `forbidNonWhitelisted: true`, rechazando con `400 Bad Request` cualquier intento de inyección de atributos ajenos.
  3. `AuthService.register()` fuerza explícitamente `rol: Rol.USUARIO` al crear el registro en Prisma.

### Riesgo 3: Fuga del Hash de Contraseña (Password Hash Leakage)
- **Amenaza:** Retornar la entidad completa de base de datos exponiendo `passwordHash` al cliente.
- **Mitigación:** En `register()`, desestructurar el resultado de Prisma o excluir `passwordHash`:
  ```typescript
  const { passwordHash, ...resultado } = usuarioCreado;
  return resultado;
  ```

### Riesgo 4: Ataques de Fuerza Bruta (Brute-Force)
- **Amenaza:** Intentos automatizados masivos de descifrado de credenciales.
- **Mitigación:** `@nestjs/throttler` ya está integrado globalmente y limita las peticiones por ventana de tiempo.

### Riesgo 5: Tokens Manipulados o Vencidos (Tampered / Expired Tokens)
- **Amenaza:** Reutilización de tokens expirados o alteración del payload para cambiar el `sub` o `rol`.
- **Mitigación:** `PassportStrategy(Strategy)` valida criptográficamente la firma con `JWT_SECRET` y el reclamo temporal `exp: 1h`. Si el token venció o fue adulterado, rechaza de inmediato con `401 Unauthorized`.

---

## 4. Cambios Propuestos

### Componente: Módulo de Autenticación (`src/auth`)

#### [MODIFY] `src/auth/dto/register.dto.ts`
Garantizar validaciones estrictas: `nombre` (no vacío, máx 100), `email` (formato de correo), `password` (mínimo 8 caracteres). Sin campo `rol`.

#### [MODIFY] `src/auth/dto/login.dto.ts`
Validación de `email` y `password` no vacíos.

#### [NEW] `src/auth/jwt.strategy.ts`
Implementar estrategia Passport:
- Extrae token Bearer de cabeceras.
- Carga `JWT_SECRET` desde `ConfigService`.
- Retorna `{ id: payload.sub, email: payload.email, rol: payload.rol }`.

#### [NEW] `src/auth/jwt-auth.guard.ts`
Guard que extiende `AuthGuard('jwt')`.

#### [NEW] `src/auth/usuario-actual.decorator.ts`
Decorador que extrae el usuario autenticado de `req.user`.

#### [MODIFY] `src/auth/auth.service.ts`
- Inyectar `PrismaService`, `JwtService` y `ConfigService`.
- Método `register`:
  - Verificar si el email existe; si sí $\rightarrow$ `ConflictException('El correo electrónico ya se encuentra registrado')` (409).
  - Generar hash con `bcryptjs.hash(dto.password, 10)`.
  - Crear usuario con `rol: Rol.USUARIO`.
  - Retornar usuario sanitizado (sin `passwordHash`).
- Método `login`:
  - Buscar usuario por email.
  - Si no existe $\rightarrow$ `UnauthorizedException('Credenciales inválidas')`.
  - Comparar con `bcryptjs.compare(dto.password, usuario.passwordHash)`.
  - Si no coincide $\rightarrow$ `UnauthorizedException('Credenciales inválidas')`.
  - Firmar JWT con payload `{ sub: usuario.id, email: usuario.email, rol: usuario.rol }` con tiempo de expiración `1h`.
  - Retornar `{ access_token }`.

#### [MODIFY] `src/auth/auth.module.ts`
Importar y configurar:
- `PassportModule.register({ defaultStrategy: 'jwt' })`
- `JwtModule.registerAsync(...)` con `ConfigService` inyectando `JWT_SECRET` y expiración.
- Proveer `AuthService` y `JwtStrategy`.
- Exportar `AuthService`, `JwtModule`, `PassportModule`.

#### [MODIFY] `src/auth/auth.controller.ts`
- Anotar `POST /auth/register` con código 201.
- Anotar `POST /auth/login` con `@HttpCode(HttpStatus.OK)`.
- Añadir ruta temporal de prueba o conectar `/habitos` para comprobar el Guard y el decorador.

---

## 5. Plan de Verificación

Se ejecutará una batería de pruebas automatizada y manual para cubrir los 6 escenarios requeridos:

| Caso | Acción | Entrada | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **1. Registro Válido** | `POST /auth/register` | Datos válidos | `201 Created`, rol `USUARIO`, **sin** `passwordHash`. |
| **2. Registro Duplicado** | `POST /auth/register` | Mismo email anterior | `409 Conflict`, mensaje descriptivo. |
| **3. Inyección de Rol** | `POST /auth/register` | Body con `"rol": "ADMIN"` | `400 Bad Request`, `property rol should not exist`. |
| **4. Login Válido** | `POST /auth/login` | Credenciales correctas | `200 OK`, entrega `{ access_token: "..." }`. |
| **5. Credenciales Inválidas** | `POST /auth/login` | Password incorrecto / Email inexistente | `401 Unauthorized`, mensaje genérico idéntico: *"Credenciales inválidas"*. |
| **6. Token Inválido o Ausente** | `GET /habitos` (o endpoint protegido) | Token alterado / sin token | `401 Unauthorized`. |

---

## 6. Verificación Manual por el Usuario
- Inspeccionar el payload del JWT emitido en [jwt.io](https://jwt.io) confirmando que contiene `{ sub, email, rol, iat, exp }` y que `exp - iat === 3600` (1 hora).
- Probar con el archivo `docs/pruebas-api.http` actualizado.

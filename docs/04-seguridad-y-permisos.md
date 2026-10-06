# 04. Arquitectura de Seguridad, Permisos y Autenticación

## Ritmo Claro API — Blindaje de Seguridad y Control de Acceso

Este documento detalla las capas de seguridad implementadas en **Ritmo Claro API** para garantizar la confidencialidad, integridad y disponibilidad del sistema de acuerdo con las reglas no negociables del cliente.

---

## 1. Principios de Seguridad Aplicados

1. **Principio de Mínimo Privilegio:** Cada usuario accede estrictamente a lo que requiere su rol (`USUARIO` solo ve sus hábitos; `ADMIN` puede consultar los de todos pero no modificar los de otros a menos que sea necesario).
2. **Defensa en Profundidad:** Múltiples filtros sucesivos:
   - Sanitización de headers (Helmet).
   - Control de orígenes (CORS).
   - Filtrado y validación de tipos (`ValidationPipe` estricto).
   - Verificación criptográfica de identidad (`JwtAuthGuard`).
   - Verificación de roles de usuario (`RolesGuard`).
   - Verificación de pertenencia de recurso en la capa de servicio.
3. **No Revelación de Secretos (Zero Leakage):**
   - Las contraseñas se almacenan como hashes irreversibles.
   - Los errores 500 no devuelven stack traces.
   - Las variables de entorno críticas nunca se commitean al repositorio.

---

## 2. Hashing de Contraseñas (Bcrypt)

- **Librería:** `bcryptjs` (JavaScript puro, sin compilación nativa; misma API `hash`/`compare`)
- **Factor de Costo (Salt Rounds):** `10`
- **Flujo de Registro:**
  ```typescript
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  ```
- **Flujo de Verificación en Login:**
  ```typescript
  const isMatch = await bcrypt.compare(passwordInput, usuario.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedException('Credenciales inválidas');
  }
  ```
- **Garantía:** Los objetos retornados al cliente en `/auth/register` o endpoints de consulta omiten explícitamente el campo `passwordHash`.

---

## 3. Autenticación Basada en JSON Web Tokens (JWT)

### Payload del Token
El token JWT firmado con algoritmo HMAC-SHA256 (`HS256`) contiene los reclamos de identidad mínimos necesarios:
```json
{
  "sub": "id-del-usuario-uuid",
  "email": "usuario@empresa.com",
  "rol": "USUARIO"
}
```

### Configuración del Módulo JWT
- Clave secreta: Inyectada mediante la variable de entorno `JWT_SECRET`.
- Tiempo de expiración: Configurado vía `JWT_EXPIRES_IN` (ej. `24h` o `7d`).

### Estrategia Passport JWT (`JwtStrategy`)
- Extrae el token desde el encabezado `Authorization: Bearer <token>`.
- Valida la firma contra `JWT_SECRET` y verifica que no haya expirado.
- Inyecta el usuario decodificado en el objeto `req.user`.

---

## 4. Control de Acceso Basado en Roles (RBAC)

Se implementa un sistema declarativo utilizando decoradores y Guards de NestJS:

### Decorador `@Roles(Rol.ADMIN)`
Asigna metadata a los endpoints que requieren roles específicos mediante `SetMetadata`.

### Guard `RolesGuard`
Evalúa la metadata del endpoint contra `req.user.rol`:
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException('No tiene los permisos requeridos para acceder a este recurso');
    }
    return true;
  }
}
```

---

## 5. Validación Estricta de Propiedad (Ownership)

Para evitar vulnerabilidades de tipo **BOLA / IDOR** (Broken Object Level Authorization):
1. **Extracción de Identidad Segura:**
   - Se crea el decorador `@CurrentUser('id')` para extraer el ID garantizado por el token JWT verificado.
   - En `POST /habitos`, el servicio ignora cualquier parámetro recibido en el body y vincula directamente:
     ```typescript
     usuarioId: currentUser.id
     ```
2. **Consultas Aisladas por Propietario:**
   - En `GET /habitos/:id`, `PATCH /habitos/:id` y `DELETE /habitos/:id`:
     ```typescript
     const habito = await this.prisma.habito.findFirst({
       where: { id, usuarioId }
     });
     if (!habito) {
       throw new NotFoundException('Hábito no encontrado');
     }
     ```
   - Si el hábito existe en la base de datos pero pertenece a otro usuario, se responde intencionalmente `404 Not Found` en lugar de `403 Forbidden` para no confirmar la existencia de recursos privados a terceros.

---

## 6. Blindaje de la Entrada y Tubería Global (ValidationPipe)

En `main.ts` se configura `ValidationPipe` con tres políticas estrictas:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,             // Elimina automáticamente cualquier propiedad no declarada en el DTO
    forbidNonWhitelisted: true,  // Lanza error 400 si el cliente envía propiedades extrañas (ej: enviar rol en register)
    transform: true,             // Transforma los payloads a instancias de sus respectivas clases DTO
  }),
);
```

---

## 7. Manejo Seguro de Secretos

- Archivo `.env`: Contiene las cadenas de conexión reales y claves criptográficas. **Jamás se versiona en Git**.
- Archivo `.gitignore`: Excluye explícitamente `.env`, `.env.*.local`.
- Archivo `.env.example`: Sirve como plantilla limpia para que cualquier evaluador configure sus variables sin exponer contraseñas reales:
  ```env
  PORT=3000
  NODE_ENV=development
  DATABASE_URL="postgresql://ritmo_user:ritmo_password@localhost:5432/ritmo_claro_db?schema=public"
  JWT_SECRET="ritmo_claro_super_secret_jwt_key_2026"
  JWT_EXPIRES_IN="24h"
  ```

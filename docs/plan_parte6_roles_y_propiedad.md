# Plan — Parte 6: Propiedad de Recursos, Roles (RBAC) y Ruta Administrativa

## 1. Propósito y Alcance
Separar y robustecer los dos pilares del control de acceso:
1. **Autenticación (Quién eres):** Garantizada por `JwtAuthGuard` con token firmado.
2. **Autorización (Qué puedes hacer):**
   - **Ownership (Propiedad de recursos):** El usuario solo puede consultar, editar o eliminar hábitos donde `habito.usuarioId === token.sub`. Si el recurso existe pero pertenece a otro usuario $\rightarrow$ `403 Forbidden`.
   - **RBAC (Control por Roles):** El endpoint global `GET /habitos/admin/todos` exige estrictamente el rol `ADMIN`. Si un participante con rol `USUARIO` lo invoca $\rightarrow$ `403 Forbidden`.
   - **Exclusión de Secretos en Consultas Globales:** La consulta administrativa devuelve los hábitos con datos del autor (`id`, `nombre`, `email`, `rol`), excluyendo **estrictamente** `passwordHash`.

---

## 2. Diagnóstico del Estado Actual: Qué está hecho vs. Qué hace falta

| Componente | Estado Actual | Qué hace falta en la Parte 6 |
| :--- | :--- | :--- |
| **`roles.decorator.ts`** | No existe. | Crear `@Roles(...roles: Rol[])` asignando metadata con `SetMetadata`. |
| **`roles.guard.ts`** | No existe. | Crear `RolesGuard` inyectando `Reflector`, leyendo los roles de la metadata y comparándolos con `request.user.rol`. Lanza `403 Forbidden` si no coincide. |
| **Ruta administrativa en Controller** | Declarada antes de `:id`, pero delega a método stub 501. | Proteger con `@UseGuards(RolesGuard)` y `@Roles(Rol.ADMIN)`. |
| **Servicio `habitos.service.ts`** | `findAll()` lanza `NotImplementedException`. En CRUD lanzaba 404 para todo no encontrado. | Implementar `findAll()` con `select` seguro del usuario (sin `passwordHash`). En `findOneByUser`, `update` y `remove`, diferenciar: recurso inexistente $\rightarrow$ `404 Not Found`; recurso ajeno $\rightarrow$ `403 Forbidden`. |
| **Pruebas de tres actores** | Probados Usuario A y B. | Crear prueba tripartita: Usuario A (crea), Usuario B (intenta acceder $\rightarrow$ 403), Usuario ADMIN (consulta global $\rightarrow$ 200 sin passwords). |

---

## 3. Matriz de Autorización y Permisos

| Endpoint | Rol / Condición | Código Esperado | Razón |
| :--- | :--- | :--- | :--- |
| `POST /habitos` | `USUARIO` o `ADMIN` | `201 Created` | Crea recurso vinculado al token. |
| `GET /habitos` | `USUARIO` o `ADMIN` | `200 OK` | Lista únicamente los propios. |
| `GET /habitos/:id` (propio) | Dueño del hábito | `200 OK` | Propiedad validada. |
| `GET /habitos/:id` (ajeno) | Otro usuario autenticado | `403 Forbidden` | Violación de propiedad (Ownership). |
| `GET /habitos/:id` (inexistente)| Cualquier usuario | `404 Not Found` | El recurso no existe en base de datos. |
| `PATCH /habitos/:id` (ajeno) | Otro usuario autenticado | `403 Forbidden` | Violación de propiedad (Ownership). |
| `DELETE /habitos/:id` (ajeno) | Otro usuario autenticado | `403 Forbidden` | Violación de propiedad (Ownership). |
| `GET /habitos/admin/todos` | `USUARIO` | `403 Forbidden` | Falta rol `ADMIN` (RBAC). |
| `GET /habitos/admin/todos` | `ADMIN` | `200 OK` | Autorizado. Hábitos + usuario (sin `passwordHash`). |
| Cualquier ruta protegida | Sin token / token alterado | `401 Unauthorized` | Falta identidad válida. |

---

## 4. Auditoría de Brechas de Autorización (Requisito 7)

Analizamos posibles huecos de seguridad y cómo quedan sellados:

1. **Hueco 1: Elevación de privilegios en tiempo de ejecución (Role Tampering):**
   - *Riesgo:* Si un usuario cambia su rol en la base de datos o envía un campo rol en el body, ¿obtiene acceso inmediato?
   - *Defensa:* El JWT está firmado criptográficamente con su rol original. Para que un cambio de rol surta efecto, el usuario **debe cerrar e iniciar sesión de nuevo** para emitir un nuevo token firmado con `rol: ADMIN`.
2. **Hueco 2: Colisión de Rutas Dinámicas vs. Estáticas en Express:**
   - *Riesgo:* Si `GET /habitos/admin/todos` se coloca después de `GET /habitos/:id`, Express evalúa `'admin'` como si fuera el parámetro `:id` (UUID).
   - *Defensa:* `GET admin/todos` está declarada en el controlador **antes** de `GET :id`.
3. **Hueco 3: Fuga de Credenciales en Inclusiones de Relación:**
   - *Riesgo:* Al hacer `include: { usuario: true }`, Prisma incluye por defecto todas las columnas de la tabla `usuarios`, incluido `passwordHash`.
   - *Defensa:* Usamos `include: { usuario: { select: { id: true, nombre: true, email: true, rol: true, creadoEn: true } } }` omitiendo explícitamente `passwordHash`.

---

## 5. Cambios Propuestos

### Componente: Decoradores y Guards de Roles (`src/auth`)
#### [NEW] `src/auth/roles.decorator.ts`
- Define `ROLES_KEY = 'roles'`.
- Decorador `@Roles(...roles: Rol[])`.

#### [NEW] `src/auth/roles.guard.ts`
- Implementa `CanActivate`.
- Inyecta `Reflector`. Si la ruta no tiene `@Roles`, permite el paso.
- Si tiene roles requeridos, valida `requiredRoles.includes(user.rol)`. Si no $\rightarrow$ `throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción')`.

---

### Componente: Lógica de Servicio (`src/habitos/habitos.service.ts`)
#### [MODIFY] `src/habitos/habitos.service.ts`
1. En `findOneByUser`:
   - Busca el hábito por `id` solo: `prisma.habito.findUnique({ where: { id } })`.
   - Si no existe $\rightarrow$ `throw new NotFoundException('Hábito no encontrado')` (404).
   - Si existe pero `habito.usuarioId !== usuarioId` $\rightarrow$ `throw new ForbiddenException('No tienes permiso para acceder a este hábito')` (403).
2. En `findAll()` (Ruta Admin):
   - Consulta `prisma.habito.findMany` ordenados por `creadoEn: 'desc'`.
   - Incluye `usuario` con `select` seguro excluyendo `passwordHash`.

---

### Componente: Controlador (`src/habitos/habitos.controller.ts`)
#### [MODIFY] `src/habitos/habitos.controller.ts`
- Anotar `GET admin/todos` con `@UseGuards(RolesGuard)` y `@Roles(Rol.ADMIN)`.

---

## 6. Plan de Verificación

Se creará una prueba automatizada con tres actores simultáneos:
1. **Usuario A (`USUARIO`)**: Crea el Hábito 1.
2. **Usuario B (`USUARIO`)**:
   - Intenta `GET /habitos/:idA` $\rightarrow$ Recibe `403 Forbidden`.
   - Intenta `PATCH /habitos/:idA` $\rightarrow$ Recibe `403 Forbidden`.
   - Intenta `DELETE /habitos/:idA` $\rightarrow$ Recibe `403 Forbidden`.
   - Intenta `GET /habitos/admin/todos` $\rightarrow$ Recibe `403 Forbidden`.
3. **Usuario ADMIN (`ADMIN`)**:
   - Invoca `GET /habitos/admin/todos` $\rightarrow$ Recibe `200 OK` con todos los hábitos.
   - Se comprueba por aserción que **ningún** objeto devuelto contiene la propiedad `passwordHash`.
4. **Petición sin Token**:
   - Invoca `GET /habitos/admin/todos` $\rightarrow$ Recibe `401 Unauthorized`.
5. **Petición con ID inexistente**:
   - Invoca `GET /habitos/uuid-inexistente` $\rightarrow$ Recibe `404 Not Found`.

---

## 7. Verificación Manual por el Usuario
- Actualizar `docs/ritmo-claro-api.postman_collection.json` con la carpeta administrativa `3. Administración (Rol ADMIN)`.
- Probar con token normal (403) y token admin (200).

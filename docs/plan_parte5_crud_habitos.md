# Plan — Parte 5: CRUD REST de Hábitos con Persistencia y Propiedad

## 1. Propósito y Alcance
Implementar el ciclo de vida completo de gestión de hábitos (Crear, Listar, Consultar, Actualizar y Eliminar) conectado físicamente a PostgreSQL con **Prisma 7**, garantizando una estricta separación de responsabilidades:
- **HTTP / Controlador:** Interpreta la petición, valida identidad desde el JWT (`@UsuarioActual('id')`), delega al servicio y retorna los códigos de estado HTTP correctos (`201`, `200`, `400`, `401`, `404`).
- **Reglas / Servicio:** Aplica lógica de negocio, valida pertenencia del recurso (`usuarioId === token.id`), previene acceso a datos ajenos y preserva campos no enviados en modificaciones parciales (`PATCH`).
- **Persistencia / Prisma:** Ejecuta consultas optimizadas sobre la base de datos relacional.

---

## 2. Diagnóstico del Estado Actual: Qué está hecho vs. Qué hace falta

| Componente | Estado Actual | Qué hace falta en la Parte 5 |
| :--- | :--- | :--- |
| **Controlador (`habitos.controller.ts`)** | Rutas declaradas con `@UseGuards(JwtAuthGuard)` y `@UsuarioActual('id')`. | Ajustar códigos HTTP explícitos (`@HttpCode(HttpStatus.CREATED)` en POST), validación de `id` UUID y responses. |
| **Servicio (`habitos.service.ts`)** | Métodos definidos pero lanzan `NotImplementedException('Pendiente: Parte 5')`. | **Implementar la lógica real con Prisma:** `create`, `findAllByUser`, `findOneByUser`, `update` (parcial), `remove`. |
| **DTOs (`create-habito.dto.ts`, `update-habito.dto.ts`)** | Definidos con class-validator (`@Length(3, 120)`, `@IsEnum`). | Asegurar que **no acepten** `id`, `usuarioId` ni `creadoEn`. Proveer alias `crear-habito.dto.ts` y `actualizar-habito.dto.ts` para cumplir con ambas nomenclaturas. |
| **Persistencia PostgreSQL** | Tabla `habitos` migrada en la Parte 3 con relación `1:N` a `usuarios` e índice en `usuarioId`. | Consumir el cliente Prisma mediante `PrismaService`. |
| **Pruebas** | Archivo `.http` tiene peticiones base. | Ejecutar batería automatizada de CRUD y persistencia; actualizar Postman Collection y `.http`. |

---

## 3. Matriz de Endpoints y Comportamiento Esperado

| Método y Ruta | Acceso | Responsabilidad del Controller | Responsabilidad del Service / Prisma | Código HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `POST /habitos` | Con sesión | Extrae `usuarioId` del JWT y recibe `CreateHabitoDto`. | Crea el hábito vinculándolo a `usuarioId`. Aplica defaults: `estado: ACTIVO`, `creadoEn: now()`. | `201 Created` |
| `GET /habitos` | Con sesión | Extrae `usuarioId` del JWT. | Consulta `prisma.habito.findMany({ where: { usuarioId } })`. Solo hábitos propios. | `200 OK` |
| `GET /habitos/:id` | Dueño | Recibe `id` (param) y `usuarioId` (JWT). | Busca por `where: { id, usuarioId }`. Si no existe o es ajeno $\rightarrow$ `404 Not Found`. | `200 OK` |
| `PATCH /habitos/:id` | Dueño | Recibe `id`, `usuarioId` y `UpdateHabitoDto`. | Verifica pertenencia (404 si es ajeno). Modifica **solo** los campos enviados en el body, conservando el resto intacto. | `200 OK` |
| `DELETE /habitos/:id` | Dueño | Recibe `id` y `usuarioId`. | Verifica pertenencia (404 si es ajeno). Ejecuta `prisma.habito.delete`. Retorna confirmación. | `200 OK` |

> [!IMPORTANT]
> **Regla de Privacidad en Errores 404:**  
> Si un usuario consulta, edita o elimina un hábito cuyo `id` existe en la base de datos pero pertenece a otro usuario, el servicio responde `404 Not Found` (*"Hábito no encontrado"*) y **nunca** `403 Forbidden`. Esto evita revelar la existencia de recursos privados a terceros.

---

## 4. Guía de Diagnóstico e Hipótesis por Capa (Requisito 7)

Cuando una prueba de integración falle, la causa debe clasificarse y aislarse por capa arquitectónica en este orden:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Capa HTTP / Routing / Controller                         │
│    - ¿El header Authorization Bearer está presente y bien   │
│      formateado? (Falla -> 401 Unauthorized)                │
│    - ¿El payload incluye campos prohibidos como usuarioId?  │
│      (Falla -> 400 Bad Request por forbidNonWhitelisted)    │
│    - ¿La ruta admin/todos está antes de :id para evitar ser │
│      capturada como un UUID?                                │
├─────────────────────────────────────────────────────────────┤
│ 2. Capa de Negocio / Service                                │
│    - ¿Se filtró estrictamente por usuarioId del JWT?        │
│    - ¿El hábito consultado pertenece a otro usuario?        │
│      (Falla -> 404 Not Found intencional)                   │
│    - ¿En PATCH se preservan los valores previos cuando el   │
│      campo no viene en el body?                             │
├─────────────────────────────────────────────────────────────┤
│ 3. Capa de Datos / Prisma / PostgreSQL                      │
│    - ¿El driver adapter PrismaPg tiene la conexión activa?  │
│    - ¿La clave foránea usuarioId existe en la tabla         │
│      usuarios al momento de crear? (Error P2003)            │
│    - ¿Los valores de enum coinciden con los tipos nativos   │
│      de PostgreSQL (ACTIVO, PAUSADO, ARCHIVADO)?            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Cambios Propuestos

### Componente: DTOs (`src/habitos/dto`)
#### [MODIFY] `src/habitos/dto/create-habito.dto.ts`
- Validaciones con mensajes claros: `nombre` (`Length(3, 120)`), `descripcion` (`MaxLength(500)` opcional), `estado` (`IsEnum(EstadoHabito)` opcional, default `ACTIVO`), `frecuencia` (`IsEnum(FrecuenciaHabito)` obligatorio).
- Sin `id`, `usuarioId` ni `creadoEn`.

#### [NEW] `src/habitos/dto/crear-habito.dto.ts`
- Exportación del DTO con el nombre en español solicitado en la rúbrica para interoperabilidad.

#### [NEW] `src/habitos/dto/actualizar-habito.dto.ts`
- Exportación del DTO de actualización parcial.

---

### Componente: Lógica del Servicio (`src/habitos/habitos.service.ts`)
#### [MODIFY] `src/habitos/habitos.service.ts`
Implementar métodos completos:
- `create(usuarioId, dto)`: inserta en Prisma vinculando `usuarioId`.
- `findAllByUser(usuarioId)`: lista ordenados por `creadoEn: 'desc'`.
- `findOneByUser(usuarioId, id)`: valida existencia y pertenencia. Lanza `NotFoundException` si no coincide.
- `update(usuarioId, id, dto)`: busca primero con `findOneByUser`; luego actualiza solo las propiedades presentes.
- `remove(usuarioId, id)`: valida propiedad y elimina de la base de datos.

---

### Componente: Controlador (`src/habitos/habitos.controller.ts`)
#### [MODIFY] `src/habitos/habitos.controller.ts`
- Anotaciones `@HttpCode(HttpStatus.CREATED)` en POST.
- Manejo estricto de parámetros. Cero lógica de base de datos; solo orquestación HTTP.

---

## 6. Plan de Verificación

Se ejecutará una batería de pruebas automatizada comprobando:
1. **Creación de hábito:** `POST /habitos` con Bearer token $\rightarrow$ `201 Created`, `estado: "ACTIVO"`, `usuarioId` asignado automáticamente.
2. **Rechazo de inyección de `usuarioId`:** `POST /habitos` enviando `{"usuarioId": "otro-id"}` $\rightarrow$ `400 Bad Request` (`property usuarioId should not exist`).
3. **Listado de hábitos propios:** `GET /habitos` $\rightarrow$ `200 OK`, retorna array con los hábitos del usuario.
4. **Consulta individual:** `GET /habitos/:id` $\rightarrow$ `200 OK` con datos del hábito propio.
5. **Intento de acceso a hábito ajeno:** `GET /habitos/:id` de un usuario B consultado por usuario A $\rightarrow$ `404 Not Found`.
6. **Actualización parcial (PATCH):** `PATCH /habitos/:id` enviando solo `{"estado": "PAUSADO"}` $\rightarrow$ `200 OK`, el `nombre` y `frecuencia` se mantienen idénticos, solo `estado` cambia a `PAUSADO`.
7. **Eliminación propia:** `DELETE /habitos/:id` $\rightarrow$ `200 OK`.
8. **Confirmación de eliminación:** Segundo `GET /habitos/:id` $\rightarrow$ `404 Not Found`.
9. **Actualizar la Colección Postman y archivo `.http`:** Agregar las pruebas completas del CRUD con variables dinámicas de hábito.

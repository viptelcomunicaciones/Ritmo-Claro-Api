# Plan de Implementación — Parte 7: Validaciones, Errores Estructurados y Seguridad Básica

## Propósito
Rechazar datos inválidos antes de que alcancen las capas de lógica o persistencia, y responder ante cualquier fallo con un contrato de error uniforme, seguro y predecible (`{ statusCode, timestamp, path, message }`), eliminando cualquier fuga de secretos (`passwordHash`, `JWT_SECRET`, `DATABASE_URL`) o stack traces al exterior.

---

## 1. Análisis del Estado Actual vs. Requisitos

| Requisito / Componente | Estado Actual | Acción a Realizar en Parte 7 |
| :--- | :--- | :--- |
| **Validación Registro (`RegisterDto`)** | Falta `@MinLength(2)` en `nombre`. Valida email y password (>=8). | Agregar `@MinLength(2)` y `@MaxLength(100)` con mensajes explícitos en español. |
| **Validación Hábitos (`CreateHabitoDto`)** | Valida `nombre` (3-120), `descripcion` (<=500), `frecuencia` y `estado` con enums de Prisma. | Verificado y compatible. Mantener coherencia con `UpdateHabitoDto` (`PartialType`). |
| **ValidationPipe Global** | Configurado en `src/main.ts` con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. | Mantener y documentar la decisión de seguridad: rechazar campos desconocidos con 400 (`forbidNonWhitelisted: true`). |
| **Filtro Global de Excepciones** | No existe; NestJS devuelve su formato por defecto (`{ statusCode, message, error }`). | Crear `src/common/filters/http-exception.filter.ts` con contrato unificado `{ statusCode, timestamp, path, message }`. |
| **Manejo de Error 500 Inesperado** | Sin filtro global; errores no capturados podrían exponer trazas internas. | Atrapar cualquier excepción no controlada (`@Catch()`), loguear el stack trace en servidor (`Logger.error`) y responder 500 genérico. |
| **Seguridad de Headers (Helmet)** | Presente en `src/main.ts` (`app.use(helmet())`). | Comprobar presencia de headers de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, etc.). |
| **Zero Leakage (Sin fugas de datos)** | `passwordHash` y variables de entorno protegidas. | Verificar que ninguna respuesta de error o éxito filtre `passwordHash`, `JWT_SECRET` ni `DATABASE_URL`. |

---

## 2. Contrato de Respuesta de Error Unificado

Todas las respuestas de error (4xx y 5xx) responderán con la siguiente estructura JSON idéntica:

```json
{
  "statusCode": 400,
  "timestamp": "2026-10-06T19:00:00.000Z",
  "path": "/habitos",
  "message": "El nombre debe tener entre 3 y 120 caracteres"
}
```

> [!NOTE]
> En errores de validación con múltiples campos infractores (`ValidationPipe`), `message` puede ser un array de cadenas descriptivas o un mensaje consolidado, manteniendo siempre las 4 claves del contrato (`statusCode`, `timestamp`, `path`, `message`).

---

## 3. Matriz de Códigos HTTP según Tipo de Evento

| Código HTTP | Categoría | Causa Raíz | Ejemplo en Ritmo Claro API |
| :---: | :--- | :--- | :--- |
| **400 Bad Request** | Error de Validación / Entrada | El payload del cliente viola las reglas del DTO, formato JSON inválido o contiene campos no permitidos. | Nombre de hábito de 1 letra, frecuencia inexistente (`DIARIAZ`), o inclusión de campo `rol` en registro. |
| **401 Unauthorized** | Error de Autenticación | Identidad no provista, token expirado, firma JWT inválida o credenciales incorrectas. | Login con contraseña incorrecta, ausencia del header `Authorization: Bearer <token>`, o token alterado. |
| **403 Forbidden** | Error de Autorización / RBAC / Propiedad | Identidad reconocida pero sin privilegios suficientes sobre el recurso solicitado. | Usuario A intenta consultar/editar/borrar hábito de Usuario B; o Usuario estándar intenta `GET /habitos/admin/todos`. |
| **404 Not Found** | Recurso Inexistente | La ruta solicitada o el identificador del recurso no existe en el sistema. | `GET /habitos/uuid-inexistente` o ruta inexistente `/ruta-falsa`. |
| **409 Conflict** | Regla de Negocio / Unicidad | Conflicto con el estado actual de persistencia (integridad de negocio). | Registro con un email que ya está en uso en la base de datos. |
| **500 Internal Server Error** | Fallo Inesperado | Error imprevisto en tiempo de ejecución (caída de BD, fallo de sistema). | Error en base de datos; el detalle va a logs y el cliente recibe mensaje genérico. |

---

## 4. Plan de Trabajo Paso a Paso

### Paso 1: Actualizar `RegisterDto`
- Reforzar `@MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })` y `@MaxLength(100)` en `src/auth/dto/register.dto.ts`.
- Verificar validaciones en `CreateHabitoDto` y `UpdateHabitoDto`.

### Paso 2: Crear el Filtro Global de Excepciones
- Crear `src/common/filters/http-exception.filter.ts`.
- Decorar con `@Catch()` para interceptar tanto `HttpException` como errores imprevistos (`Error`).
- Formatear la salida estricta: `{ statusCode, timestamp, path, message }`.
- Registrar en consola mediante `Logger` los errores 500 para auditoría y diagnóstico interno sin exponer nada al cliente.

### Paso 3: Registrar el Filtro en `src/main.ts`
- Inyectar `app.useGlobalFilters(new HttpExceptionFilter())`.
- Confirmar orden de middleware y pipes: `helmet()`, `useGlobalPipes()`, `useGlobalFilters()`.

### Paso 4: Suite de Verificación Automatizada de Errores
- Crear script temporal de verificación que pruebe y valide:
  1. **400**: Nombre corto (`"a"`), email inválido (`"no-es-correo"`), enum inventado (`"INVENTADO"`), propiedad adicional rechazada (`"rol": "ADMIN"`).
  2. **401**: Credenciales inválidas en login, token ausente, token alterado.
  3. **403**: Intento de acceso a hábito ajeno entre Usuario A y B; intento de usuario estándar a endpoint admin.
  4. **404**: Consulta a hábito inexistente.
  5. **409**: Intento de registro con email duplicado.
  6. **500**: Endpoint/prueba de fallo interno controlado que verifique respuesta genérica y ausencia de trazas o secretos.
  7. **Headers Helmet**: Presencia de cabeceras de seguridad.
  8. **Zero Leakage**: Confirmar que ninguna respuesta expone `passwordHash`, `JWT_SECRET` ni `DATABASE_URL`.

### Paso 5: Documentación y Versionado Git
- Actualizar `docs/ritmo-claro-api.postman_collection.json` y `docs/pruebas-api.http` con la carpeta dedicada a pruebas de errores y seguridad.
- Guardar copia del plan en `docs/plan_parte7_errores_y_seguridad.md`.
- Realizar commit convencional: `feat: implement global exception filter for uniform error contract and basic security`.

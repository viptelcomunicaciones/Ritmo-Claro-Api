# 01. Requerimientos y Alcance del Producto

## Ritmo Claro API — Gestión de Hábitos Empresariales
**Curso:** JavaScript AI Backend Developer  
**Evaluación:** Taller evaluativo — Módulos 2 y 3  
**Producto Final:** API RESTful profesional construida con Node.js, NestJS, PostgreSQL y Prisma, protegida con JWT, documentada en Swagger (`/docs`), contenedorizada con Docker y desplegada públicamente.

---

## 1. El Caso Empresarial

### La Organización
**Ritmo Claro** es una empresa de bienestar que acompaña a equipos remotos en la adopción y seguimiento de hábitos saludables (lectura, pausas activas, hidratación, meditación). Cuenta con:
- **Participantes:** Personas de equipos remotos que definen y gestionan sus hábitos diarios o periódicos.
- **Equipo de Soporte/Administración:** Especialistas que supervisan el estado global y brindan acompañamiento cuando un usuario solicita ayuda.

### El Problema Detectado
Actualmente los hábitos se registran en formularios desestructurados y hojas de cálculo compartidas:
1. **Registros duplicados:** Cuentas y correos duplicados por falta de unicidad en la persistencia.
2. **Inconsistencia de datos:** Nombres y estados escritos con variaciones tipográficas sin validación de esquemas.
3. **Riesgos críticos de privacidad y seguridad:** Cualquier persona con acceso al archivo puede ver, modificar o borrar información sensible o hábitos de otros colaboradores.
4. **Falta de portabilidad:** El backend previo solo corría en el entorno local del desarrollador.
5. **Ausencia de contrato de integración:** Sin documentación técnica estándar para permitir a futuro el consumo desde aplicaciones web o móviles.

---

## 2. Personas Usuarias y Matriz de Permisos

| Actor | Rol en Sistema | Necesidad Principal | Permisos en el MVP |
| :--- | :--- | :--- | :--- |
| **Visitante** | *Sin autenticar* | Crear una cuenta o iniciar sesión. | • `POST /auth/register`<br>• `POST /auth/login` |
| **Participante** | `USUARIO` | Organizar sus propios hábitos con total privacidad y autonomía. | • Crear sus propios hábitos<br>• Listar únicamente sus hábitos<br>• Consultar, editar y eliminar solo sus hábitos |
| **Soporte** | `ADMIN` | Atender casos, supervisar métricas generales y estado de bienestar. | • Todo lo que hace un usuario con sus hábitos<br>• **Consultar la lista global de hábitos de todos los usuarios** (`GET /habitos/admin/todos`) |

---

## 3. Alcance del Producto Mínimo Viable (MVP)

### Funcionalidades Obligatorias
- [x] **Registro seguro:** Con email único, contraseña almacenada como hash bcrypt y rol `USUARIO` asignado obligatoriamente por el servidor.
- [x] **Login robusto:** Emite token JWT firmado con identidad (`sub`), email, rol y tiempo de expiración.
- [x] **CRUD completo de hábitos:** Estrictamente aislado a la persona autenticada.
- [x] **Consulta administrativa global:** Protegida con guard de rol `ADMIN` para listar todos los hábitos sin exponer credenciales ni hashes de contraseñas.
- [x] **Validación de entradas y manejo uniforme de errores:** Respuestas consistentes con `{ statusCode, timestamp, path, message }`.
- [x] **Documentación Swagger OpenAPI:** Accesible en la ruta `/docs` con soporte para autenticación Bearer Token.
- [x] **Persistencia en PostgreSQL con Prisma:** Modelado relacional, claves foráneas en cascada y migraciones versionadas.
- [x] **Despliegue y Reproducibilidad:** Repositorio limpio en GitHub sin secretos, imagen `Dockerfile` multi-stage y URL pública funcional.

### Límites Estrictos del MVP (Fuera de Alcance)
Para mantener el foco en la arquitectura, persistencia, seguridad y publicación del backend:
- ❌ **No frontend:** No se construye interfaz gráfica, app móvil ni panel visual web.
- ❌ **No funciones avanzadas de hábitos:** No se implementan recordatorios, rachas, marcación diaria, estadísticas ni notificaciones.
- ❌ **No pasarelas ni IA:** No se incluyen pagos, integraciones con IA ni recuperación de contraseña por correo.
- ❌ **No elevación pública de roles:** No existe endpoint público para elegir o cambiar de rol. El rol `ADMIN` se asigna exclusivamente por inicialización controlada (seed) o gestión interna de base de datos.
- ❌ **No sobreingeniería:** No se agregan entidades o librerías que no respondan a un requisito evaluable del contrato.

---

## 4. Reglas No Negociables del Contrato

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REGLAS NO NEGOCIABLES                           │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Identidad      │ usuarioId se obtiene SIEMPRE del payload del JWT;  │
│                   │ nunca se acepta ni se confía en el body.           │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Privacidad     │ Un usuario no puede consultar, editar ni eliminar  │
│                   │ hábitos de otra persona (404 Not Found preventivo).│
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Privilegio     │ El registro siempre asigna USUARIO. La ruta global │
│                   │ /habitos/admin/todos exige estrictamente ADMIN.    │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Secretos       │ DATABASE_URL y JWT_SECRET NUNCA se suben al repo.  │
│                   │ Se gestionan por .env y se documentan en .example. │
├───────────────────┼────────────────────────────────────────────────────┤
│ 5. Errores Limpios│ La respuesta externa JAMÁS expone contraseñas,     │
│                   │ secretos de entorno, stack traces o fallos SQL.    │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 5. Criterios de Aceptación (Checklist de Verificación)

- [ ] **CA-01:** Petición `POST /auth/register` con `{ nombre, email, password }` devuelve `201 Created` y los datos del usuario con rol `USUARIO`, excluyendo `passwordHash`.
- [ ] **CA-02:** Petición `POST /auth/register` intentando enviar `{ rol: "ADMIN" }` es rechazada (`400 Bad Request` por `forbidNonWhitelisted`) o ignora el campo forzando `USUARIO`.
- [ ] **CA-03:** Petición `POST /auth/register` con email existente devuelve `409 Conflict` con mensaje claro.
- [ ] **CA-04:** Petición `POST /auth/login` con credenciales válidas retorna `200 OK` con `{ access_token: "..." }`. Con credenciales inválidas retorna `401 Unauthorized`.
- [ ] **CA-05:** Petición `POST /habitos` sin header `Authorization: Bearer <token>` devuelve `401 Unauthorized`. Con token válido crea el hábito asignado al usuario del token (`201 Created`).
- [ ] **CA-06:** Petición `GET /habitos` lista únicamente los hábitos creados por el usuario que firmó el token.
- [ ] **CA-07:** Peticiones `GET /habitos/:id`, `PATCH /habitos/:id` y `DELETE /habitos/:id` operan solo sobre recursos del usuario autenticado; si el hábito pertenece a otro usuario devuelven `404 Not Found` (o `403 Forbidden`).
- [ ] **CA-08:** Petición `GET /habitos/admin/todos` realizada por un usuario con rol `USUARIO` retorna `403 Forbidden`.
- [ ] **CA-09:** Petición `GET /habitos/admin/todos` realizada por un usuario con rol `ADMIN` retorna `200 OK` con la lista de hábitos y datos básicos del propietario (sin `passwordHash`).
- [ ] **CA-10:** Cualquier error en la API produce una respuesta JSON en formato estándar `{ statusCode, timestamp, path, message }`.
- [ ] **CA-11:** La documentación Swagger carga en `/docs` y permite autorizar con Bearer token para probar los endpoints.

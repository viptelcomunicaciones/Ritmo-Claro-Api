# Plan — Parte 3: Modelo Prisma, Migración PostgreSQL y Persistencia

## 1. Objetivo y Alcance
Persistir las entidades `Usuario` y `Habito` en la base de datos PostgreSQL local utilizando **Prisma 7**. Aplicar la migración versionada `modelo_inicial`, regenerar el cliente en `src/generated/prisma`, verificar la integridad referencial, unicidad de correos y persistencia tras reinicio del servidor, y registrar el commit con el historial de migraciones.

---

## 2. Auditoría Técnica de Arquitectura de Datos

Antes de ejecutar las migraciones, realizamos la auditoría requerida por el taller:

### 2.1 Claves Primarias y Foráneas
| Entidad | Tabla en BD | Clave Primaria (PK) | Clave Foránea (FK) | Acción Referencial |
| :--- | :--- | :--- | :--- | :--- |
| **Usuario** | `usuarios` | `id` (UUID v4) | *Ninguna* | — |
| **Habito** | `habitos` | `id` (UUID v4) | `usuarioId` $\rightarrow$ `usuarios(id)` | `ON DELETE CASCADE` |

> [!NOTE]
> - **PK UUID v4:** Previene ataques BOLA/IDOR por enumeración secuencial en los endpoints REST `/habitos/:id`.
> - **FK con Cascada:** Si un usuario elimina su cuenta, sus hábitos asociados se depuran atómicamente sin dejar registros huérfanos.
> - **Índice en FK (`@@index([usuarioId])`):** Optimiza las consultas filtradas por propiedad exigidas por la regla de privacidad.

### 2.2 Cardinalidades, Defaults y Restricciones
- **Cardinalidad:** Relación **1 a N** (Uno a Muchos). Un `Usuario` puede tener cero o múltiples `Habitos`. Cada `Habito` pertenece obligatoriamente a exactamente un `Usuario`.
- **Defaults:**
  - `Usuario.rol`: `USUARIO` (cumple la regla de no asignación pública de admin).
  - `Usuario.creadoEn`: `now()`.
  - `Habito.estado`: `ACTIVO`.
  - `Habito.creadoEn`: `now()`.
- **Restricciones de Dominio:**
  - `Usuario.email`: Restricción única (`@unique`). Previene cuentas duplicadas.
  - `Habito.nombre`: `VARCHAR(120)` (límite de 3 a 120 caracteres en DTO y persistencia).
  - `Habito.descripcion`: `VARCHAR(500)` opcional.
  - **Enums PostgreSQL nativos:**
    - `Rol`: `USUARIO`, `ADMIN`.
    - `EstadoHabito`: `ACTIVO`, `PAUSADO`, `ARCHIVADO`.
    - `FrecuenciaHabito`: `DIARIA`, `SEMANAL`, `MENSUAL`.

### 2.3 Diferencia Fundamental: `prisma migrate` vs `prisma generate`
| Concepto | Qué hace | Dónde actúa | Cuándo se usa |
| :--- | :--- | :--- | :--- |
| **`prisma migrate dev`** | Compara el `schema.prisma` con la base de datos real, genera un script SQL versionado en `prisma/migrations/` y ejecuta ese SQL en PostgreSQL alterando las tablas físicas. | En el motor **PostgreSQL** (físico/DDL). | Al cambiar la estructura del modelo de datos. |
| **`prisma generate`** | Lee el `schema.prisma` y compila las definiciones de tipos TypeScript, clases y métodos del ORM en `src/generated/prisma`. | En el código **TypeScript local** (in-memory / archivos TS). | Para que el código NestJS tenga autocompletado y tipos actualizados. |

---

## 3. Diagrama Entidad-Relación

```mermaid
erDiagram
    usuarios ||--o{ habitos : "1 a N (onDelete: CASCADE)"
    
    usuarios {
        UUID id PK
        VARCHAR nombre
        VARCHAR email UK
        VARCHAR passwordHash
        Rol rol "default: USUARIO"
        TIMESTAMP creadoEn "default: now()"
    }

    habitos {
        UUID id PK
        VARCHAR_120 nombre
        VARCHAR_500 descripcion "NULL"
        EstadoHabito estado "default: ACTIVO"
        FrecuenciaHabito frecuencia
        UUID usuarioId FK "Indexado"
        TIMESTAMP creadoEn "default: now()"
    }
```

---

## 4. Cambios Propuestos

### Componente: Variables de Entorno
#### [MODIFY] `.env`
Configurar la URL de conexión proporcionada por el usuario (fuera del control de versiones):
```env
DATABASE_URL="postgresql://postgres:viptel3562@localhost:5432/ritmo-claro"
```

#### [MODIFY] `.env.example`
Asegurar que la plantilla documente el formato estándar sin exponer contraseñas reales:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_bd?schema=public"
JWT_SECRET="cambia-esto-por-un-secreto-de-al-menos-32-caracteres"
JWT_EXPIRES_IN="1d"
```

---

### Componente: Esquema y Configuración Prisma 7
#### [VERIFY / MODIFY] `prisma/schema.prisma`
Ejecutar `npx prisma format` para asegurar la correcta indentación y sintaxis.

#### [NEW] `prisma/migrations/YYYYMMDD_modelo_inicial/migration.sql`
Generado automáticamente por `npx prisma migrate dev --name modelo_inicial`.

---

## 5. Pasos de Ejecución

1. **Configuración de `.env`**:
   - Actualizar `DATABASE_URL` con `postgresql://postgres:viptel3562@localhost:5432/ritmo-claro`.
   - Comprobar que `.gitignore` mantenga ignorado `.env`.
2. **Formateo del Esquema**:
   - Ejecutar `pnpm exec prisma format`.
3. **Creación y Ejecución de la Migración**:
   - Ejecutar `pnpm exec prisma migrate dev --name modelo_inicial`.
   - Si la base de datos `ritmo-claro` no existe en PostgreSQL, Prisma preguntará si desea crearla y la creará automáticamente.
4. **Regeneración del Cliente**:
   - Ejecutar `pnpm exec prisma generate` hacia `src/generated/prisma`.
5. **Prueba de Persistencia e Integridad (Script de Verificación)**:
   - Crear y ejecutar un test controlado de inserción:
     - Crear un usuario de prueba.
     - Crear un hábito asociado mediante su relación.
     - Intentar crear un segundo usuario con el mismo email (debe fallar con error P2002 de unicidad).
     - Detener la conexión y volver a consultar para comprobar que los datos permanecen intactos tras desconectar/reiniciar.
     - Limpiar los registros de prueba.
6. **Compilación y Verificación de Tipos**:
   - Ejecutar `pnpm run build` para garantizar que la app compila al 100%.
7. **Commit en Git**:
   - Commitear el `schema.prisma`, `prisma.config.ts`, `.env.example` y la carpeta `prisma/migrations/`.

---

## 6. Verificación Manual por el Usuario
- Se proporcionará el comando para abrir **Prisma Studio** (`pnpm exec prisma studio`) y explorar visualmente las tablas `usuarios` y `habitos` en `http://localhost:5555`.
- Inspeccionar el archivo generado en `prisma/migrations/*_modelo_inicial/migration.sql` para validar la creación de tablas, índices y foreign keys con `ON DELETE CASCADE`.

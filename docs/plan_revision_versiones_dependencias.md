# Plan de Revisión: Matriz de Dependencias, Compatibilidad y Seguridad

## 1. Diagnóstico y Objetivo
Las versiones iniciales provenían de un ejemplo previo. El objetivo de este plan es auditar cada librería del stack contra la documentación oficial de **NestJS 11**, **Prisma 7**, **Node.js 22 LTS** y las políticas de seguridad de **npm/pnpm audit**, asegurando que el proyecto cuente con la combinación más estable, segura y compatible para un entorno educativo y de producción.

---

## 2. Auditoría Técnica de Compatibilidad

### 2.1 Ecosistema Core de NestJS (v11)
| Paquete | Versión Actual | Compatibilidad Nest 11 | Evaluación y Recomendación |
| :--- | :--- | :--- | :--- |
| `@nestjs/common` | `^11.0.1` (resuelto: `11.2.6`) | **Nativa (v11)** | **Óptima.** Versión oficial de NestJS 11 sobre Node 22. |
| `@nestjs/core` | `^11.0.1` (resuelto: `11.2.6`) | **Nativa (v11)** | **Óptima.** |
| `@nestjs/platform-express` | `^11.0.1` (resuelto: `11.2.6`) | **Nativa (v11)** | **Óptima.** Servidor Express subyacente. |
| `@nestjs/config` | `^12.0.1` | **Compatible** | Sus `peerDependencies` declaran `'@nestjs/common': '^11.0.0 \|\| ^12.0.0'`. Compila y valida correctamente con `class-validator`. **Recomendación: Mantener.** |
| `@nestjs/jwt` | `^11.0.2` | **Nativa (v11)** | Declarada específicamente para Nest 11 (`^11.0.0`). **Óptima.** |
| `@nestjs/passport` | `^11.0.5` | **Nativa (v11)** | Declarada específicamente para Nest 11 (`^11.0.0`). **Óptima.** |
| `@nestjs/swagger` | `^11.4.7` | **Nativa (v11)** | Exige `@nestjs/core: ^11.0.1`. Es la versión correcta para Nest 11 (la v12 exige Nest 12). **Óptima.** |
| `@nestjs/throttler` | `^6.7.1` | **Nativa (v11)** | Soporta Nest 11 (`^11.0.0`). Protege contra ataques de fuerza bruta en login. **Óptima.** |

---

### 2.2 Persistencia con Prisma 7 y PostgreSQL
| Paquete | Versión Actual | Compatibilidad | Evaluación y Recomendación |
| :--- | :--- | :--- | :--- |
| `prisma` (dev) | `7.10.0` | **Prisma 7 Oficial** | Última versión estable de Prisma 7. Evita la v8 (`8.0.0-rc.20`) que es pre-lanzamiento experimental. **Óptima para la clase.** |
| `@prisma/client` | `7.10.0` | **Prisma 7 Oficial** | Alineada exactamente con la CLI. |
| `@prisma/adapter-pg` | `7.10.0` | **Prisma 7 Oficial** | En Prisma 7 el driver adapter es obligatorio. Alineada con 7.10.0. |
| `pg` | `^8.23.1` | **Node 22 LTS** | Driver PostgreSQL estándar para Node.js. |
| `@types/pg` | `^8.23.1` | **TypeScript 5.x** | Tipado completo para TypeScript. |

---

### 2.3 Seguridad y Utilidades
| Paquete | Versión Actual | Evaluación Técnica y de Seguridad |
| :--- | :--- | :--- |
| `bcryptjs` | `^3.0.3` | **Excelente elección educativa:** Escrito en JS puro (sin bindings C++ nativos con node-gyp). No falla en Windows ni en imágenes Docker Alpine (`node:22-alpine`). Misma API asíncrona (`hash`, `compare`) que bcrypt nativo. |
| `passport` | `^0.7.0` | Versión estándar madura compatible con `@nestjs/passport@11`. |
| `passport-jwt` | `^4.0.1` | Estándar de la industria para autenticación Bearer Token. |
| `@types/passport-jwt`| `^4.0.1` | Tipado para Passport JWT. |
| `helmet` | `^8.3.0` | Configura 15 cabeceras HTTP de seguridad (HSTS, X-Content-Type-Options, etc.). |
| `class-validator` | `^0.15.1` | Validación declarativa de DTOs con decoradores. |
| `class-transformer` | `^0.5.1` | Transformación de objetos JSON planos a instancias DTO. |
| `dotenv` | `^18.0.5` | Permite a `prisma.config.ts` cargar `.env` para la CLI de Prisma 7. |

---

## 3. Hallazgos de Seguridad (`pnpm audit`) y Mitigación

El análisis de `pnpm audit` detectó vulnerabilidades en **dependencias transitivas** (sub-dependencias de paquetes de desarrollo y generadores):
1. **`js-yaml` (vulnerable en 5.0.0 - 5.4.0):** Utilizado por `@nestjs/swagger`. Parche disponible: `>= 5.4.1`.
2. **`mysql2` (vulnerable en <= 3.23.0):** Traído internamente por el motor multifuente de Prisma CLI (aunque usemos PostgreSQL). Parche disponible: `>= 3.23.1`.

### Solución Limpia y Segura: `pnpm.overrides`
Podemos indicarle a `pnpm` en `package.json` que fuerce las versiones seguras de esas sub-dependencias sin romper nada:

```json
"pnpm": {
  "overrides": {
    "js-yaml": "^5.4.3",
    "mysql2": "^3.24.5"
  }
}
```

---

## 4. Cambios Propuestos

### [MODIFY] `package.json`
Agregar la sección `pnpm.overrides` para asegurar 0 vulnerabilidades en `pnpm audit`:
```json
  "pnpm": {
    "overrides": {
      "js-yaml": "^5.4.3",
      "mysql2": "^3.24.5"
    }
  }
```

---

## 5. Plan de Verificación

```bash
# 1. Aplicar overrides y actualizar lockfile
pnpm install

# 2. Auditar vulnerabilidades en producción
pnpm audit --prod

# 3. Validar formateo y compilación limpia de TypeScript
pnpm exec prisma format
pnpm run build

# 4. Comprobar que no hay advertencias de peer dependencies
pnpm ls --depth 0
```

---

## 6. Conclusión de la Auditoría
La combinación actual:
- **NestJS 11** + **Prisma 7.10** + **bcryptjs 3** + **pg 8** + **TypeScript 5.9** es la más moderna, estable y compatible para este proyecto.
- No se requiere degradar ni cambiar las librerías principales; únicamente añadir los dos parches transitivos (`overrides`) para garantizar una calificación de seguridad limpia.

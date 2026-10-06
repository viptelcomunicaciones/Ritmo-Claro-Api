import { SetMetadata } from '@nestjs/common';
import { Rol } from '../generated/prisma/enums';

export const ROLES_KEY = 'roles';

/**
 * Decorador para definir los roles requeridos en un endpoint o controlador.
 * Ejemplo: `@Roles(Rol.ADMIN)`
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

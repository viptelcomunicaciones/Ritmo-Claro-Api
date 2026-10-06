import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from './jwt.strategy';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Decorador para extraer el usuario autenticado (o una propiedad específica)
 * inyectado por JwtAuthGuard en `request.user`.
 *
 * Ejemplos de uso:
 * - `@UsuarioActual() user: AuthenticatedUser`
 * - `@UsuarioActual('id') usuarioId: string`
 */
export const UsuarioActual = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);

export const CurrentUser = UsuarioActual;

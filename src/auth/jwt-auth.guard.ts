import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface TokenErrorInfo {
  name?: string;
  message?: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(
    err: Error | null,
    user: TUser | false,
    info: TokenErrorInfo | undefined,
  ): TUser {
    if (err || !user) {
      const message =
        info?.name === 'TokenExpiredError'
          ? 'El token de autenticación ha expirado'
          : 'Token de autenticación inválido o no proporcionado';
      throw new UnauthorizedException(message);
    }
    return user;
  }
}

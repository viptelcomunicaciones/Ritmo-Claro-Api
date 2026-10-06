import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Rol } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';

export interface UserResponse {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  creadoEn: Date;
}

export interface LoginResponse {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra un nuevo usuario con rol forzado 'USUARIO'.
   * Rechaza correos duplicados con 409 Conflict.
   * Guarda únicamente el hash bcryptjs y nunca expone passwordHash en la respuesta.
   */
  async register(dto: RegisterDto): Promise<UserResponse> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'El correo electrónico ya se encuentra registrado',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const nuevoUsuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        rol: Rol.USUARIO, // El servidor siempre asigna USUARIO
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        creadoEn: true,
      },
    });

    return nuevoUsuario;
  }

  /**
   * Valida credenciales de acceso y entrega un JWT firmado de 1 hora.
   * MITIGACIÓN DE ENUMERACIÓN: Mensaje genérico 'Credenciales inválidas'
   * tanto si el email no existe como si la contraseña es errónea.
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const emailNormalizado = dto.email.toLowerCase().trim();
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );

    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
    };
  }
}

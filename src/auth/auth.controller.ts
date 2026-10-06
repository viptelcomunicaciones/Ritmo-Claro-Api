import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description:
      'Crea una cuenta con rol forzado USUARIO. Rechaza email duplicado (409) y nunca expone passwordHash en la respuesta.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente (sin passwordHash)',
    schema: {
      example: {
        id: '254f0106-d83e-4a66-a721-8f07eae4cd2f',
        nombre: 'Carlos Mendoza',
        email: 'carlos.mendoza@empresa.com',
        rol: 'USUARIO',
        creadoEn: '2026-10-06T19:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Error de validación (nombre < 2 chars, email inválido, password < 8 o campo rol enviado)',
  })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico ya se encuentra registrado',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión y obtener JWT',
    description:
      'Valida credenciales y emite un token JWT con vigencia de 1 hora. Respuesta genérica ante credenciales erróneas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso, devuelve access_token',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación en credenciales de entrada',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas (mensaje genérico)',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

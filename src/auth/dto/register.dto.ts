import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO para el registro de nuevos usuarios.
 * REGLA DE PRIVILEGIO: Intencionalmente no incluye el campo `rol`.
 * El servidor siempre asignará el rol 'USUARIO'.
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Nombre completo de la persona',
    example: 'Carlos Mendoza',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre!: string;

  @ApiProperty({
    description: 'Correo electrónico único para identificación',
    example: 'carlos.mendoza@empresa.com',
  })
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @ApiProperty({
    description:
      'Contraseña en texto plano para autenticación (mínimo 8 caracteres)',
    example: 'Password123!',
    minLength: 8,
    maxLength: 72,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
  password!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para inicio de sesión.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico registrado',
    example: 'carlos.mendoza@empresa.com',
  })
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña de la cuenta',
    example: 'Password123!',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}

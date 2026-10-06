import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para inicio de sesión.
 */
export class LoginDto {
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}

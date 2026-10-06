import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Intencionalmente sin campo `rol`: con forbidNonWhitelisted, enviarlo da 400. */
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite práctico de bcrypt
  password!: string;
}

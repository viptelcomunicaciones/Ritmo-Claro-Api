import { EstadoHabito, FrecuenciaHabito } from '../../generated/prisma/enums';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** No incluye `usuarioId`: la identidad sale siempre del JWT. */
export class CreateHabitoDto {
  @IsString()
  @Length(3, 120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsEnum(EstadoHabito)
  estado?: EstadoHabito;

  @IsEnum(FrecuenciaHabito)
  frecuencia!: FrecuenciaHabito;
}

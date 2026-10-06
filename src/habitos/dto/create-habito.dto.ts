import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoHabito, FrecuenciaHabito } from '../../generated/prisma/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * DTO para la creación de hábitos.
 * REGLAS NO NEGOCIABLES:
 * - No incluye `id`, `usuarioId` ni `creadoEn`.
 * - La identidad del propietario se inyecta siempre desde el JWT.
 */
export class CreateHabitoDto {
  @ApiProperty({
    description: 'Nombre del hábito personal',
    example: 'Meditación Matutina',
    minLength: 3,
    maxLength: 120,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(3, 120, { message: 'El nombre debe tener entre 3 y 120 caracteres' })
  nombre!: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada o notas para el seguimiento',
    example: '15 minutos de atención plena antes de comenzar la jornada',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(500, {
    message: 'La descripción no puede exceder 500 caracteres',
  })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Estado inicial del hábito en el sistema',
    enum: EstadoHabito,
    default: EstadoHabito.ACTIVO,
    example: EstadoHabito.ACTIVO,
  })
  @IsOptional()
  @IsEnum(EstadoHabito, {
    message: 'El estado debe ser uno de: ACTIVO, PAUSADO, ARCHIVADO',
  })
  estado?: EstadoHabito;

  @ApiProperty({
    description: 'Frecuencia con la que se debe cumplir el hábito',
    enum: FrecuenciaHabito,
    example: FrecuenciaHabito.DIARIA,
  })
  @IsEnum(FrecuenciaHabito, {
    message: 'La frecuencia debe ser una de: DIARIA, SEMANAL, MENSUAL',
  })
  @IsNotEmpty({ message: 'La frecuencia es obligatoria' })
  frecuencia!: FrecuenciaHabito;
}

import { PartialType } from '@nestjs/swagger';
import { CreateHabitoDto } from './create-habito.dto';

/** PartialType hace opcionales todos los campos: PATCH actualiza solo lo enviado. */
export class UpdateHabitoDto extends PartialType(CreateHabitoDto) {}

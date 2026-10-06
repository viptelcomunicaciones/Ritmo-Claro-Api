import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';
import { HabitosService } from './habitos.service';

/**
 * Esqueleto (Parte 2). Pendiente: JwtAuthGuard + @CurrentUser (Parte 4/5) y
 * RolesGuard en la ruta admin (Parte 6). Por ahora `usuarioId` es un marcador.
 * `admin/todos` se declara ANTES de `:id` para que no sea capturada como un id.
 */
const USUARIO_ID_PENDIENTE = 'pendiente-jwt';

@Controller('habitos')
export class HabitosController {
  constructor(private readonly habitosService: HabitosService) {}

  @Get('admin/todos')
  findAll() {
    return this.habitosService.findAll();
  }

  @Post()
  create(@Body() dto: CreateHabitoDto) {
    return this.habitosService.create(USUARIO_ID_PENDIENTE, dto);
  }

  @Get()
  findAllByUser() {
    return this.habitosService.findAllByUser(USUARIO_ID_PENDIENTE);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.habitosService.findOneByUser(USUARIO_ID_PENDIENTE, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHabitoDto) {
    return this.habitosService.update(USUARIO_ID_PENDIENTE, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.habitosService.remove(USUARIO_ID_PENDIENTE, id);
  }
}

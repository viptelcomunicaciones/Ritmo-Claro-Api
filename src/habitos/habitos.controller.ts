import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';
import { HabitosService } from './habitos.service';

/**
 * Controlador de Hábitos.
 * REGLA DE IDENTIDAD: usuarioId se extrae exclusivamente del JWT mediante @UsuarioActual('id').
 * REGLA DE PRIVACIDAD: Las operaciones quedan protegidas por JwtAuthGuard.
 */
@Controller('habitos')
@UseGuards(JwtAuthGuard)
export class HabitosController {
  constructor(private readonly habitosService: HabitosService) {}

  @Get('admin/todos')
  findAll() {
    return this.habitosService.findAll();
  }

  @Post()
  create(@UsuarioActual('id') usuarioId: string, @Body() dto: CreateHabitoDto) {
    return this.habitosService.create(usuarioId, dto);
  }

  @Get()
  findAllByUser(@UsuarioActual('id') usuarioId: string) {
    return this.habitosService.findAllByUser(usuarioId);
  }

  @Get(':id')
  findOne(@UsuarioActual('id') usuarioId: string, @Param('id') id: string) {
    return this.habitosService.findOneByUser(usuarioId, id);
  }

  @Patch(':id')
  update(
    @UsuarioActual('id') usuarioId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHabitoDto,
  ) {
    return this.habitosService.update(usuarioId, id, dto);
  }

  @Delete(':id')
  remove(@UsuarioActual('id') usuarioId: string, @Param('id') id: string) {
    return this.habitosService.remove(usuarioId, id);
  }
}

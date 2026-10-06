import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import { Rol } from '../generated/prisma/enums';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';
import { HabitosService } from './habitos.service';

/**
 * Controlador REST de Hábitos.
 * - Toda la ruta está protegida por JwtAuthGuard (Identidad).
 * - GET admin/todos está protegido adicionalmente por RolesGuard y @Roles(Rol.ADMIN) (RBAC).
 * - GET admin/todos está declarada ANTES de :id para evitar colisiones de enrutamiento.
 */
@Controller('habitos')
@UseGuards(JwtAuthGuard)
export class HabitosController {
  constructor(private readonly habitosService: HabitosService) {}

  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  findAll() {
    return this.habitosService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  @HttpCode(HttpStatus.OK)
  remove(@UsuarioActual('id') usuarioId: string, @Param('id') id: string) {
    return this.habitosService.remove(usuarioId, id);
  }
}

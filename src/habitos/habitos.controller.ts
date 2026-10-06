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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiTags('habitos')
@ApiBearerAuth('JWT-auth')
@Controller('habitos')
@UseGuards(JwtAuthGuard)
export class HabitosController {
  constructor(private readonly habitosService: HabitosService) {}

  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiOperation({
    summary: 'Listar todos los hábitos del sistema (Solo ADMIN)',
    description:
      'Endpoint administrativo global protegido por RBAC. Excluye datos confidenciales como contraseñas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado global de todos los hábitos y sus autores',
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT ausente, expirado o manipulado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado: requiere rol ADMIN',
  })
  findAll() {
    return this.habitosService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo hábito personal',
    description:
      'Crea un hábito asociándolo automáticamente a la identidad del token JWT. No acepta usuarioId en el body.',
  })
  @ApiResponse({
    status: 201,
    description: 'Hábito creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Error de validación (nombre inválido, longitud fuera de rango, enum inexistente)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente',
  })
  create(@UsuarioActual('id') usuarioId: string, @Body() dto: CreateHabitoDto) {
    return this.habitosService.create(usuarioId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar hábitos propios',
    description:
      'Obtiene únicamente los hábitos pertenecientes al usuario autenticado según su JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de hábitos propios',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente',
  })
  findAllByUser(@UsuarioActual('id') usuarioId: string) {
    return this.habitosService.findAllByUser(usuarioId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar hábito por ID (Ownership)',
    description:
      'Retorna el hábito si pertenece al usuario autenticado. Responde 403 si pertenece a otro usuario y 404 si no existe.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del hábito',
    example: '254f0106-d83e-4a66-a721-8f07eae4cd2f',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del hábito propio',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para acceder a este hábito (Ownership)',
  })
  @ApiResponse({
    status: 404,
    description: 'Hábito no encontrado',
  })
  findOne(@UsuarioActual('id') usuarioId: string, @Param('id') id: string) {
    return this.habitosService.findOneByUser(usuarioId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar parcialmente un hábito propio (Ownership)',
    description:
      'Actualiza únicamente los campos presentes en el payload sin sobreescribir los no enviados.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del hábito a modificar',
    example: '254f0106-d83e-4a66-a721-8f07eae4cd2f',
  })
  @ApiResponse({
    status: 200,
    description: 'Hábito actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Error de validación en campos modificados',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para modificar este hábito (Ownership)',
  })
  @ApiResponse({
    status: 404,
    description: 'Hábito no encontrado',
  })
  update(
    @UsuarioActual('id') usuarioId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHabitoDto,
  ) {
    return this.habitosService.update(usuarioId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar un hábito propio (Ownership)',
    description:
      'Elimina el hábito si pertenece al usuario autenticado previa comprobación de propiedad.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del hábito a eliminar',
    example: '254f0106-d83e-4a66-a721-8f07eae4cd2f',
  })
  @ApiResponse({
    status: 200,
    description: 'Hábito eliminado exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado / Token ausente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para eliminar este hábito (Ownership)',
  })
  @ApiResponse({
    status: 404,
    description: 'Hábito no encontrado',
  })
  remove(@UsuarioActual('id') usuarioId: string, @Param('id') id: string) {
    return this.habitosService.remove(usuarioId, id);
  }
}

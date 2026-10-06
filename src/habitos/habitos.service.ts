import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { EstadoHabito } from '../generated/prisma/enums';
import { Habito } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';

export interface DeleteHabitoResponse {
  mensaje: string;
  id: string;
}

@Injectable()
export class HabitosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un nuevo hábito asociado estrictamente al usuario autenticado.
   * Aplica valor inicial 'ACTIVO' si no se especifica.
   */
  async create(usuarioId: string, dto: CreateHabitoDto): Promise<Habito> {
    return this.prisma.habito.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() ?? null,
        estado: dto.estado ?? EstadoHabito.ACTIVO,
        frecuencia: dto.frecuencia,
        usuarioId,
      },
    });
  }

  /**
   * Lista únicamente los hábitos pertenecientes al usuario autenticado.
   */
  async findAllByUser(usuarioId: string): Promise<Habito[]> {
    return this.prisma.habito.findMany({
      where: { usuarioId },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Obtiene un hábito por su ID verificando propiedad.
   * Si no existe o pertenece a otro usuario, responde 404 (regla de privacidad).
   */
  async findOneByUser(usuarioId: string, id: string): Promise<Habito> {
    const habito = await this.prisma.habito.findFirst({
      where: {
        id,
        usuarioId,
      },
    });

    if (!habito) {
      throw new NotFoundException('Hábito no encontrado');
    }

    return habito;
  }

  /**
   * Actualiza parcialmente un hábito propio.
   * Conserva intactos todos los campos que no fueron enviados en el DTO.
   */
  async update(
    usuarioId: string,
    id: string,
    dto: UpdateHabitoDto,
  ): Promise<Habito> {
    // Validar existencia y propiedad
    await this.findOneByUser(usuarioId, id);

    const dataToUpdate: {
      nombre?: string;
      descripcion?: string | null;
      estado?: EstadoHabito;
      frecuencia?: CreateHabitoDto['frecuencia'];
    } = {};

    if (dto.nombre !== undefined) {
      dataToUpdate.nombre = dto.nombre.trim();
    }
    if (dto.descripcion !== undefined) {
      dataToUpdate.descripcion = dto.descripcion
        ? dto.descripcion.trim()
        : null;
    }
    if (dto.estado !== undefined) {
      dataToUpdate.estado = dto.estado;
    }
    if (dto.frecuencia !== undefined) {
      dataToUpdate.frecuencia = dto.frecuencia;
    }

    return this.prisma.habito.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  /**
   * Elimina un hábito propio tras verificar propiedad.
   */
  async remove(usuarioId: string, id: string): Promise<DeleteHabitoResponse> {
    // Validar existencia y propiedad
    await this.findOneByUser(usuarioId, id);

    await this.prisma.habito.delete({
      where: { id },
    });

    return {
      mensaje: 'Hábito eliminado exitosamente',
      id,
    };
  }

  /**
   * Consulta administrativa global (se implementa en Parte 6).
   */
  findAll() {
    throw new NotImplementedException('Pendiente: Parte 6');
  }
}

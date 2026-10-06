/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: se elimina al implementar la lógica */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';

/**
 * Esqueleto (Parte 2). Todos los métodos recibirán `usuarioId` (del JWT)
 * y filtrarán por él para cumplir la regla de Privacidad (Partes 5 y 6).
 */
@Injectable()
export class HabitosService {
  constructor(private readonly prisma: PrismaService) {}

  create(_usuarioId: string, _dto: CreateHabitoDto) {
    throw new NotImplementedException('Pendiente: Parte 5');
  }

  findAllByUser(_usuarioId: string) {
    throw new NotImplementedException('Pendiente: Parte 5');
  }

  findOneByUser(_usuarioId: string, _id: string) {
    throw new NotImplementedException('Pendiente: Parte 5');
  }

  update(_usuarioId: string, _id: string, _dto: UpdateHabitoDto) {
    throw new NotImplementedException('Pendiente: Parte 5');
  }

  remove(_usuarioId: string, _id: string) {
    throw new NotImplementedException('Pendiente: Parte 5');
  }

  findAll() {
    throw new NotImplementedException('Pendiente: Parte 6');
  }
}

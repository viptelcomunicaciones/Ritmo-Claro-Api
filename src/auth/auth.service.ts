/* eslint-disable @typescript-eslint/no-unused-vars -- esqueleto: se elimina al implementar la lógica */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Esqueleto (Parte 2). Hash bcryptjs, unicidad de email y firma JWT llegan en la Parte 4. */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  register(_dto: RegisterDto) {
    throw new NotImplementedException('Pendiente: Parte 4');
  }

  login(_dto: LoginDto) {
    throw new NotImplementedException('Pendiente: Parte 4');
  }
}

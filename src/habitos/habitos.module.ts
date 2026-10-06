import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HabitosController } from './habitos.controller';
import { HabitosService } from './habitos.service';

@Module({
  imports: [AuthModule],
  controllers: [HabitosController],
  providers: [HabitosService],
})
export class HabitosModule {}

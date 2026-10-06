import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Punto único de configuración global (pipes, seguridad, filtros, ciclo de vida, Swagger). */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ritmo Claro API')
    .setDescription(
      'API RESTful para gestión de hábitos personales, control de propiedad (Ownership), RBAC y autenticación JWT.',
    )
    .setVersion('1.0.0')
    .addTag(
      'auth',
      'Operaciones de autenticación, registro y emisión de tokens',
    )
    .addTag(
      'habitos',
      'Gestión de hábitos, control de propiedad y consultas administrativas',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Introduce el token JWT (sin el prefijo Bearer)',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();

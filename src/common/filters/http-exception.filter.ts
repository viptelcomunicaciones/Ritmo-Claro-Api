import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Contrato uniforme de respuesta para todos los errores HTTP de la API.
 */
export interface ErrorResponseContract {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

/**
 * Filtro global de excepciones que:
 * 1. Normaliza todas las respuestas de error al contrato { statusCode, timestamp, path, message }.
 * 2. Oculta detalles internos, stack traces y datos sensibles en errores 500.
 * 3. Registra diagnósticos en logs del servidor para fallos inesperados.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocurrió un error interno en el servidor';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          `[500 InternalServerError] en ${request.method} ${request.url}: ${exception.message}`,
          exception.stack,
        );
        message = 'Ocurrió un error interno en el servidor';
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        message = (exceptionResponse as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else {
      // Fallo inesperado fuera del ciclo de excepciones HTTP (ej. crash de BD o error de sintaxis en runtime)
      const errorDetails =
        exception instanceof Error
          ? `${exception.message}\n${exception.stack}`
          : JSON.stringify(exception);

      this.logger.error(
        `[500 Inesperado] Error no controlado en ${request.method} ${request.url}: ${errorDetails}`,
      );

      message = 'Ocurrió un error interno en el servidor';
    }

    const errorPayload: ErrorResponseContract = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    response.status(statusCode).json(errorPayload);
  }
}

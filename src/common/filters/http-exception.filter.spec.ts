import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorResponseContract,
  HttpExceptionFilter,
} from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let capturedStatus: number | undefined;
  let capturedJson: ErrorResponseContract | undefined;
  let mockRequest: {
    url: string;
    method: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    capturedStatus = undefined;
    capturedJson = undefined;

    const mockResponse = {
      status(code: number) {
        capturedStatus = code;
        return mockResponse;
      },
      json(payload: ErrorResponseContract) {
        capturedJson = payload;
        return mockResponse;
      },
    };

    mockRequest = {
      url: '/test-endpoint',
      method: 'POST',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('debe estructurar errores conocidos 400 con { statusCode, timestamp, path, message }', () => {
    const exception = new HttpException(
      {
        message: ['El nombre es obligatorio'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(capturedStatus).toBe(400);
    expect(capturedJson).toEqual(
      expect.objectContaining({
        statusCode: 400,
        path: '/test-endpoint',
        message: ['El nombre es obligatorio'],
      }),
    );
  });

  it('debe estructurar errores 404 con { statusCode, timestamp, path, message }', () => {
    const exception = new HttpException(
      'Hábito no encontrado',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockHost);

    expect(capturedStatus).toBe(404);
    expect(capturedJson).toEqual(
      expect.objectContaining({
        statusCode: 404,
        path: '/test-endpoint',
        message: 'Hábito no encontrado',
      }),
    );
  });

  it('debe estructurar errores 409 con { statusCode, timestamp, path, message }', () => {
    const exception = new HttpException(
      'El correo electrónico ya se encuentra registrado',
      HttpStatus.CONFLICT,
    );

    filter.catch(exception, mockHost);

    expect(capturedStatus).toBe(409);
    expect(capturedJson).toEqual(
      expect.objectContaining({
        statusCode: 409,
        path: '/test-endpoint',
        message: 'El correo electrónico ya se encuentra registrado',
      }),
    );
  });

  it('debe responder 500 genérico y ocultar stack traces o secretos ante fallo inesperado', () => {
    const unexpectedError = new Error(
      'Database connection failed with secret DATABASE_URL=secret',
    );

    filter.catch(unexpectedError, mockHost);

    expect(capturedStatus).toBe(500);
    expect(capturedJson).toBeDefined();

    if (capturedJson) {
      expect(capturedJson.statusCode).toBe(500);
      expect(capturedJson.message).toBe(
        'Ocurrió un error interno en el servidor',
      );
      expect(capturedJson.path).toBe('/test-endpoint');
      expect(capturedJson.timestamp).toBeDefined();

      // Verificación de no fuga de información (Zero Leakage)
      const jsonString = JSON.stringify(capturedJson);
      expect(jsonString).not.toContain('Database connection failed');
      expect(jsonString).not.toContain('DATABASE_URL');
      expect(jsonString).not.toContain('secret');
      expect(jsonString).not.toContain('stack');
    }
  });
});

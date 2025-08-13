import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Código de error específi
      switch (exception.code) {
        case 'P2002': //
          return response.status(409).json({
            statusCode: 409,
            message: 'Valor duplicado: ' + exception.meta?.target,
            error: 'Conflict',
          });

        case 'P2001': // Registro no encontrado
          return response.status(404).json({
            statusCode: 404,
            message: 'Registro no encontrado',
            error: 'Not Found',
          });

        default:
          return response.status(400).json({
            statusCode: 400,
            message: 'Error de solicitud: ' + exception.message,
            error: 'Bad Request',
          });
      }
    }

    // Fallback para otros errores
    return response.status(500).json({
      statusCode: 500,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    });
  }
}

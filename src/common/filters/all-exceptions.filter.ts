import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AppLoggerService } from '../services/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
        error = exception.name;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;

        // Handle validation errors specially
        if (
          exception instanceof BadRequestException &&
          Array.isArray(body.message)
        ) {
          message = 'Validation failed';
          error = 'Validation Error';
          validationErrors = body.message as string[];
        } else if (typeof body.message === 'string') {
          message = body.message;
          error = (body.error as string) || exception.name;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(', ');
          error = (body.error as string) || exception.name;
        } else {
          message = exception.message;
          error = exception.name;
        }
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.handleDatabaseError(exception);
      error = 'Database Error';
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse: Record<string, unknown> = {
      success: false,
      message,
      error,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Add validation errors if present
    if (validationErrors) {
      errorResponse.validationErrors = validationErrors;
    }

    // Log error with proper context
    this.logger.logError(
      exception instanceof Error ? exception : new Error(String(exception)),
      'AllExceptionsFilter',
      {
        method: request.method,
        url: request.url,
        statusCode: status,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      },
    );

    response.status(status).json(errorResponse);
  }

  private handleDatabaseError(error: QueryFailedError): string {
    // Handle common database errors
    if ('code' in error) {
      const dbError = error as QueryFailedError & { code: string };
      switch (dbError.code) {
        case 'ER_DUP_ENTRY':
        case '23505':
          return 'Duplicate entry - this record already exists';
        case 'ER_NO_REFERENCED_ROW_2':
        case '23503':
          return 'Referenced record does not exist';
        default:
          return 'Database operation failed';
      }
    }
    return 'Database operation failed';
  }
}

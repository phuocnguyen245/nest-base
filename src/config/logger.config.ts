import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';

export const loggerConfig = (
  configService: ConfigService,
): WinstonModuleOptions => {
  const environment = configService.get<string>('NODE_ENV', 'development');
  const logLevel = configService.get<string>('LOG_LEVEL', 'info');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.simple(),
      ),
      level: logLevel,
    }),
  ];

  // File transports for production
  if (environment === 'production') {
    transports.push(
      // Error log file
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 5242880,
        maxFiles: 5,
      }),
    );
  }

  return {
    level: logLevel,
    transports,
    exitOnError: false,
  };
};

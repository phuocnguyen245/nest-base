import { Module } from '@nestjs/common';
import { AppLoggerService } from './services/logger.service';

@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class CommonModule {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { InitialDataSeed } from './seeds/initial-data.seed';

async function runSeeder() {
  console.log('🌱 Starting database seeding...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // Wait for database connection
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    console.log('📊 Database connected successfully');

    // Run seeds
    const initialDataSeed = new InitialDataSeed();
    await initialDataSeed.run(dataSource);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  runSeeder();
}

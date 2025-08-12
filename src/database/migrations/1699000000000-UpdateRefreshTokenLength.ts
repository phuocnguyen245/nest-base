import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateRefreshTokenLength1699000000000
  implements MigrationInterface
{
  name = 'UpdateRefreshTokenLength1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update refreshToken column from VARCHAR(255) to TEXT
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`refreshToken\` TEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to VARCHAR(255) - may cause data loss if tokens are longer
    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY COLUMN \`refreshToken\` VARCHAR(255) NULL`,
    );
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1755079687264 implements MigrationInterface {
    name = 'Migration1755079687264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`agents\` (\`id\` varchar(36) NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL, \`code\` varchar(50) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`parentAgentId\` varchar(255) NULL, \`userId\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`level\` int NOT NULL DEFAULT '0', \`path\` text NULL, UNIQUE INDEX \`IDX_89c5cab1ed7e6cd1d44317f8b6\` (\`code\`), UNIQUE INDEX \`REL_f535e5b2c0f0dc7b7fc656ebc9\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`userType\` enum ('agent', 'user') NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`managingAgentId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`agents\` ADD CONSTRAINT \`FK_bf6db0ecc85a85e6db8fa05edf6\` FOREIGN KEY (\`parentAgentId\`) REFERENCES \`agents\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`agents\` ADD CONSTRAINT \`FK_f535e5b2c0f0dc7b7fc656ebc91\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_2485d396d2f2c2d3c1dc8e66a53\` FOREIGN KEY (\`managingAgentId\`) REFERENCES \`agents\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_2485d396d2f2c2d3c1dc8e66a53\``);
        await queryRunner.query(`ALTER TABLE \`agents\` DROP FOREIGN KEY \`FK_f535e5b2c0f0dc7b7fc656ebc91\``);
        await queryRunner.query(`ALTER TABLE \`agents\` DROP FOREIGN KEY \`FK_bf6db0ecc85a85e6db8fa05edf6\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`managingAgentId\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`userType\``);
        await queryRunner.query(`DROP INDEX \`REL_f535e5b2c0f0dc7b7fc656ebc9\` ON \`agents\``);
        await queryRunner.query(`DROP INDEX \`IDX_89c5cab1ed7e6cd1d44317f8b6\` ON \`agents\``);
        await queryRunner.query(`DROP TABLE \`agents\``);
    }

}

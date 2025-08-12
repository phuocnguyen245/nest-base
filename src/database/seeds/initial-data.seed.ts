import { DataSource } from 'typeorm';
import { Role } from '../../auth/entities/role.entity';
import { Permission } from '../../auth/entities/permission.entity';
import { User } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export class InitialDataSeed {
  async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);
    const userRepository = dataSource.getRepository(User);

    // Create permissions
    const permissions = [
      // User permissions
      { name: 'users.create', description: 'Create users', category: 'users' },
      { name: 'users.read', description: 'Read users', category: 'users' },
      { name: 'users.update', description: 'Update users', category: 'users' },
      { name: 'users.delete', description: 'Delete users', category: 'users' },
      {
        name: 'users.restore',
        description: 'Restore deleted users',
        category: 'users',
      },
      {
        name: 'users.manage-roles',
        description: 'Manage user roles',
        category: 'users',
      },
      {
        name: 'users.manage-permissions',
        description: 'Manage user permissions',
        category: 'users',
      },

      // Role permissions
      { name: 'roles.create', description: 'Create roles', category: 'roles' },
      { name: 'roles.read', description: 'Read roles', category: 'roles' },
      { name: 'roles.update', description: 'Update roles', category: 'roles' },
      { name: 'roles.delete', description: 'Delete roles', category: 'roles' },
      {
        name: 'roles.manage-permissions',
        description: 'Manage role permissions',
        category: 'roles',
      },

      // Permission permissions
      {
        name: 'permissions.create',
        description: 'Create permissions',
        category: 'permissions',
      },
      {
        name: 'permissions.read',
        description: 'Read permissions',
        category: 'permissions',
      },
      {
        name: 'permissions.update',
        description: 'Update permissions',
        category: 'permissions',
      },
      {
        name: 'permissions.delete',
        description: 'Delete permissions',
        category: 'permissions',
      },

      // System permissions
      {
        name: 'system.admin',
        description: 'Full system access',
        category: 'system',
      },
      {
        name: 'system.logs',
        description: 'View system logs',
        category: 'system',
      },
      {
        name: 'system.config',
        description: 'Manage system configuration',
        category: 'system',
      },
    ];

    const createdPermissions: Permission[] = [];
    for (const permData of permissions) {
      let permission = await permissionRepository.findOne({
        where: { name: permData.name },
      });

      if (!permission) {
        permission = permissionRepository.create(permData);
        permission = await permissionRepository.save(permission);
      }
      createdPermissions.push(permission);
    }

    // Create roles
    const adminPermissions = createdPermissions; // Admin gets all permissions
    const userPermissions = createdPermissions.filter(
      (p) => p.name.includes('users.read') || p.name.includes('users.update'),
    );

    // Admin role
    let adminRole = await roleRepository.findOne({
      where: { name: 'admin' },
      relations: ['permissions'],
    });

    if (!adminRole) {
      adminRole = roleRepository.create({
        name: 'admin',
        description: 'Administrator with full system access',
        permissions: adminPermissions,
      });
      adminRole = await roleRepository.save(adminRole);
    }

    // User role
    let userRole = await roleRepository.findOne({
      where: { name: 'user' },
      relations: ['permissions'],
    });

    if (!userRole) {
      userRole = roleRepository.create({
        name: 'user',
        description: 'Regular user with limited access',
        permissions: userPermissions,
      });
      userRole = await roleRepository.save(userRole);
    }

    // Create default admin user
    let adminUser = await userRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      adminUser = userRepository.create({
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        roles: [adminRole],
      });
      await userRepository.save(adminUser);
    }

    // Create default regular user
    let regularUser = await userRepository.findOne({
      where: { email: 'user@example.com' },
    });

    if (!regularUser) {
      const hashedPassword = await bcrypt.hash('User123!', 12);
      regularUser = userRepository.create({
        email: 'user@example.com',
        username: 'user',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        roles: [userRole],
      });
      await userRepository.save(regularUser);
    }

    console.log('✅ Initial data seeded successfully');
    console.log('👑 Admin user: admin@example.com / Admin123!');
    console.log('👤 Regular user: user@example.com / User123!');
  }
}

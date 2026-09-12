import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async findById(id: string) {
    const query = `
      SELECT
        u.user_id as id,
        u.email as email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.avatar as avatar,
        u.email_verified as "emailVerified",
        u.provider as provider,
        u.address as address,
        u.date_of_birth as "dateOfBirth",
        u.created_at as "createdAt",
        u.created_by_id as "createdById",
        u.updated_at as "updatedAt",
        u.updated_by_id as "updatedById",
        json_build_object(
          'id', r.role_id,
          'name', r.name,
          'code', r.code,
          'canAccessCms', r.can_access_cms
        ) as role,
        json_build_object(
          'id', creator.user_id,
          'email', creator.email,
          'firstName', creator.first_name,
          'lastName', creator.last_name,
          'avatar', creator.avatar
        ) as "createdBy",
        json_build_object(
          'id', updater.user_id,
          'email', updater.email,
          'firstName', updater.first_name,
          'lastName', updater.last_name,
          'avatar', updater.avatar
        ) as "updatedBy"
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id AND r.status = 'ACTIVE'
      LEFT JOIN users creator ON creator.user_id = u.created_by_id
      LEFT JOIN users updater ON updater.user_id = u.updated_by_id
      WHERE u.user_id = $1 AND u.status = 'ACTIVE'
    `;

    const result = await this.userRepository.query(query, [id]);
    const row = result[0];

    if (!row) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      avatar: row.avatar,
      emailVerified: row.emailVerified,
      provider: row.provider,
      role: row.role,
      gender: row.gender,
      address: row.address,
      dateOfBirth: row.dateOfBirth,
      auditMetadata: {
        createdAt: row.createdAt,
        createdById: row.createdById,
        createdBy: row.createdById ? row.createdBy : undefined,
        updatedAt: row.updatedAt,
        updatedById: row.updatedById,
        updatedBy: row.updatedById ? row.updatedBy : undefined,
      },
    };
  }
}

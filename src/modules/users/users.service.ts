import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcrypt';
import { Brackets, In, Not, Repository } from 'typeorm';

import { Role } from '../../entities/role.entity.js';
import { User } from '../../entities/user.entity.js';
import { PageMetaDto, PaginationDto } from '../../shared/dto/index.js';
import { Status } from '../../types/common.type.js';
import {
  CreateUserDto,
  DeleteUsersDto,
  ListUsersDto,
  UpdateUserDto,
} from './dto/users.dto.js';

const BCRYPT_ROUNDS = 10;

const LIST_COLUMNS = [
  'u.id',
  'u.email',
  'u.firstName',
  'u.lastName',
  'u.avatar',
  'u.phone',
  'u.emailVerified',
  'u.provider',
  'u.status',
  'u.roleId',
  'u.auditMetadata.createdAt',
  'u.auditMetadata.updatedAt',
  'r.id',
  'r.name',
  'r.code',
  'r.canAccessCms',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}

  async findAll({ page, take, search, roleId, status }: ListUsersDto) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.role', 'r')
      .select(LIST_COLUMNS)
      .where('u.status != :deleted', { deleted: Status.DELETED });

    if (status) {
      qb.andWhere('u.status = :status', { status });
    }
    if (roleId !== undefined) {
      qb.andWhere('u.roleId = :roleId', { roleId });
    }
    if (search) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.email ILIKE :search')
            .orWhere('u.firstName ILIKE :search')
            .orWhere('u.lastName ILIKE :search')
            .orWhere('u.phone ILIKE :search'),
        ),
        { search: `%${search}%` },
      );
    }

    const [data, totalCount] = await qb
      .orderBy('u.auditMetadata.createdAt', 'DESC')
      .skip((page - 1) * take)
      .take(take)
      .getManyAndCount();

    return new PaginationDto(data, new PageMetaDto({ page, take, totalCount }));
  }

  async findById(id: string) {
    const query = `
      SELECT
        u.user_id as id,
        u.email as email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.avatar as avatar,
        u.phone as phone,
        u.email_verified as "emailVerified",
        u.provider as provider,
        u.status as status,
        u.address as address,
        u.date_of_birth as "dateOfBirth",
        CASE WHEN r.role_id IS NULL THEN NULL ELSE json_build_object(
          'id', r.role_id,
          'name', r.name,
          'code', r.code,
          'canAccessCms', r.can_access_cms
        ) END as role,
        json_build_object(
          'createdAt', u.created_at,
          'createdById', u.created_by_id,
          'createdBy', CASE WHEN creator.user_id IS NULL THEN NULL ELSE json_build_object(
            'id', creator.user_id,
            'email', creator.email,
            'firstName', creator.first_name,
            'lastName', creator.last_name,
            'avatar', creator.avatar
          ) END,
          'updatedAt', u.updated_at,
          'updatedById', u.updated_by_id,
          'updatedBy', CASE WHEN updater.user_id IS NULL THEN NULL ELSE json_build_object(
            'id', updater.user_id,
            'email', updater.email,
            'firstName', updater.first_name,
            'lastName', updater.last_name,
            'avatar', updater.avatar
          ) END
        ) as "auditMetadata"
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id AND r.status = 'ACTIVE'
      LEFT JOIN users creator ON creator.user_id = u.created_by_id
      LEFT JOIN users updater ON updater.user_id = u.updated_by_id
      WHERE u.user_id = $1 AND u.status != 'DELETED'
      LIMIT 1
    `;

    const [user] = await this.userRepository.query(query, [id]);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, actorId: string) {
    const [emailTaken] = await Promise.all([
      this.userRepository.exists({
        where: { email: dto.email, status: Not(Status.DELETED) },
      }),
      this.assertRoleActive(dto.roleId),
    ]);
    if (emailTaken) {
      throw new ConflictException('Email is already in use');
    }

    const { password, ...rest } = dto;
    const user = await this.userRepository.save({
      ...rest,
      password: password ? await hash(password, BCRYPT_ROUNDS) : null,
      auditMetadata: { createdById: actorId },
    });

    return this.findById(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.userRepository.findOne({
      where: { id, status: Not(Status.DELETED) },
      select: { id: true, roleId: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      await this.assertRoleActive(dto.roleId);
    }

    await this.userRepository.update(id, {
      ...dto,
      auditMetadata: { updatedAt: new Date(), updatedById: actorId },
    });

    return this.findById(id);
  }

  async deleteByIds({ ids }: DeleteUsersDto, actorId: string) {
    if (ids.includes(actorId)) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const deleted = await this.userRepository.manager.transaction(
      async (manager) => {
        const result = await manager.update(
          User,
          { id: In(ids), status: Not(Status.DELETED) },
          {
            status: Status.DELETED,
            auditMetadata: { updatedAt: new Date(), updatedById: actorId },
          },
        );
        // A soft-deleted user must not be able to refresh into a new session.
        await manager.query(
          `UPDATE refresh_tokens SET revoked_at = NOW()
           WHERE user_id = ANY($1::uuid[]) AND revoked_at IS NULL`,
          [ids],
        );
        return result.affected ?? 0;
      },
    );

    return { deleted };
  }

  private async assertRoleActive(roleId: number) {
    const exists = await this.roleRepository.exists({
      where: { id: roleId, status: Status.ACTIVE },
    });
    if (!exists) {
      throw new BadRequestException(`Role with ID ${roleId} not found`);
    }
  }
}

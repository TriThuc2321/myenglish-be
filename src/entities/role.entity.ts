import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { Status } from '../types/common.type.js';
import { AuditMetadata } from './audit-metadata.entity.js';
import { StatusColumn } from './common.entity.js';
import { Permission } from './permission.entity.js';
import { User } from './user.entity.js';

@Entity('roles', { schema: 'public' })
@Index('idx_roles_code', ['code'])
@Index('uq_roles_code', ['code'], {
  unique: true,
  where: `"status" != '${Status.DELETED}'`,
})
export class Role {
  @PrimaryGeneratedColumn('increment', { name: 'role_id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 255, nullable: false })
  code: string;

  @Column({ name: 'can_access_cms', type: 'boolean', default: false })
  canAccessCms!: boolean;

  @Column(() => StatusColumn, { prefix: false })
  status: StatusColumn;

  @Column(() => AuditMetadata, { prefix: false })
  auditMetadata!: AuditMetadata;

  @OneToMany(() => User, (user) => user.role)
  users: Relation<User>[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'roles_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Relation<Permission>[];
}

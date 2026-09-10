import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { Status } from '../types/common.type.js';
import { AuditMetadata } from './audit-metadata.entity.js';
import { Role } from './role.entity.js';

@Entity('permissions', { schema: 'public' })
export class Permission {
  @PrimaryGeneratedColumn('increment', { name: 'permission_id' })
  id!: number;

  @Column({ name: 'action', type: 'varchar', length: 255 })
  action!: string;

  @Column({ name: 'subject', type: 'varchar', length: 255 })
  subject!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: Status,
    enumName: 'status_enum',
    default: Status.INACTIVE,
  })
  status: Status;

  @Column(() => AuditMetadata, { prefix: false })
  auditMetadata!: AuditMetadata;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Relation<Role>[];
}

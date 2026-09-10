import { Exclude } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { Status } from '../types/common.type.js';
import { Provider } from '../types/user.type.js';
import { AuditMetadata } from './audit-metadata.entity.js';
import { Role } from './role.entity.js';

@Entity('users', { schema: 'public' })
@Index('idx_users_email', ['email'])
@Index('idx_users_first_name', ['firstName'])
@Index('idx_users_last_name', ['lastName'])
@Index('idx_users_phone', ['phone'])
@Index('uq_users_email', ['email'], {
  unique: true,
  where: `"status" != '${Status.DELETED}'`,
})
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  id: string;

  @Column({ name: 'email', type: 'varchar', length: 225, nullable: true })
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @Column({ name: 'password', type: 'varchar', length: 225, nullable: true })
  @MinLength(6)
  @Exclude()
  @IsOptional()
  password?: string;

  @IsEnum(Provider)
  @Column({
    name: 'provider',
    type: 'enum',
    enum: Provider,
    enumName: 'provider_enum',
    default: Provider.LOCAL,
  })
  provider: Provider;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: false })
  @IsNotEmpty()
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName?: string | null;

  @Column({ name: 'avatar', type: 'varchar', length: 255, nullable: true })
  avatar?: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  phone?: string | null;

  @Column({ name: 'address', type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  address?: string | null;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({
    name: 'status',
    type: 'enum',
    enum: Status,
    enumName: 'status_enum',
    default: Status.ACTIVE,
  })
  status!: Status;

  @Column(() => AuditMetadata, { prefix: false })
  auditMetadata!: AuditMetadata;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({
    name: 'role_id',
    referencedColumnName: 'id',
  })
  role: Relation<Role>;
}

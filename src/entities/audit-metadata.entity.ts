import { Column, CreateDateColumn } from 'typeorm';

export abstract class AuditMetadata {
  @CreateDateColumn({
    type: 'timestamp without time zone',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column('uuid', { name: 'created_by_id', nullable: true })
  createdById?: string | null;

  @Column({
    type: 'timestamp without time zone',
    name: 'updated_at',
    nullable: true,
  })
  updatedAt?: Date | null;

  @Column('uuid', { name: 'updated_by_id', nullable: true })
  updatedById?: string | null;
}

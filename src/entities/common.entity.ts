import { Column } from 'typeorm';

import { Status } from '../types/common.type.js';

export abstract class StatusColumn {
  @Column({
    name: 'status',
    type: 'enum',
    enum: Status,
    enumName: 'status_enum',
    default: Status.ACTIVE,
  })
  status!: Status;
}

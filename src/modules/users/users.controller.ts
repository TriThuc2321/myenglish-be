import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PermissionAction, PermissionSubject } from '../../types/auth.type.js';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator.js';
import { UsersService } from './users.service.js';

@ApiBearerAuth()
@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get(':id')
  @CheckPermissions([PermissionAction.READ, PermissionSubject.USER])
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('users')
@ApiTags('Users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: number) {
    console.log(typeof id === 'number');
    return 'This action returns a user';
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'test1@gmail.com', type: String })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Revoke every session for the user, not just the current one',
  })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}

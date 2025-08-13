import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UserService } from './users.service';
import { UserDto } from './dto/register.dto';

@Controller('user')
export class UserController {
  constructor(private readonly registerService: UserService) {}

  @Post('/register')
  async createUser(@Body() registeruserDto: UserDto) {
    return await this.registerService.createUser(registeruserDto);
  }

  @Get('/:id')
  async getUserById(@Param('id') user_id: number) {
    return await this.registerService.getUserById(user_id);
  }
}

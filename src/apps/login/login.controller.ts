import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { LoginService } from './login.service';

@Controller('login')
export class LoginController {
  constructor (private readonly loginService: LoginService) {}

  @Post()
  async verifyLogin(@Body() loginDto: LoginDto) {
    return await this.loginService.verifyLogin(loginDto);
  }
}

import { Injectable } from '@nestjs/common';
import { LoginDto } from 'src/apps/login/dto/login.dto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import {JwtService} from '@nestjs/jwt'
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
  constructor (
    private prismaService: PrismaService,
    private jwtService: JwtService
  ) {}

  //Validate the user exist
  async validateUser(data : LoginDto): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: {email: data.email}
    })

    if (user && await bcrypt.compare(data.password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  //Make the token to access
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

}

import { Injectable, Param } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { UserDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor (private prismaService: PrismaService) {}

  async createUser(data: UserDto) {
    data.password = await bcrypt.hash(data.password, 10);
    await this.prismaService.user.create({data: data})

    return {'message': "User Created Successfully"}

  }


  async getUserById(user_id: number) {
    const foundUser = await this.prismaService.user.findFirst({
      where: { id: user_id },
      // Seleccionar campos a devolver
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    console.log(foundUser)
    if (foundUser) {
      return foundUser;
    }

    return { message: 'User not found' };
  }

}

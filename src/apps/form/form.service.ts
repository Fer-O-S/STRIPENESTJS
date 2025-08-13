import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { FormDto } from './dto/form.dto';

@Injectable()
export class FormService {
    constructor (private prismaService : PrismaService){}

    async registerForm(data : FormDto) {
        await this.prismaService.form.create({data: data})
        return {
            message: 'Form create successfully'
        }
    }
}

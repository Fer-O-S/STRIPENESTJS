import { Controller, Post, Body} from '@nestjs/common';
import { FormService } from './form.service';
import { FormDto } from './dto/form.dto';

@Controller('form')
export class FormController{
    constructor (private readonly formService: FormService) {}

    @Post()
    async registerForm(@Body() formDto:FormDto) {
        return await this.formService.registerForm(formDto);
    }
}

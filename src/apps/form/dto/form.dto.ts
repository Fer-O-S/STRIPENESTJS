import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator"

export class FormDto {

    @IsString()
    @IsNotEmpty()
    name : string


    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email : string
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    message: string
}
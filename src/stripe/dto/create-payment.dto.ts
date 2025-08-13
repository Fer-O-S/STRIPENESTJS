// src/stripe/dto/create-payment.dto.ts
import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  orderId: number;
}

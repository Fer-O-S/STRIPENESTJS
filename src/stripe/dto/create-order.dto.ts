// src/stripe/dto/create-order.dto.ts
import { IsInt, IsPositive, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  userId: number;
}

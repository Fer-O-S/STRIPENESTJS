// src/stripe/dto/create-checkout.dto.ts
import { IsNotEmpty, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsNotEmpty()
  @IsInt()
  orderId: number;

  @IsOptional()
  @IsString()
  successUrl?: string; // URL opcional para redirigir después del pago exitoso

  @IsOptional()
  @IsString()
  cancelUrl?: string; // URL opcional para redirigir si se cancela el pago
}

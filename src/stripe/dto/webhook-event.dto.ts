// src/stripe/dto/webhook-event.dto.ts
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  data: any;
}

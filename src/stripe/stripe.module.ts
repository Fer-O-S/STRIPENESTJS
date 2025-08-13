// src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/config/prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [StripeController],
  providers: [
    StripeService,
    PrismaService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: () => {
        const secretKey = process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
          throw new Error(
            'STRIPE_SECRET_KEY no está configurado en las variables de entorno',
          );
        }

        return new Stripe(secretKey, {
          apiVersion: '2025-07-30.basil', // Tu versión de API
        });
      },
    },
  ],
  exports: [StripeService, 'STRIPE_CLIENT'], // Por si otros módulos necesitan usar Stripe
})
export class StripeModule {}

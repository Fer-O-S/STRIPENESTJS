// src/stripe/stripe.controller.ts
import { Controller, Get, Post, Body, Headers, Req } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Request } from 'express';

interface RequestWithRawBody extends Request {
  body: Buffer;
}

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // 1. OBTENER PRODUCTOS
  @Get('products')
  async getProducts() {
    return this.stripeService.getProducts();
  }

  // 2. CREAR ORDEN
  @Post('create-order')
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.stripeService.createOrder(createOrderDto);
  }

  // 3. CREAR PAYMENT INTENT (para frontend personalizado)
  @Post('create-payment')
  async createPaymentIntent(@Body() createPaymentDto: CreatePaymentDto) {
    return this.stripeService.createPaymentIntent(createPaymentDto);
  }

  // 3.1. CREAR CHECKOUT SESSION (para URL de pago de Stripe)
  @Post('create-checkout')
  async createCheckoutSession(@Body() createCheckoutDto: CreateCheckoutDto) {
    return this.stripeService.createCheckoutSession(createCheckoutDto);
  }

  // 4. WEBHOOK DE STRIPE
  @Post('webhook')
  async handleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET no está configurado');
      return { error: 'Webhook secret not configured' };
    }

    if (!signature) {
      console.error('❌ No stripe-signature header found');
      return { error: 'No signature provided' };
    }

    if (!req.body) {
      console.error('❌ No body found in request');
      return { error: 'No webhook payload provided' };
    }

    let event;

    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret,
      );
      console.log(`✅ Webhook signature verified for event: ${event.type}`);
    } catch (err) {
      console.error(`❌ Webhook signature verification failed:`, err.message);
      return { error: `Webhook Error: ${err.message}` };
    }

    console.log(`🔨 Received webhook event: ${event.type} [${event.id}]`);

    try {
      // Procesar eventos de Payment Intent Y Checkout Session
      if (
        [
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
          'checkout.session.completed',
          'checkout.session.expired',
        ].includes(event.type)
      ) {
        const result = await this.stripeService.handleWebhook({
          id: event.id,
          type: event.type,
          data: event.data,
        });

        console.log(`✅ Event ${event.type} processed successfully`);
        return { received: true, processed: true, result };
      }

      // Eventos reconocidos pero no procesados
      if (
        ['payment_intent.created', 'checkout.session.created'].includes(
          event.type,
        )
      ) {
        console.log(`ℹ️ Event ${event.type} acknowledged but not processed`);
        return {
          received: true,
          processed: false,
          message: `Event ${event.type} acknowledged`,
        };
      }

      console.log(`ℹ️ Event ${event.type} not handled`);
      return {
        received: true,
        processed: false,
        message: `Event ${event.type} not handled`,
      };
    } catch (error) {
      console.error(`❌ Error processing webhook ${event.type}:`, error);
      return {
        received: true,
        processed: false,
        error: error.message,
        eventId: event.id,
      };
    }
  }
}

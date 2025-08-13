// src/stripe/stripe.service.ts
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import Stripe from 'stripe';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class StripeService {
  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
  ) {}

  // 1. OBTENER PRODUCTOS
  async getProducts() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. CREAR ORDEN
  async createOrder(createOrderDto: CreateOrderDto) {
    const { productId, quantity, userId } = createOrderDto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.isActive) {
      throw new BadRequestException('Producto no disponible');
    }

    const totalAmount = product.price.mul(quantity);

    const order = await this.prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        totalAmount,
        currency: product.currency,
        status: OrderStatus.PENDING,
      },
      include: {
        product: true,
        user: true,
      },
    });

    return order;
  }

  // 3. CREAR PAYMENT INTENT (para frontend personalizado)
  async createPaymentIntent(createPaymentDto: CreatePaymentDto) {
    const { orderId } = createPaymentDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, product: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('La orden ya fue procesada');
    }

    let customerId = order.user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: order.user.email,
        name: order.user.name,
        metadata: { userId: order.user.id.toString() },
      });

      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: order.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.totalAmount.toString()) * 100),
      currency: order.currency,
      customer: customerId,
      metadata: {
        orderId: order.id.toString(),
        productName: order.product.name,
      },
      automatic_payment_methods: { enabled: true },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    await this.prisma.payment.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        amount: order.totalAmount,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  // 3.1. CREAR CHECKOUT SESSION (¡Esta es la clave para tu caso!)
  async createCheckoutSession(createCheckoutDto: CreateCheckoutDto) {
    const { orderId, successUrl, cancelUrl } = createCheckoutDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, product: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('La orden ya fue procesada');
    }

    // URLs por defecto si no se proporcionan
    const defaultSuccessUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`;

    // Crear o obtener customer de Stripe
    let customerId = order.user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: order.user.email,
        name: order.user.name,
        metadata: { userId: order.user.id.toString() },
      });

      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: order.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Crear Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: order.currency,
            product_data: {
              name: order.product.name,
              description: order.product.description || undefined,
            },
            unit_amount: Math.round(
              parseFloat(order.product.price.toString()) * 100,
            ),
          },
          quantity: order.quantity,
        },
      ],
      mode: 'payment',
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      metadata: {
        orderId: order.id.toString(),
        userId: order.user.id.toString(),
        productName: order.product.name,
      },
      // Opcional: configurar fecha de expiración
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutos
    });

    // Actualizar orden con session ID
    await this.prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentIntentId: session.id }, // Reutilizamos este campo para el session ID
    });

    // Crear registro de pago
    await this.prisma.payment.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        amount: order.totalAmount,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      sessionId: session.id,
      url: session.url, // ¡Esta es la URL que necesitas para probar!
      expiresAt: new Date(session.expires_at * 1000),
    };
  }

  // 4. MANEJAR WEBHOOK
  async handleWebhook(webhookEvent: WebhookEventDto) {
    const { type, data } = webhookEvent;

    console.log(`Procesando evento: ${type}`);

    try {
      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(data.object);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(data.object);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutExpired(data.object);
          break;

        default:
          console.log(`Evento no manejado en service: ${type}`);
      }

      return { received: true, processed: type };
    } catch (error) {
      console.error(`Error procesando ${type}:`, error);
      throw error;
    }
  }

  // 5. PAGO EXITOSO (Payment Intent)
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Validar que existe metadata y orderId
    if (!paymentIntent.metadata || !paymentIntent.metadata.orderId) {
      console.error('Payment Intent sin metadata de orden:', paymentIntent.id);
      throw new BadRequestException('Payment Intent sin información de orden');
    }

    const orderId = parseInt(paymentIntent.metadata.orderId);

    if (isNaN(orderId)) {
      console.error(
        'ID de orden inválido en metadata:',
        paymentIntent.metadata.orderId,
      );
      throw new BadRequestException('ID de orden inválido');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    await this.prisma.payment.updateMany({
      where: { orderId: orderId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeChargeId: paymentIntent.latest_charge as string,
      },
    });

    console.log(`Pago exitoso para orden ${orderId}`);
  }

  // 6. PAGO FALLIDO (Payment Intent)
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    // Validar que existe metadata y orderId
    if (!paymentIntent.metadata || !paymentIntent.metadata.orderId) {
      console.error(
        'Payment Intent fallido sin metadata de orden:',
        paymentIntent.id,
      );
      throw new BadRequestException('Payment Intent sin información de orden');
    }

    const orderId = parseInt(paymentIntent.metadata.orderId);

    if (isNaN(orderId)) {
      console.error(
        'ID de orden inválido en metadata:',
        paymentIntent.metadata.orderId,
      );
      throw new BadRequestException('ID de orden inválido');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELED },
    });

    await this.prisma.payment.updateMany({
      where: { orderId: orderId },
      data: { status: PaymentStatus.FAILED },
    });

    console.log(`Pago fallido para orden ${orderId}`);
  }

  // 7. CHECKOUT SESSION COMPLETADO
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    // Validar que existe metadata y orderId
    if (!session.metadata || !session.metadata.orderId) {
      console.error('Checkout session sin metadata de orden:', session.id);
      throw new BadRequestException('Session sin información de orden');
    }

    const orderId = parseInt(session.metadata.orderId);

    if (isNaN(orderId)) {
      console.error(
        'ID de orden inválido en metadata:',
        session.metadata.orderId,
      );
      throw new BadRequestException('ID de orden inválido');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      },
    });

    await this.prisma.payment.updateMany({
      where: { orderId: orderId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeChargeId: session.payment_intent as string,
      },
    });

    console.log(`Checkout completado para orden ${orderId}`);
  }

  // 8. CHECKOUT SESSION EXPIRADO
  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    // Validar que existe metadata y orderId
    if (!session.metadata || !session.metadata.orderId) {
      console.error(
        'Checkout session expirado sin metadata de orden:',
        session.id,
      );
      throw new BadRequestException('Session sin información de orden');
    }

    const orderId = parseInt(session.metadata.orderId);

    if (isNaN(orderId)) {
      console.error(
        'ID de orden inválido en metadata:',
        session.metadata.orderId,
      );
      throw new BadRequestException('ID de orden inválido');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELED },
    });

    await this.prisma.payment.updateMany({
      where: { orderId: orderId },
      data: { status: PaymentStatus.FAILED },
    });

    console.log(`Checkout expirado para orden ${orderId}`);
  }
}

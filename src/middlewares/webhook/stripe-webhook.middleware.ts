// src/middlewares/webhook/stripe-webhook.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

@Injectable()
export class StripeWebhookMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Solo para el webhook de Stripe, usar raw body parser
    if (req.originalUrl === '/stripe/webhook') {
      return bodyParser.raw({ type: 'application/json' })(req, res, next);
    }
    // Para otras rutas, continuar normalmente
    next();
  }
}

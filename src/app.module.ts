import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  NestModule,
} from '@nestjs/common';
import { LoginModule } from './apps/login/login.module';
import { RegisterModule } from './apps/users/users.module';
import { AuthModule } from './middlewares/auth/auth.module';
import { FormModule } from './apps/form/form.module';
import { StripeModule } from './stripe/stripe.module';
import { ConfigModule } from '@nestjs/config';
import { StripeWebhookMiddleware } from './middlewares/webhook/stripe-webhook.middleware';

@Module({
  imports: [
    LoginModule,
    RegisterModule,
    AuthModule,
    FormModule,
    ConfigModule.forRoot({
      isGlobal: true, // Variables de entorno disponibles globalmente
    }),
    StripeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StripeWebhookMiddleware)
      .forRoutes({ path: 'stripe/webhook', method: RequestMethod.POST });
  }
}

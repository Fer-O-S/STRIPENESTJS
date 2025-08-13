import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/config/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'estaEsLaClaveSecretaQueCambiarPonerlaEnUnEnv',
      signOptions: {expiresIn: '60m'}
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

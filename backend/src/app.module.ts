import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { WalletsModule } from "./wallets/wallets.module";
import { MarketsModule } from "./markets/markets.module";
import { TradesModule } from "./trades/trades.module";
import { AdminModule } from "./admin/admin.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { AMMModule } from "./amm/amm.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    HealthModule,
    SupabaseModule,
    AMMModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    MarketsModule,
    TradesModule,
    AdminModule,
  ],
})
export class AppModule {}

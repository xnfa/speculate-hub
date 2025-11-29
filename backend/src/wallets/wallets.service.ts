import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { Database } from "../supabase/database.types";

type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransaction =
  Database["public"]["Tables"]["wallet_transactions"]["Row"];

@Injectable()
export class WalletsService {
  constructor(private supabase: SupabaseService) {}

  async create(userId: string): Promise<Wallet> {
    const { data, error } = await this.supabase.client
      .from("wallets")
      .insert({ user_id: userId, balance: 0, frozen_balance: 0 })
      .select()
      .single();

    if (error) {
      throw new Error(`创建钱包失败: ${error.message}`);
    }

    return data;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const { data, error } = await this.supabase.client
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async deposit(userId: string, amount: number): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException("充值金额必须大于0");
    }

    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const currentBalance = wallet.balance ?? 0;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    const { data, error } = await this.supabase.client
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (error) {
      throw new Error(`充值失败: ${error.message}`);
    }

    // Record transaction
    await this.recordTransaction({
      wallet_id: wallet.id,
      type: "deposit",
      amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: "账户充值",
    });

    return data;
  }

  async withdraw(userId: string, amount: number): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException("提现金额必须大于0");
    }

    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const currentBalance = wallet.balance ?? 0;
    if (currentBalance < amount) {
      throw new BadRequestException("余额不足");
    }

    const newBalance = currentBalance - amount;

    const { data, error } = await this.supabase.client
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (error) {
      throw new Error(`提现失败: ${error.message}`);
    }

    await this.recordTransaction({
      wallet_id: wallet.id,
      type: "withdraw",
      amount: -amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: "账户提现",
    });

    return data;
  }

  async deductForTrade(
    userId: string,
    amount: number,
    marketId: string
  ): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const currentBalance = wallet.balance ?? 0;
    if (currentBalance < amount) {
      throw new BadRequestException("余额不足");
    }

    const newBalance = currentBalance - amount;

    const { data, error } = await this.supabase.client
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (error) {
      throw new Error(`扣款失败: ${error.message}`);
    }

    await this.recordTransaction({
      wallet_id: wallet.id,
      type: "trade",
      amount: -amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: "市场交易",
      reference_id: marketId,
    });

    return data;
  }

  async addFromTrade(
    userId: string,
    amount: number,
    marketId: string
  ): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const currentBalance = wallet.balance ?? 0;
    const newBalance = currentBalance + amount;

    const { data, error } = await this.supabase.client
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (error) {
      throw new Error(`入账失败: ${error.message}`);
    }

    await this.recordTransaction({
      wallet_id: wallet.id,
      type: "trade",
      amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: "市场交易",
      reference_id: marketId,
    });

    return data;
  }

  async settlePosition(
    userId: string,
    amount: number,
    marketId: string
  ): Promise<Wallet> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const currentBalance = wallet.balance ?? 0;
    const newBalance = currentBalance + amount;

    const { data, error } = await this.supabase.client
      .from("wallets")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (error) {
      throw new Error(`结算失败: ${error.message}`);
    }

    await this.recordTransaction({
      wallet_id: wallet.id,
      type: "settlement",
      amount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: "市场结算",
      reference_id: marketId,
    });

    return data;
  }

  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: WalletTransaction[]; pagination: any }> {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException("钱包不存在");
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from("wallet_transactions")
      .select("*", { count: "exact" })
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取交易记录失败: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  private async recordTransaction(data: {
    wallet_id: string;
    type: "deposit" | "withdraw" | "trade" | "settlement" | "refund";
    amount: number;
    balance_before: number;
    balance_after: number;
    description?: string;
    reference_id?: string;
  }) {
    const { error } = await this.supabase.client
      .from("wallet_transactions")
      .insert(data);

    if (error) {
      console.error("记录交易失败:", error.message);
    }
  }

  async findAll(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from("wallets")
      .select(
        `
        *,
        users:user_id (
          id,
          email,
          username
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取钱包列表失败: ${error.message}`);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getStats() {
    const { data: wallets } = await this.supabase.client
      .from("wallets")
      .select("balance, frozen_balance");

    const totalBalance =
      wallets?.reduce((sum, w) => sum + (w.balance ?? 0), 0) || 0;
    const totalFrozen =
      wallets?.reduce((sum, w) => sum + (w.frozen_balance ?? 0), 0) || 0;

    return {
      totalBalance,
      totalFrozen,
      walletsCount: wallets?.length || 0,
    };
  }
}

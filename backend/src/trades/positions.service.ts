import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Database } from '../supabase/database.types';

type Position = Database['public']['Tables']['positions']['Row'];

@Injectable()
export class PositionsService {
  constructor(private supabase: SupabaseService) {}

  async findByUserAndMarket(
    userId: string,
    marketId: string,
  ): Promise<Position | null> {
    const { data, error } = await this.supabase.client
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('market_id', marketId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from('positions')
      .select(
        `
        *,
        markets:market_id (
          id,
          title,
          status,
          outcome,
          yes_shares,
          no_shares
        )
      `,
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取持仓列表失败: ${error.message}`);
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

  async findByMarket(marketId: string) {
    const { data, error } = await this.supabase.client
      .from('positions')
      .select(
        `
        *,
        users:user_id (
          id,
          username,
          email
        )
      `,
      )
      .eq('market_id', marketId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`获取市场持仓列表失败: ${error.message}`);
    }

    return data;
  }

  async createOrUpdate(
    userId: string,
    marketId: string,
    side: 'yes' | 'no',
    sharesDelta: number,
    avgPrice: number,
    isBuy: boolean,
  ): Promise<Position> {
    let position = await this.findByUserAndMarket(userId, marketId);

    if (!position) {
      // Create new position
      const insertData: any = {
        user_id: userId,
        market_id: marketId,
        yes_shares: 0,
        no_shares: 0,
        avg_yes_price: 0,
        avg_no_price: 0,
      };

      if (side === 'yes') {
        insertData.yes_shares = sharesDelta;
        insertData.avg_yes_price = avgPrice;
      } else {
        insertData.no_shares = sharesDelta;
        insertData.avg_no_price = avgPrice;
      }

      const { data, error } = await this.supabase.client
        .from('positions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`创建持仓失败: ${error.message}`);
      }

      return data;
    }

    // Update existing position
    const currentShares =
      side === 'yes' ? position.yes_shares : position.no_shares;
    const currentAvgPrice =
      side === 'yes' ? position.avg_yes_price : position.avg_no_price;

    let newShares: number;
    let newAvgPrice: number;

    if (isBuy) {
      newShares = currentShares + sharesDelta;
      // 计算新的平均价格（加权平均）
      if (newShares > 0) {
        newAvgPrice =
          (currentShares * currentAvgPrice + sharesDelta * avgPrice) / newShares;
      } else {
        newAvgPrice = 0;
      }
    } else {
      newShares = currentShares - sharesDelta;
      newAvgPrice = newShares > 0 ? currentAvgPrice : 0;
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (side === 'yes') {
      updateData.yes_shares = Math.max(0, newShares);
      updateData.avg_yes_price = newAvgPrice;
    } else {
      updateData.no_shares = Math.max(0, newShares);
      updateData.avg_no_price = newAvgPrice;
    }

    const { data, error } = await this.supabase.client
      .from('positions')
      .update(updateData)
      .eq('id', position.id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新持仓失败: ${error.message}`);
    }

    return data;
  }
}


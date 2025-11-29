import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletsService } from '../wallets/wallets.service';
import { Database } from '../supabase/database.types';

type User = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

@Injectable()
export class UsersService {
  constructor(
    private supabase: SupabaseService,
    private walletsService: WalletsService,
  ) {}

  async create(data: Omit<UserInsert, 'id'>): Promise<User> {
    const { data: user, error } = await this.supabase.client
      .from('users')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`创建用户失败: ${error.message}`);
    }

    // Create wallet for user
    await this.walletsService.create(user.id);

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async findAll(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.supabase.client
      .from('users')
      .select('id, email, username, role, is_active, created_at, updated_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`获取用户列表失败: ${error.message}`);
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

  async updateStatus(id: string, isActive: boolean): Promise<User> {
    const { data, error } = await this.supabase.client
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('用户不存在');
    }

    return data;
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<User> {
    const { data, error } = await this.supabase.client
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('用户不存在');
    }

    return data;
  }

  async getStats() {
    const { count: totalUsers } = await this.supabase.client
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await this.supabase.client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: newUsersToday } = await this.supabase.client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersToday: newUsersToday || 0,
    };
  }
}


"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  Target,
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Stats {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
  };
  wallets: {
    totalBalance: number;
    totalFrozen: number;
    walletsCount: number;
  };
  markets: {
    totalMarkets: number;
    activeMarkets: number;
    totalVolume: number;
  };
  trades: {
    totalTrades: number;
    tradesToday: number;
    totalVolume: number;
    totalFees: number;
  };
}

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await adminApi.getStats(token);
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "总用户数",
      value: stats?.users.totalUsers || 0,
      subValue: `活跃: ${stats?.users.activeUsers || 0}`,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      trend: stats?.users.newUsersToday || 0,
      trendLabel: "今日新增",
    },
    {
      title: "平台资金",
      value: formatCurrency(stats?.wallets.totalBalance || 0),
      subValue: `冻结: ${formatCurrency(stats?.wallets.totalFrozen || 0)}`,
      icon: Wallet,
      color: "from-green-500 to-emerald-500",
      trend: null,
    },
    {
      title: "活跃市场",
      value: stats?.markets.activeMarkets || 0,
      subValue: `总计: ${stats?.markets.totalMarkets || 0}`,
      icon: Target,
      color: "from-purple-500 to-pink-500",
      trend: null,
    },
    {
      title: "总交易量",
      value: formatCurrency(stats?.trades.totalVolume || 0),
      subValue: `手续费: ${formatCurrency(stats?.trades.totalFees || 0)}`,
      icon: BarChart3,
      color: "from-orange-500 to-red-500",
      trend: stats?.trades.tradesToday || 0,
      trendLabel: "今日交易",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">仪表盘</h1>
        <p className="text-muted-foreground">平台运营数据概览</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}
                >
                  <card.icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 bg-muted rounded w-24 animate-pulse" />
                  ) : (
                    card.value
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">
                    {card.subValue}
                  </span>
                  {card.trend !== null && (
                    <div className="flex items-center text-xs text-green-400">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      {card.trend} {card.trendLabel}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/admin/markets"
                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-center"
              >
                <Target className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <span className="text-sm font-medium">创建市场</span>
              </a>
              <a
                href="/admin/users"
                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-center"
              >
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <span className="text-sm font-medium">管理用户</span>
              </a>
              <a
                href="/admin/wallets"
                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-center"
              >
                <Wallet className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <span className="text-sm font-medium">充值管理</span>
              </a>
              <a
                href="/admin/trades"
                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-center"
              >
                <Activity className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                <span className="text-sm font-medium">查看交易</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


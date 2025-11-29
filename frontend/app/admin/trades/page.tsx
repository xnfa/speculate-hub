"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

interface Trade {
  id: string;
  user_id: string;
  market_id: string;
  type: "buy" | "sell";
  side: "yes" | "no";
  shares: number;
  price: number;
  cost: number;
  fee: number;
  created_at: string;
  users: {
    id: string;
    username: string;
    email: string;
  };
  markets: {
    id: string;
    title: string;
  };
}

export default function AdminTradesPage() {
  const { token } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTrades();
  }, [page]);

  const loadTrades = async () => {
    if (!token) return;
    try {
      const result = await adminApi.getTrades(token, page);
      setTrades(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = trades.filter(
    (trade) =>
      trade.users?.username?.toLowerCase().includes(search.toLowerCase()) ||
      trade.markets?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = trades.reduce((sum, t) => sum + t.cost, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">交易记录</h1>
        <p className="text-muted-foreground">查看所有交易活动</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总交易数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总交易量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalVolume)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总手续费
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(totalFees)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              交易列表
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索交易..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 animate-pulse"
                >
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无交易记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trade.type === "buy"
                        ? "bg-green-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    {trade.type === "buy" ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {trade.users?.username || "未知用户"}
                      </span>
                      <Badge
                        variant={trade.type === "buy" ? "success" : "destructive"}
                      >
                        {trade.type === "buy" ? "买入" : "卖出"}
                      </Badge>
                      <Badge
                        variant={trade.side === "yes" ? "default" : "secondary"}
                      >
                        {trade.side === "yes" ? "是" : "否"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {trade.markets?.title || "未知市场"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {trade.shares.toFixed(2)} 份
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @ {formatPercent(trade.price)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        trade.type === "buy" ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {trade.type === "buy" ? "-" : "+"}
                      {formatCurrency(trade.cost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      手续费: {formatCurrency(trade.fee)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground hidden md:block">
                    {formatDate(trade.created_at)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


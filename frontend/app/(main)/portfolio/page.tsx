"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tradesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  formatCurrency,
  formatPercent,
  getMarketStatusText,
  getMarketStatusColor,
} from "@/lib/utils";

interface Position {
  id: string;
  market_id: string;
  yes_shares: number;
  no_shares: number;
  avg_yes_price: number;
  avg_no_price: number;
  markets: {
    id: string;
    title: string;
    status: string;
    outcome: string | null;
    yes_shares: number;
    no_shares: number;
  };
}

export default function PortfolioPage() {
  const { token } = useAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    if (!token) return;
    try {
      const result = await tradesApi.getMyPositions(token);
      setPositions(result.data || []);
    } catch (error) {
      console.error("Failed to load positions:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPrice = (market: any, side: "yes" | "no") => {
    // 已结算市场：获胜方价值1，失败方价值0
    if (market.status === "resolved" && market.outcome) {
      if (side === market.outcome) {
        return 1; // 获胜方每份价值1元
      } else {
        return 0; // 失败方每份价值0元
      }
    }

    // 未结算市场：使用 LMSR 价格公式
    // 由于前端没有 liquidity 参数，使用简化的概率计算
    const total = market.yes_shares + market.no_shares;
    if (total === 0) return 0.5;

    // LMSR 价格近似计算（假设 b 较大时）
    // P(yes) ≈ e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
    // 简化为基于份额差的概率
    const b = 1000; // 假设默认流动性
    const expYes = Math.exp(market.yes_shares / b);
    const expNo = Math.exp(market.no_shares / b);
    const sum = expYes + expNo;

    return side === "yes" ? expYes / sum : expNo / sum;
  };

  const calculatePnL = (position: Position) => {
    if (!position.markets) return { pnl: 0, pnlPercent: 0, totalValue: 0, isSettled: false };

    const market = position.markets;
    const isSettled = market.status === "resolved";

    // 计算当前价值
    let yesValue = 0;
    let noValue = 0;

    if (isSettled && market.outcome) {
      // 已结算：根据结果计算价值
      if (market.outcome === "yes") {
        yesValue = position.yes_shares * 1; // YES 赢了，每份值1元
        noValue = position.no_shares * 0;   // NO 输了，每份值0元
      } else {
        yesValue = position.yes_shares * 0; // YES 输了，每份值0元
        noValue = position.no_shares * 1;   // NO 赢了，每份值1元
      }
    } else {
      // 未结算：按当前价格计算
      const yesCurrentPrice = calculateCurrentPrice(market, "yes");
      const noCurrentPrice = calculateCurrentPrice(market, "no");
      yesValue = position.yes_shares * yesCurrentPrice;
      noValue = position.no_shares * noCurrentPrice;
    }

    // 计算成本
    const yesCost = position.yes_shares * position.avg_yes_price;
    const noCost = position.no_shares * position.avg_no_price;

    const totalValue = yesValue + noValue;
    const totalCost = yesCost + noCost;
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? pnl / totalCost : 0;

    return { pnl, pnlPercent, totalValue, isSettled };
  };

  const totalPortfolioValue = positions.reduce((sum, pos) => {
    const { totalValue } = calculatePnL(pos);
    return sum + (totalValue || 0);
  }, 0);

  const activePositions = positions.filter(
    (p) => p.yes_shares > 0 || p.no_shares > 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">我的持仓</h1>
        <p className="text-muted-foreground">管理您在预测市场中的所有持仓</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                持仓总价值
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalPortfolioValue)}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                活跃持仓
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePositions.length}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                参与市场
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions.length}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Positions List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activePositions.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">暂无持仓</h3>
          <p className="text-sm text-muted-foreground mb-4">
            开始交易以建立您的投资组合
          </p>
          <Link href="/markets">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
            >
              浏览市场
            </Badge>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {activePositions.map((position, index) => {
            const { pnl, pnlPercent, totalValue, isSettled } = calculatePnL(position);
            const isProfitable = pnl >= 0;
            const market = position.markets;

            // 判断用户是否预测正确（对于已结算市场）
            const hasWinningPosition = isSettled && market?.outcome && (
              (market.outcome === "yes" && position.yes_shares > 0) ||
              (market.outcome === "no" && position.no_shares > 0)
            );

            return (
              <motion.div
                key={position.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/markets/${position.market_id}`}>
                  <Card className="hover:border-primary/50 transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                market?.status === "active"
                                  ? "success"
                                  : market?.status === "resolved"
                                  ? "info"
                                  : "secondary"
                              }
                            >
                              {getMarketStatusText(market?.status || "")}
                            </Badge>
                            {isSettled && market?.outcome && (
                              <Badge variant={hasWinningPosition ? "success" : "destructive"}>
                                结果: {market.outcome === "yes" ? "是" : "否"}
                                {hasWinningPosition ? " ✓" : " ✗"}
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                            {market?.title}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {position.yes_shares > 0 && (
                              <span className={`flex items-center gap-1 ${
                                isSettled && market?.outcome === "yes" ? "text-green-400 font-medium" : ""
                              }`}>
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                是: {position.yes_shares.toFixed(2)} 份 @{" "}
                                {formatPercent(position.avg_yes_price)}
                                {isSettled && market?.outcome === "yes" && " → 获胜!"}
                              </span>
                            )}
                            {position.no_shares > 0 && (
                              <span className={`flex items-center gap-1 ${
                                isSettled && market?.outcome === "no" ? "text-green-400 font-medium" : ""
                              }`}>
                                <TrendingDown className="w-4 h-4 text-red-400" />
                                否: {position.no_shares.toFixed(2)} 份 @{" "}
                                {formatPercent(position.avg_no_price)}
                                {isSettled && market?.outcome === "no" && " → 获胜!"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">
                              {isSettled ? "结算价值" : "当前价值"}
                            </div>
                            <div className="font-semibold">
                              {formatCurrency(totalValue || 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">
                              盈亏
                            </div>
                            <div
                              className={`font-semibold ${
                                isProfitable ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isProfitable ? "+" : ""}
                              {formatCurrency(pnl)} ({formatPercent(pnlPercent)})
                            </div>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}


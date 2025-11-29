"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  Coins,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatNumber, getMarketStatusText } from "@/lib/utils";

interface AnalyticsOverview {
  fees: {
    totalFees: number;
    todayFees: number;
    weekFees: number;
    monthFees: number;
  };
  amm: {
    totalPnL: number;
    resolvedPnL: number;
  };
  exposure: {
    totalMaxExposure: number;
    marketCount: number;
  };
  totalProfit: number;
}

interface MarketPnL {
  marketId: string;
  title: string;
  buyVolume: number;
  sellVolume: number;
  settlementPayout: number;
  pnl: number;
  status: string;
}

interface MarketExposure {
  marketId: string;
  title: string;
  status: string;
  totalYesShares: number;
  totalNoShares: number;
  maxExposure: number;
}

interface TopContributor {
  userId: string;
  totalFees: number;
  totalVolume: number;
  tradeCount: number;
  user: {
    id: string;
    username: string;
    email: string;
  } | null;
}

export default function AnalyticsPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [marketsPnL, setMarketsPnL] = useState<MarketPnL[]>([]);
  const [exposures, setExposures] = useState<MarketExposure[]>([]);
  const [contributors, setContributors] = useState<TopContributor[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [overviewData, marketsData, exposureData, contributorsData] =
        await Promise.all([
          adminApi.getAnalyticsOverview(token),
          adminApi.getMarketsPnL(token),
          adminApi.getExposure(token),
          adminApi.getTopContributors(token, 10),
        ]);

      setOverview(overviewData);
      setMarketsPnL(marketsData.marketDetails);
      setExposures(exposureData.marketExposures);
      setContributors(contributorsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const LoadingSkeleton = () => (
    <div className="h-8 bg-muted rounded w-24 animate-pulse" />
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">盈利分析</h1>
        <p className="text-muted-foreground">平台收益与风险概览</p>
      </motion.div>

      {/* 综合利润卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative overflow-hidden border-2 border-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">
              平台综合利润
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              {loading ? (
                <LoadingSkeleton />
              ) : (
                <>
                  <span
                    className={`text-4xl font-bold ${
                      (overview?.totalProfit || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatCurrency(overview?.totalProfit || 0)}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {(overview?.totalProfit || 0) >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <span>手续费 + 做市商盈亏</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <span className="text-sm text-muted-foreground">
                  手续费收入
                </span>
                <div className="text-xl font-semibold text-emerald-400">
                  {loading ? (
                    <LoadingSkeleton />
                  ) : (
                    formatCurrency(overview?.fees.totalFees || 0)
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  做市商盈亏（已结算）
                </span>
                <p
                  className={`text-xl font-semibold ${
                    (overview?.amm.resolvedPnL || 0) >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {loading ? (
                    <LoadingSkeleton />
                  ) : (
                    formatCurrency(overview?.amm.resolvedPnL || 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 手续费收入卡片组 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            title: "总手续费",
            value: overview?.fees.totalFees || 0,
            icon: Coins,
            color: "from-emerald-500 to-teal-500",
          },
          {
            title: "今日手续费",
            value: overview?.fees.todayFees || 0,
            icon: Calendar,
            color: "from-blue-500 to-cyan-500",
          },
          {
            title: "本周手续费",
            value: overview?.fees.weekFees || 0,
            icon: CalendarDays,
            color: "from-purple-500 to-pink-500",
          },
          {
            title: "本月手续费",
            value: overview?.fees.monthFees || 0,
            icon: CalendarRange,
            color: "from-orange-500 to-amber-500",
          },
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
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
                  {loading ? <LoadingSkeleton /> : formatCurrency(card.value)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 风险敞口警告 */}
      {overview && overview.exposure.totalMaxExposure > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                未结算市场风险敞口
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(overview.exposure.totalMaxExposure)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {overview.exposure.marketCount} 个活跃市场的最大潜在支付
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>如果所有市场结果对平台不利</p>
                  <p>最大需要支付的金额</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 数据表格区域 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 用户贡献排行 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                用户贡献排行 Top 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : contributors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无数据
                </p>
              ) : (
                <div className="space-y-2">
                  {contributors.map((contributor, index) => (
                    <div
                      key={contributor.userId}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3
                              ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">
                            {contributor.user?.username || "未知用户"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contributor.tradeCount} 笔交易
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-400">
                          {formatCurrency(contributor.totalFees)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          交易额 {formatCurrency(contributor.totalVolume)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 高风险市场 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                高风险敞口市场
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : exposures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  暂无未结算市场
                </p>
              ) : (
                <div className="space-y-2">
                  {exposures.map((market) => (
                    <div
                      key={market.marketId}
                      className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium truncate max-w-[200px]">
                          {market.title}
                        </p>
                        <span className="text-amber-400 font-semibold">
                          {formatCurrency(market.maxExposure)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-secondary">
                          {getMarketStatusText(market.status)}
                        </span>
                        <span>
                          YES: {formatNumber(market.totalYesShares, 0)} | NO:{" "}
                          {formatNumber(market.totalNoShares, 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 已结算市场盈亏明细 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              已结算市场盈亏明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            ) : marketsPnL.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                暂无已结算市场
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        市场
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        买入收入
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        卖出支出
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        结算支付
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        盈亏
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketsPnL.map((market) => (
                      <tr
                        key={market.marketId}
                        className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium truncate max-w-[250px]">
                            {market.title}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">
                          +{formatCurrency(market.buyVolume)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">
                          -{formatCurrency(market.sellVolume)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">
                          -{formatCurrency(market.settlementPayout)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            market.pnl >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {market.pnl >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {formatCurrency(market.pnl)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  BarChart3,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { marketsApi, tradesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  formatPercent,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getMarketStatusText,
  getMarketStatusColor,
} from "@/lib/utils";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  outcome: string | null;
  yes_shares: number;
  no_shares: number;
  yes_price: number;
  no_price: number;
  volume: number;
  liquidity: number;
  current_liquidity: number;
  start_time: string;
  end_time: string;
  resolution_source?: string;
}

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { token, wallet, setWallet } = useAuthStore();

  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeSide, setTradeSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadMarket();
  }, [params.id]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && market && token) {
      getQuote();
    } else {
      setQuote(null);
    }
  }, [amount, tradeType, tradeSide, market]);

  const loadMarket = async () => {
    try {
      const data = await marketsApi.getById(params.id as string);
      setMarket(data);
    } catch (error) {
      console.error("Failed to load market:", error);
      toast({
        title: "加载失败",
        description: "无法加载市场详情",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuote = async () => {
    if (!token || !market) return;
    setQuoteLoading(true);
    try {
      const data = await marketsApi.getQuote(token, market.id, {
        type: tradeType,
        side: tradeSide,
        amount: tradeType === "buy" ? parseFloat(amount) : undefined,
        shares: tradeType === "sell" ? parseFloat(amount) : undefined,
      });
      setQuote(data);
    } catch (error: any) {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const executeTrade = async () => {
    if (!token || !market || !quote) return;
    setExecuting(true);
    try {
      const result = await tradesApi.execute(token, {
        marketId: market.id,
        type: tradeType,
        side: tradeSide,
        amount: tradeType === "buy" ? parseFloat(amount) : undefined,
        shares: tradeType === "sell" ? parseFloat(amount) : undefined,
      });

      toast({
        title: "交易成功",
        description: `${tradeType === "buy" ? "买入" : "卖出"} ${
          tradeSide === "yes" ? "是" : "否"
        } ${result.shares.toFixed(2)} 份`,
        variant: "success",
      });

      // Refresh market data
      loadMarket();
      setAmount("");
      setQuote(null);

      // Update wallet balance
      if (wallet) {
        const newBalance =
          tradeType === "buy"
            ? wallet.balance - result.cost
            : wallet.balance + result.amountReceived;
        setWallet({ ...wallet, balance: newBalance });
      }
    } catch (error: any) {
      toast({
        title: "交易失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">市场不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const isActive = market.status === "active";

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回市场列表
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Info */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{market.category}</Badge>
                      <Badge
                        variant={isActive ? "success" : "secondary"}
                        className={getMarketStatusColor(market.status)}
                      >
                        {getMarketStatusText(market.status)}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{market.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">{market.description}</p>

                {/* Price Display */}
                <div className="space-y-4">
                  <h3 className="font-semibold">当前价格</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span className="font-medium text-green-400">是</span>
                      </div>
                      <div className="text-3xl font-bold text-green-400">
                        {formatPercent(market.yes_price)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <span className="font-medium text-red-400">否</span>
                      </div>
                      <div className="text-3xl font-bold text-red-400">
                        {formatPercent(market.no_price)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground mb-1">
                      交易量
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(market.volume)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground mb-1">
                      流动性
                    </div>
                    <div className="font-semibold">
                      {market.current_liquidity?.toFixed(0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground mb-1">
                      开始时间
                    </div>
                    <div className="font-semibold text-sm">
                      {formatDate(market.start_time)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <div className="text-sm text-muted-foreground mb-1">
                      结束时间
                    </div>
                    <div className="font-semibold text-sm">
                      {formatDate(market.end_time)}
                    </div>
                  </div>
                </div>

                {market.resolution_source && (
                  <div className="p-4 rounded-lg bg-secondary/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">结果来源</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {market.resolution_source}
                    </p>
                  </div>
                )}

                {market.outcome && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-lg font-semibold">
                      结算结果：{market.outcome === "yes" ? "是" : "否"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>交易面板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isActive ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>市场暂未开放交易</p>
                  </div>
                ) : (
                  <>
                    {/* Trade Type Tabs */}
                    <Tabs
                      value={tradeType}
                      onValueChange={(v) => setTradeType(v as "buy" | "sell")}
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buy">买入</TabsTrigger>
                        <TabsTrigger value="sell">卖出</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {/* Side Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={tradeSide === "yes" ? "default" : "outline"}
                        className={
                          tradeSide === "yes"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                        onClick={() => setTradeSide("yes")}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        是
                      </Button>
                      <Button
                        variant={tradeSide === "no" ? "default" : "outline"}
                        className={
                          tradeSide === "no"
                            ? "bg-red-600 hover:bg-red-700"
                            : ""
                        }
                        onClick={() => setTradeSide("no")}
                      >
                        <TrendingDown className="w-4 h-4 mr-2" />
                        否
                      </Button>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label>
                        {tradeType === "buy" ? "金额" : "份额"}
                      </Label>
                      <Input
                        type="number"
                        placeholder={
                          tradeType === "buy" ? "输入金额" : "输入份额"
                        }
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                      {wallet && tradeType === "buy" && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>可用余额</span>
                          <span>{formatCurrency(wallet.balance)}</span>
                        </div>
                      )}
                    </div>

                    {/* Quote */}
                    {quote && (
                      <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {tradeType === "buy" ? "获得份额" : "获得金额"}
                          </span>
                          <span className="font-medium">
                            {tradeType === "buy"
                              ? `${quote.shares?.toFixed(4)} 份`
                              : formatCurrency(quote.amountReceived || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">平均价格</span>
                          <span className="font-medium">
                            {formatPercent(quote.avgPrice || 0)}
                          </span>
                        </div>
                        {quote.priceImpact !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              价格影响
                            </span>
                            <span
                              className={
                                quote.priceImpact > 0.05
                                  ? "text-red-400"
                                  : "font-medium"
                              }
                            >
                              {formatPercent(quote.priceImpact)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Execute Button */}
                    <Button
                      className="w-full"
                      variant={tradeSide === "yes" ? "success" : "destructive"}
                      disabled={
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        !quote ||
                        executing
                      }
                      onClick={executeTrade}
                    >
                      {executing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        `${tradeType === "buy" ? "买入" : "卖出"} ${
                          tradeSide === "yes" ? "是" : "否"
                        }`
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Market Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">市场信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    剩余时间
                  </span>
                  <span className="font-medium">
                    {formatRelativeTime(market.end_time)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    是份额
                  </span>
                  <span className="font-medium">
                    {market.yes_shares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    否份额
                  </span>
                  <span className="font-medium">
                    {market.no_shares.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


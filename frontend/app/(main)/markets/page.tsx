"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { marketsApi } from "@/lib/api";
import {
  formatPercent,
  formatCurrency,
  formatRelativeTime,
  getMarketStatusText,
} from "@/lib/utils";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  yes_price: number;
  no_price: number;
  volume: number;
  end_time: string;
  image_url?: string;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadMarkets();
    loadCategories();
  }, [category]);

  const loadMarkets = async () => {
    try {
      const params: any = { status: "active" };
      if (category !== "all") {
        params.category = category;
      }
      const result = await marketsApi.getAll(params);
      setMarkets(result.data || []);
    } catch (error) {
      console.error("Failed to load markets:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await marketsApi.getCategories();
      setCategories(result);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const filteredMarkets = markets.filter(
    (market) =>
      market.title.toLowerCase().includes(search.toLowerCase()) ||
      market.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
        <div className="relative p-8 md:p-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">
              预测市场
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            探索并参与预测市场
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            基于 AMM
            自动做市商模式，公平透明的预测市场。交易您对未来事件的预测，赢取回报。
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索市场..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat || "default"}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-4" />
                <div className="h-8 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">暂无市场</h3>
            <p className="text-sm">当前没有活跃的预测市场</p>
          </div>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredMarkets.map((market, index) => (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/markets/${market.id}`}>
                <Card className="h-full hover:border-primary/50 transition-all duration-300 group cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="secondary" className="mb-2">
                        {market.category}
                      </Badge>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {market.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {market.description}
                    </p>

                    {/* Price Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1 text-green-400">
                          <TrendingUp className="w-3 h-3" />是{" "}
                          {formatPercent(market.yes_price)}
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          否 {formatPercent(market.no_price)}
                          <TrendingDown className="w-3 h-3" />
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden bg-red-500/30">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                          style={{ width: `${market.yes_price * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>交易量: {formatCurrency(market.volume)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(market.end_time)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

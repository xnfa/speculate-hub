"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getMarketStatusText,
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
  start_time: string;
  end_time: string;
}

export default function AdminMarketsPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    liquidity: 1000,
    startTime: "",
    endTime: "",
    resolutionSource: "",
  });

  useEffect(() => {
    loadMarkets();
  }, [page, statusFilter]);

  const loadMarkets = async () => {
    if (!token) return;
    try {
      const result = await adminApi.getMarkets(
        token,
        page,
        20,
        statusFilter !== "all" ? statusFilter : undefined
      );
      setMarkets(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load markets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      await adminApi.createMarket(token, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        liquidity: formData.liquidity,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        resolutionSource: formData.resolutionSource,
      });
      toast({
        title: "创建成功",
        description: "市场已创建",
        variant: "success",
      });
      setCreateOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "",
        liquidity: 1000,
        startTime: "",
        endTime: "",
        resolutionSource: "",
      });
      loadMarkets();
    } catch (error: any) {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (
    marketId: string,
    status: string
  ) => {
    if (!token) return;
    try {
      await adminApi.updateMarketStatus(token, marketId, status);
      toast({
        title: "操作成功",
        description: `市场状态已更新为 ${getMarketStatusText(status)}`,
        variant: "success",
      });
      loadMarkets();
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResolveMarket = async (outcome: "yes" | "no") => {
    if (!token || !selectedMarket) return;
    setProcessing(true);
    try {
      await adminApi.resolveMarket(token, selectedMarket.id, outcome);
      toast({
        title: "结算成功",
        description: `市场已结算，结果: ${outcome === "yes" ? "是" : "否"}`,
        variant: "success",
      });
      setResolveOpen(false);
      setSelectedMarket(null);
      loadMarkets();
    } catch (error: any) {
      toast({
        title: "结算失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "suspended":
        return "warning";
      case "resolved":
        return "info";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredMarkets = markets.filter(
    (market) =>
      market.title.toLowerCase().includes(search.toLowerCase()) ||
      market.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">市场管理</h1>
          <p className="text-muted-foreground">创建和管理预测市场</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          创建市场
        </Button>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              市场列表
            </CardTitle>
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="active">进行中</SelectItem>
                  <SelectItem value="suspended">已暂停</SelectItem>
                  <SelectItem value="resolved">已结算</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索市场..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMarkets.map((market) => (
                <div
                  key={market.id}
                  className="p-4 rounded-lg border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusBadgeVariant(market.status) as any}>
                          {getMarketStatusText(market.status)}
                        </Badge>
                        <Badge variant="outline">{market.category}</Badge>
                        {market.outcome && (
                          <Badge variant="info">
                            结果: {market.outcome === "yes" ? "是" : "否"}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{market.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>交易量: {formatCurrency(market.volume)}</span>
                        <span>是: {formatPercent(market.yes_price)}</span>
                        <span>否: {formatPercent(market.no_price)}</span>
                        <span>结束: {formatDate(market.end_time)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {market.status === "draft" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(market.id, "active")
                            }
                          >
                            <Play className="w-4 h-4 mr-2" />
                            发布市场
                          </DropdownMenuItem>
                        )}
                        {market.status === "active" && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(market.id, "suspended")
                              }
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              暂停市场
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMarket(market);
                                setResolveOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              结算市场
                            </DropdownMenuItem>
                          </>
                        )}
                        {market.status === "suspended" && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(market.id, "active")
                              }
                            >
                              <Play className="w-4 h-4 mr-2" />
                              恢复市场
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMarket(market);
                                setResolveOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              结算市场
                            </DropdownMenuItem>
                          </>
                        )}
                        {(market.status === "draft" ||
                          market.status === "active" ||
                          market.status === "suspended") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                handleUpdateStatus(market.id, "cancelled")
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              取消市场
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
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

      {/* Create Market Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建市场</DialogTitle>
            <DialogDescription>创建新的预测市场</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                placeholder="市场标题"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <textarea
                className="w-full h-24 px-3 py-2 rounded-lg border bg-background resize-none"
                placeholder="市场描述..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  placeholder="例如: 加密货币"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>初始流动性</Label>
                <Input
                  type="number"
                  value={formData.liquidity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      liquidity: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>结果来源（可选）</Label>
              <Input
                placeholder="结果判定来源说明"
                value={formData.resolutionSource}
                onChange={(e) =>
                  setFormData({ ...formData, resolutionSource: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateMarket} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建市场"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Market Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>结算市场</DialogTitle>
            <DialogDescription>
              选择市场结果进行结算。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedMarket && (
            <div className="py-4">
              <p className="font-medium mb-4">{selectedMarket.title}</p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleResolveMarket("yes")}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "结果: 是"
                  )}
                </Button>
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleResolveMarket("no")}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "结果: 否"
                  )}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


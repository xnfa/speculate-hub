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
  Loader2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Calendar as CalendarIcon,
  FileText,
  Tag,
  Link2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useToast } from "@/components/ui/use-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getMarketStatusText,
} from "@/lib/utils";

// 表单验证 Schema
const createMarketSchema = z
  .object({
    title: z
      .string()
      .min(5, "标题至少需要 5 个字符")
      .max(100, "标题不能超过 100 个字符"),
    description: z
      .string()
      .max(500, "描述不能超过 500 个字符")
      .optional()
      .or(z.literal("")),
    category: z
      .string()
      .min(2, "分类至少需要 2 个字符")
      .max(20, "分类不能超过 20 个字符"),
    liquidity: z
      .number()
      .min(100, "初始流动性至少为 100")
      .max(1000000, "初始流动性不能超过 1,000,000"),
    startTime: z.date({
      required_error: "请选择开始时间",
    }),
    endTime: z.date({
      required_error: "请选择结束时间",
    }),
    resolutionSource: z
      .string()
      .max(200, "来源说明不能超过 200 个字符")
      .optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "结束时间必须晚于开始时间",
    path: ["endTime"],
  });

type CreateMarketFormData = z.infer<typeof createMarketSchema>;

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

// 预设分类
const CATEGORIES = [
  { value: "加密货币", label: "加密货币" },
  { value: "政治", label: "政治" },
  { value: "体育", label: "体育" },
  { value: "科技", label: "科技" },
  { value: "娱乐", label: "娱乐" },
  { value: "经济", label: "经济" },
  { value: "其他", label: "其他" },
];

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

  // Form
  const form = useForm<CreateMarketFormData>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      liquidity: 1000,
      resolutionSource: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const watchedStartTime = watch("startTime");
  const watchedCategory = watch("category");

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

  const onSubmit = async (data: CreateMarketFormData) => {
    if (!token) return;
    setProcessing(true);
    try {
      await adminApi.createMarket(token, {
        title: data.title,
        description: data.description,
        category: data.category,
        liquidity: data.liquidity,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        resolutionSource: data.resolutionSource || "",
      });
      toast({
        title: "创建成功",
        description: "市场已创建",
        variant: "success",
      });
      setCreateOpen(false);
      reset();
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

  const handleUpdateStatus = async (marketId: string, status: string) => {
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

  const handleDialogOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      reset();
    }
  };

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
                        <Badge
                          variant={getStatusBadgeVariant(market.status) as any}
                        >
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
      <Dialog open={createOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">创建新市场</DialogTitle>
                <DialogDescription className="mt-1">
                  填写以下信息创建一个新的预测市场
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  基本信息
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    市场标题 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="例如：BTC 会在 2024 年底突破 10 万美元吗？"
                    {...register("title")}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">市场描述</Label>
                  <Textarea
                    id="description"
                    placeholder="详细描述市场的判定条件和规则..."
                    className={`min-h-[100px] ${
                      errors.description ? "border-destructive" : ""
                    }`}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              {/* 分类和流动性 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  分类与资金
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      分类 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={watchedCategory}
                      onValueChange={(value) => setValue("category", value)}
                    >
                      <SelectTrigger
                        className={errors.category ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="liquidity">
                      初始流动性 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="liquidity"
                        type="number"
                        className={`pl-9 ${
                          errors.liquidity ? "border-destructive" : ""
                        }`}
                        {...register("liquidity", { valueAsNumber: true })}
                      />
                    </div>
                    {errors.liquidity && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.liquidity.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 时间设置 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  时间设置
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      开始时间 <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                      value={watchedStartTime}
                      onChange={(date) => setValue("startTime", date as Date)}
                      placeholder="选择开始时间"
                      error={!!errors.startTime}
                    />
                    {errors.startTime && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      结束时间 <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                      value={watch("endTime")}
                      onChange={(date) => setValue("endTime", date as Date)}
                      placeholder="选择结束时间"
                      minDate={watchedStartTime || new Date()}
                      error={!!errors.endTime}
                    />
                    {errors.endTime && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 结果来源 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  其他信息
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="resolutionSource">结果来源（可选）</Label>
                  <Input
                    id="resolutionSource"
                    placeholder="例如：以 CoinGecko 官方数据为准"
                    {...register("resolutionSource")}
                    className={
                      errors.resolutionSource ? "border-destructive" : ""
                    }
                  />
                  {errors.resolutionSource && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.resolutionSource.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    说明市场结果判定的数据来源，增加透明度
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={processing}
                className="min-w-[100px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    创建市场
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
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

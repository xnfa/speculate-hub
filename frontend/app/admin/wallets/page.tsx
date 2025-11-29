"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Search,
  Plus,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  frozen_balance: number;
  created_at: string;
  users: {
    id: string;
    email: string;
    username: string;
  };
}

export default function AdminWalletsPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [page]);

  const loadWallets = async () => {
    if (!token) return;
    try {
      const result = await adminApi.getWallets(token, page);
      setWallets(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load wallets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!token || !selectedWallet || !depositAmount) return;
    setProcessing(true);
    try {
      await adminApi.adminDeposit(
        token,
        selectedWallet.user_id,
        parseFloat(depositAmount)
      );
      toast({
        title: "充值成功",
        description: `已为用户 ${selectedWallet.users.username} 充值 ${formatCurrency(parseFloat(depositAmount))}`,
        variant: "success",
      });
      setDepositOpen(false);
      setSelectedWallet(null);
      setDepositAmount("");
      loadWallets();
    } catch (error: any) {
      toast({
        title: "充值失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredWallets = wallets.filter(
    (wallet) =>
      wallet.users?.email?.toLowerCase().includes(search.toLowerCase()) ||
      wallet.users?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">钱包管理</h1>
        <p className="text-muted-foreground">管理用户钱包和充值</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平台总资金
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              钱包数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均余额
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(wallets.length > 0 ? totalBalance / wallets.length : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              钱包列表
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
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
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 animate-pulse"
                >
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      用户
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      余额
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      冻结
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      创建时间
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallets.map((wallet) => (
                    <tr
                      key={wallet.id}
                      className="border-b hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {wallet.users?.username || "-"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {wallet.users?.email || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        {formatCurrency(wallet.balance)}
                      </td>
                      <td className="py-4 px-4 text-right text-muted-foreground">
                        {formatCurrency(wallet.frozen_balance)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDate(wallet.created_at)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setDepositOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              充值
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理员充值</DialogTitle>
            <DialogDescription>
              为用户 {selectedWallet?.users?.username} 充值
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>当前余额</Label>
              <div className="text-lg font-semibold">
                {formatCurrency(selectedWallet?.balance || 0)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>充值金额</Label>
              <Input
                type="number"
                placeholder="输入金额"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(preset.toString())}
                >
                  ¥{preset}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认充值"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


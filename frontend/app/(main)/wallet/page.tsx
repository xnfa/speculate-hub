"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Plus,
  Minus,
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
import { useToast } from "@/components/ui/use-toast";
import { walletsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "trade" | "settlement" | "refund";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function WalletPage() {
  const { token, wallet, setWallet } = useAuthStore();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, []);

  const loadWallet = async () => {
    if (!token) return;
    try {
      const data = await walletsApi.getWallet(token);
      setWallet(data);
    } catch (error) {
      console.error("Failed to load wallet:", error);
    }
  };

  const loadTransactions = async () => {
    if (!token) return;
    try {
      const result = await walletsApi.getTransactions(token);
      setTransactions(result.data || []);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!token || !amount || parseFloat(amount) <= 0) return;
    setProcessing(true);
    try {
      const result = await walletsApi.deposit(token, parseFloat(amount));
      setWallet(result);
      toast({
        title: "充值成功",
        description: `已充值 ${formatCurrency(parseFloat(amount))}`,
        variant: "success",
      });
      setDepositOpen(false);
      setAmount("");
      loadTransactions();
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

  const handleWithdraw = async () => {
    if (!token || !amount || parseFloat(amount) <= 0) return;
    setProcessing(true);
    try {
      const result = await walletsApi.withdraw(token, parseFloat(amount));
      setWallet(result);
      toast({
        title: "提现成功",
        description: `已提现 ${formatCurrency(parseFloat(amount))}`,
        variant: "success",
      });
      setWithdrawOpen(false);
      setAmount("");
      loadTransactions();
    } catch (error: any) {
      toast({
        title: "提现失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case "withdraw":
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case "trade":
        return <History className="w-4 h-4 text-blue-400" />;
      case "settlement":
        return <ArrowDownLeft className="w-4 h-4 text-purple-400" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      deposit: "充值",
      withdraw: "提现",
      trade: "交易",
      settlement: "结算",
      refund: "退款",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">我的钱包</h1>
        <p className="text-muted-foreground">管理您的资金和交易记录</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg text-muted-foreground">
                    账户余额
                  </span>
                </div>
                <div className="text-4xl font-bold mb-2">
                  {formatCurrency(wallet?.balance || 0)}
                </div>
                {wallet?.frozen_balance && wallet.frozen_balance > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    冻结金额: {formatCurrency(wallet.frozen_balance)}
                  </div>
                ) : undefined}
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  onClick={() => setDepositOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  充值
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setWithdrawOpen(true)}
                  className="gap-2"
                >
                  <Minus className="w-4 h-4" />
                  提现
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              交易记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                    <div className="h-4 bg-muted rounded w-20" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无交易记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getTransactionTypeText(tx.type)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {tx.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tx.description || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          tx.amount >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        余额: {formatCurrency(tx.balance_after)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>充值</DialogTitle>
            <DialogDescription>向您的账户充值资金</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>充值金额</Label>
              <Input
                type="number"
                placeholder="输入金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
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
              disabled={!amount || parseFloat(amount) <= 0 || processing}
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

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提现</DialogTitle>
            <DialogDescription>
              从您的账户提现资金（可用余额:{" "}
              {formatCurrency(wallet?.balance || 0)}）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>提现金额</Label>
              <Input
                type="number"
                placeholder="输入金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={wallet?.balance}
                step="1"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount((wallet?.balance || 0).toString())}
            >
              全部提现
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > (wallet?.balance || 0) ||
                processing
              }
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认提现"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  LayoutGrid,
  Wallet,
  History,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, wallet, isAuthenticated, isAdmin, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // 确保组件在客户端挂载后才进行认证检查，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // 在客户端挂载完成前显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/markets" className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Speculate Hub</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/markets"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                市场
              </Link>
              <Link
                href="/portfolio"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                持仓
              </Link>
              <Link
                href="/wallet"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                钱包
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Wallet Balance */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {formatCurrency(wallet?.balance || 0)}
              </span>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline">{user?.username}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/portfolio" className="cursor-pointer">
                    <History className="mr-2 h-4 w-4" />
                    我的持仓
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wallet" className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4" />
                    我的钱包
                  </Link>
                </DropdownMenuItem>
                {isAdmin() && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        管理后台
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  ChevronLeft,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "盈利分析", icon: DollarSign },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/wallets", label: "钱包管理", icon: Wallet },
  { href: "/admin/markets", label: "市场管理", icon: Target },
  { href: "/admin/trades", label: "交易记录", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保组件在客户端挂载后才进行认证检查，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (!isAdmin()) {
      router.push("/markets");
    }
  }, [mounted, isAuthenticated, isAdmin, router]);

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

  if (!isAuthenticated() || !isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-xl">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold">管理后台</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-card border-r transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold">管理后台</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform",
                !sidebarOpen && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <Link
            href="/markets"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mb-2"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>返回前台</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

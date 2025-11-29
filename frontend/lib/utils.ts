import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toFixed(decimals);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diff < 0) {
    return "已结束";
  }

  if (days > 0) {
    return `${days}天${hours}小时`;
  }

  if (hours > 0) {
    return `${hours}小时`;
  }

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}分钟`;
}

export function getMarketStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "草稿",
    active: "进行中",
    suspended: "已暂停",
    resolved: "已结算",
    cancelled: "已取消",
  };
  return statusMap[status] || status;
}

export function getMarketStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: "text-muted-foreground",
    active: "text-green-400",
    suspended: "text-yellow-400",
    resolved: "text-blue-400",
    cancelled: "text-red-400",
  };
  return colorMap[status] || "text-muted-foreground";
}

export function getOutcomeText(outcome: string | null): string {
  if (!outcome) return "-";
  return outcome === "yes" ? "是" : "否";
}


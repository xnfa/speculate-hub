const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.message || "请求失败");
  }

  return data;
}

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: any; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Users API
export const usersApi = {
  getMe: (token: string) => request<any>("/users/me", { token }),
};

// Wallets API
export const walletsApi = {
  getWallet: (token: string) => request<any>("/wallets", { token }),

  deposit: (token: string, amount: number) =>
    request<any>("/wallets/deposit", {
      method: "POST",
      body: JSON.stringify({ amount }),
      token,
    }),

  withdraw: (token: string, amount: number) =>
    request<any>("/wallets/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
      token,
    }),

  getTransactions: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/wallets/transactions?page=${page}&limit=${limit}`, {
      token,
    }),
};

// Markets API
export const marketsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.category) searchParams.set("category", params.category);
    return request<any>(`/markets?${searchParams.toString()}`);
  },

  getActive: (page: number = 1, limit: number = 20) =>
    request<any>(`/markets/active?page=${page}&limit=${limit}`),

  getById: (id: string) => request<any>(`/markets/${id}`),

  getCategories: () => request<string[]>("/markets/categories"),

  getQuote: (
    token: string,
    marketId: string,
    data: {
      type: "buy" | "sell";
      side: "yes" | "no";
      amount?: number;
      shares?: number;
    }
  ) =>
    request<any>(`/markets/${marketId}/quote`, {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),
};

// Trades API
export const tradesApi = {
  execute: (
    token: string,
    data: {
      marketId: string;
      type: "buy" | "sell";
      side: "yes" | "no";
      amount?: number;
      shares?: number;
    }
  ) =>
    request<any>("/trades", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  getMyTrades: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/trades?page=${page}&limit=${limit}`, { token }),

  getMyPositions: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/trades/positions?page=${page}&limit=${limit}`, { token }),
};

// Admin API
export const adminApi = {
  getStats: (token: string) => request<any>("/admin/stats", { token }),

  getUsers: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/admin/users?page=${page}&limit=${limit}`, { token }),

  updateUserStatus: (token: string, userId: string, isActive: boolean) =>
    request<any>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
      token,
    }),

  updateUserRole: (token: string, userId: string, role: "user" | "admin") =>
    request<any>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      token,
    }),

  getWallets: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/admin/wallets?page=${page}&limit=${limit}`, { token }),

  adminDeposit: (token: string, userId: string, amount: number) =>
    request<any>(`/admin/wallets/${userId}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount }),
      token,
    }),

  getMarkets: (
    token: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.set("status", status);
    return request<any>(`/admin/markets?${params.toString()}`, { token });
  },

  createMarket: (token: string, data: any) =>
    request<any>("/admin/markets", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateMarket: (token: string, marketId: string, data: any) =>
    request<any>(`/admin/markets/${marketId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    }),

  updateMarketStatus: (token: string, marketId: string, status: string) =>
    request<any>(`/admin/markets/${marketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),

  resolveMarket: (token: string, marketId: string, outcome: "yes" | "no") =>
    request<any>(`/admin/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
      token,
    }),

  getTrades: (token: string, page: number = 1, limit: number = 20) =>
    request<any>(`/admin/trades?page=${page}&limit=${limit}`, { token }),

  // Analytics - 盈利分析
  getAnalyticsOverview: (token: string) =>
    request<{
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
    }>("/admin/analytics/overview", { token }),

  getMarketsPnL: (token: string) =>
    request<{
      totalAMMPnL: number;
      resolvedAMMPnL: number;
      marketDetails: Array<{
        marketId: string;
        title: string;
        buyVolume: number;
        sellVolume: number;
        settlementPayout: number;
        pnl: number;
        status: string;
      }>;
    }>("/admin/analytics/markets", { token }),

  getExposure: (token: string) =>
    request<{
      totalMaxExposure: number;
      marketCount: number;
      marketExposures: Array<{
        marketId: string;
        title: string;
        status: string;
        totalYesShares: number;
        totalNoShares: number;
        maxExposure: number;
      }>;
    }>("/admin/analytics/exposure", { token }),

  getTopContributors: (token: string, limit: number = 10) =>
    request<
      Array<{
        userId: string;
        totalFees: number;
        totalVolume: number;
        tradeCount: number;
        user: {
          id: string;
          username: string;
          email: string;
        } | null;
      }>
    >(`/admin/analytics/top-contributors?limit=${limit}`, { token }),
};

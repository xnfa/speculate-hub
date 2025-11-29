import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
}

interface Wallet {
  balance: number;
  frozen_balance: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  wallet: Wallet | null;
  setAuth: (user: User, token: string) => void;
  setWallet: (wallet: Wallet) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      wallet: null,
      setAuth: (user, token) => set({ user, token }),
      setWallet: (wallet) => set({ wallet }),
      logout: () => set({ user: null, token: null, wallet: null }),
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "auth-storage",
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));


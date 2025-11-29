"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/markets");
    } else {
      router.push("/login");
    }
  }, [router, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-xl text-muted-foreground">
        加载中...
      </div>
    </div>
  );
}


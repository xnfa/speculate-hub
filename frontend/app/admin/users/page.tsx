"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    if (!token) return;
    try {
      const result = await adminApi.getUsers(token, page);
      setUsers(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!token) return;
    try {
      await adminApi.updateUserStatus(token, userId, !currentStatus);
      toast({
        title: "操作成功",
        description: `用户已${!currentStatus ? "启用" : "禁用"}`,
        variant: "success",
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleRole = async (
    userId: string,
    currentRole: "user" | "admin"
  ) => {
    if (!token) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await adminApi.updateUserRole(token, userId, newRole);
      toast({
        title: "操作成功",
        description: `用户角色已更新为 ${newRole === "admin" ? "管理员" : "普通用户"}`,
        variant: "success",
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">用户管理</h1>
        <p className="text-muted-foreground">管理平台注册用户</p>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              用户列表
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      角色
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      状态
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      注册时间
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {user.role === "admin" ? "管理员" : "用户"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={user.is_active ? "success" : "destructive"}
                        >
                          {user.is_active ? "正常" : "禁用"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
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
                              onClick={() =>
                                handleToggleStatus(user.id, user.is_active)
                              }
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  禁用用户
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  启用用户
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleRole(user.id, user.role)
                              }
                            >
                              {user.role === "admin" ? (
                                <>
                                  <ShieldOff className="w-4 h-4 mr-2" />
                                  取消管理员
                                </>
                              ) : (
                                <>
                                  <Shield className="w-4 h-4 mr-2" />
                                  设为管理员
                                </>
                              )}
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

          {/* Pagination */}
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
    </div>
  );
}


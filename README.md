# Speculate Hub - 中心化预测市场

一个基于自动做市商（AMM）模式的中心化预测市场平台。

## 技术栈

### 后端
- **NestJS** - Node.js 后端框架
- **Supabase** - 数据库和身份认证
- **TypeScript** - 类型安全

### 前端
- **Next.js 14** - React 框架（App Router）
- **shadcn/ui** - UI 组件库
- **Tailwind CSS** - 样式框架
- **TypeScript** - 类型安全

## 功能特性

### 用户端
- 🔐 用户注册/登录
- 💰 钱包充值/提现
- 📊 预测市场浏览
- 💹 买入/卖出预测份额
- 📈 持仓管理

### 管理后台
- 👥 用户管理
- 💳 钱包管理
- 🎯 市场管理（创建/结算）
- 📉 交易监控
- 📊 数据统计

## AMM 算法

使用恒定乘积做市商（Constant Product Market Maker）算法：

```
x * y = k (恒定乘积)
```

其中：
- x: YES 份额数量
- y: NO 份额数量
- k: 常数（流动性）

价格计算：
- YES 价格 = y / (x + y)
- NO 价格 = x / (x + y)

## 项目结构

```
speculate-hub-claude/
├── backend/          # NestJS 后端
│   ├── src/
│   │   ├── auth/     # 认证模块
│   │   ├── users/    # 用户模块
│   │   ├── wallets/  # 钱包模块
│   │   ├── markets/  # 市场模块
│   │   ├── trades/   # 交易模块
│   │   └── amm/      # AMM 算法
│   └── ...
├── frontend/         # Next.js 前端
│   ├── app/
│   │   ├── (main)/   # 用户端页面
│   │   └── admin/    # 管理后台
│   ├── components/
│   └── ...
└── README.md
```

## 快速开始

### 环境要求
- Node.js 18+
- pnpm

### 后端启动

```bash
cd backend
pnpm install
pnpm start:dev
```

### 前端启动

```bash
cd frontend
pnpm install
pnpm dev
```

## 环境变量

### 后端 (.env)
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
```

### 前端 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## License

MIT


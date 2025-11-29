# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies - use npm rebuild for native modules
RUN pnpm install --frozen-lockfile && npm rebuild bcrypt

# Copy source files
COPY . .

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm (required because package.json specifies packageManager)
RUN npm install -g pnpm

# Copy everything from builder (including compiled native modules)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "dist/main"]

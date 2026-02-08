# How to Set Up a Next.js + PostgreSQL + Redis Stack with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Next.js, PostgreSQL, Redis, Node.js, React, Full-Stack

Description: Learn how to containerize a Next.js application with PostgreSQL and Redis using Docker Compose for consistent development environments.

---

Next.js has grown from a React framework into a full-stack platform. With API routes, server components, and server actions, you can build entire applications without ever leaving Next.js. Adding PostgreSQL for your database and Redis for caching or session storage rounds out the stack nicely. Docker Compose brings all three together so every developer on your team runs the exact same setup.

This guide covers everything from the Dockerfile to production-ready compose configuration. You will end up with a stack that starts in seconds and works identically on every machine.

## Prerequisites

Make sure you have Docker Engine 20.10+ and Docker Compose V2 installed. You will also want Node.js 18+ locally if you plan to run `next dev` outside Docker for hot reloading during development.

## Project Structure

```
nextjs-postgres-redis/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── next.config.js
├── package.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   ├── lib/
│   │   ├── db.ts
│   │   └── redis.ts
│   └── ...
└── .env.local
```

## The Dockerfile

Next.js applications benefit greatly from multi-stage builds. The final image only needs the production output, not the full `node_modules` directory.

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Copy only package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Generate Prisma client before building
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner with minimal footprint
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy the standalone output from the builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

For this multi-stage build to work, enable standalone output in your Next.js config:

```javascript
// next.config.js - Enable standalone output for Docker
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

## Dockerignore File

Keep your build context small with a proper `.dockerignore`:

```
# Exclude files not needed in the Docker build
node_modules
.next
.git
*.md
.env*.local
```

## Docker Compose Configuration

```yaml
# Next.js + PostgreSQL + Redis development stack
version: "3.8"

services:
  # Next.js application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://appuser:apppassword@postgres:5432/nextapp
      REDIS_URL: redis://redis:6379
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: your-secret-key-change-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
      POSTGRES_DB: nextapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d nextapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

## Development Override

For local development, you probably want hot reloading instead of running the production build. Create a `docker-compose.override.yml` that Docker Compose automatically picks up:

```yaml
# docker-compose.override.yml - Development overrides with hot reloading
version: "3.8"

services:
  app:
    build:
      target: deps
    command: sh -c "npm ci && npx prisma generate && npm run dev"
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
      - ./public:/app/public
      - ./next.config.js:/app/next.config.js
    environment:
      NODE_ENV: development
```

This mounts your source code into the container so file changes trigger hot reloads automatically.

## Prisma Schema

Define your database models with Prisma:

```prisma
// prisma/schema.prisma - Database schema definition
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

## Database and Redis Client Setup

```typescript
// src/lib/db.ts - Prisma client singleton for Next.js
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

```typescript
// src/lib/redis.ts - Redis client with connection reuse
import { createClient } from "redis";

const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient>;
};

export const redis =
  globalForRedis.redis ||
  createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

if (!globalForRedis.redis) {
  redis.connect();
  globalForRedis.redis = redis;
}
```

## Using Redis for Caching in API Routes

```typescript
// src/app/api/posts/route.ts - API route with Redis caching
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  // Try cache first
  const cached = await redis.get("posts:all");
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Cache miss - fetch from database
  const posts = await prisma.post.findMany({
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  // Store in cache with 5-minute TTL
  await redis.set("posts:all", JSON.stringify(posts), { EX: 300 });

  return NextResponse.json(posts);
}
```

## Running the Stack

```bash
# Start everything in development mode
docker compose up --build -d

# Run Prisma migrations
docker compose exec app npx prisma migrate dev --name init

# Seed the database if you have a seed script
docker compose exec app npx prisma db seed

# View logs
docker compose logs -f app
```

## Checking Connectivity

```bash
# Verify the Next.js app responds
curl http://localhost:3000/api/posts

# Connect to PostgreSQL directly
docker compose exec postgres psql -U appuser -d nextapp -c "\dt"

# Check Redis keys
docker compose exec redis redis-cli keys "*"
```

## Production Considerations

When deploying this stack to production, swap the development override for a production compose file:

```bash
# Use only the base compose file (no override)
docker compose -f docker-compose.yml up --build -d
```

Set real secrets through environment variables or Docker secrets rather than hardcoding them in the compose file. Enable SSL on PostgreSQL and set a Redis password for production environments.

## Summary

You now have a complete full-stack Next.js development environment with PostgreSQL and Redis, all managed by Docker Compose. The multi-stage Dockerfile produces a minimal production image, the development override gives you hot reloading, and Prisma handles your database schema and migrations. This stack is ready for everything from a side project to a production application.

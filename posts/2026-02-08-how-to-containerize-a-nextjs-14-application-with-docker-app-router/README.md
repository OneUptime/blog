# How to Containerize a Next.js 14+ Application with Docker (App Router)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, next.js, app router, react, containerization, multi-stage builds, standalone

Description: Complete guide to containerizing a Next.js 14+ App Router application with optimized Docker builds

---

Next.js 14+ with the App Router introduces server components, server actions, and a new rendering model that affects how you containerize the application. The standalone output mode is essential for Docker deployments, and getting it right means the difference between a 1GB image that takes minutes to start and a 150MB image that starts in seconds. This guide covers the full setup from Dockerfile to production-ready configuration.

## Prerequisites

Make sure your Next.js project uses version 14 or later with the App Router. Your `next.config.js` (or `next.config.mjs`) needs the standalone output option:

```javascript
// next.config.mjs - Enable standalone output for Docker
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

The `standalone` mode creates a self-contained build that includes only the necessary files and a minimal Node.js server. Without it, you would need to copy the entire `node_modules` directory into the Docker image.

## The Dockerfile

Here is the complete, production-optimized Dockerfile:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for the build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public directory for static assets
COPY --from=builder /app/public ./public

# Set correct permissions for the prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone server
CMD ["node", "server.js"]
```

Let's break down what each stage does and why.

## Stage 1: Dependencies

The first stage installs dependencies in isolation:

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
```

The `libc6-compat` package is needed on Alpine for some native Node.js modules. By copying only package files before running `npm ci`, Docker caches this layer. Dependencies only reinstall when `package.json` or `package-lock.json` changes.

## Stage 2: Build

The build stage compiles the Next.js application:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build
```

Setting `NODE_ENV=production` during the build tells Next.js to optimize for production. The build produces the `.next` directory containing the standalone server, static assets, and prerendered pages.

## Stage 3: Runtime

The production stage copies only what is needed to run:

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
```

Three things get copied from the builder:

1. **`/app/public`** - Static assets (images, fonts, favicons)
2. **`/app/.next/standalone`** - The standalone Node.js server with bundled dependencies
3. **`/app/.next/static`** - Compiled CSS, JS chunks, and webpack assets

The standalone output includes its own `node_modules` with only production dependencies, already tree-shaken to include just what the application imports.

## The .dockerignore File

Prevent unnecessary files from entering the build context:

```
# .dockerignore
node_modules
.next
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
coverage
cypress
tests
__tests__
docker-compose*.yml
Dockerfile*
.dockerignore
.eslintrc*
.prettierrc*
tsconfig.tsbuildinfo
next-env.d.ts
```

## Handling Environment Variables

Next.js has two types of environment variables:

- `NEXT_PUBLIC_*` variables are embedded at build time
- Server-side variables are read at runtime

For build-time variables, pass them as build arguments:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

```bash
# Pass build-time variables when building the image
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://example.com \
  -t myapp .
```

For runtime variables, pass them when starting the container:

```bash
# Runtime variables are passed at container start
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e REDIS_URL="redis://cache:6379" \
  -e SESSION_SECRET="your-secret-here" \
  -p 3000:3000 \
  myapp
```

## Docker Compose for Development

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      args:
        - NEXT_PUBLIC_API_URL=http://localhost:4000
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 2s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Development with Hot Reload

For development, mount your source code instead of building:

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps  # Only install dependencies, don't build
    command: npm run dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./app:/app/app          # App Router pages
      - ./public:/app/public
      - ./next.config.mjs:/app/next.config.mjs
      - /app/node_modules       # Prevent host node_modules from overriding
    environment:
      - NODE_ENV=development
```

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up
```

## Image Size Analysis

```bash
# Build and check the size
docker build -t nextapp .
docker images nextapp --format "{{.Size}}"
# ~170MB (with Alpine + standalone)

# Compare with a naive build
# node:20 base + full node_modules: ~1.2GB
# node:20-alpine + standalone: ~170MB
```

The standalone output mode is the single biggest optimization. Without it, you would copy the entire `node_modules` directory (often 300-500MB). With standalone, Next.js bundles only the imported code and required dependencies.

## Health Check Configuration

Add a health check for orchestrators like Kubernetes or Docker Swarm:

```dockerfile
# Add to the runner stage
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
```

Or create a dedicated health endpoint in your Next.js app:

```typescript
// app/api/health/route.ts - Health check endpoint
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

```dockerfile
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

## Common Issues and Solutions

**Static files not loading:** Make sure you copy `.next/static` to the correct path in the runner stage. The standalone server expects static files at `.next/static` relative to `server.js`.

**Image optimization not working:** The standalone server handles image optimization, but if you use external images, list the domains in `next.config.mjs`:

```javascript
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.example.com' },
    ],
  },
};
```

**Server actions failing:** Server actions work with the standalone server out of the box. No additional configuration is needed for Docker.

This Dockerfile structure works for Next.js 14 and 15 with the App Router. The standalone output mode, combined with multi-stage builds and Alpine, produces a lean production image that starts fast and deploys efficiently.

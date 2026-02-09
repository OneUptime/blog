# How to Containerize a Nuxt 3 Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, nuxt, vue.js, containerization, nitro, multi-stage builds

Description: Complete Docker setup for Nuxt 3 applications with Nitro server and optimized production images

---

Nuxt 3 uses Nitro as its server engine, which produces a self-contained output directory with minimal dependencies. This makes Nuxt 3 well-suited for Docker deployments. The built output includes a lightweight Node.js server, pre-rendered pages, and client assets, all bundled together. This guide covers the complete containerization process from Dockerfile to production deployment.

## How Nuxt 3 Build Output Works

When you run `nuxt build`, Nitro produces a `.output/` directory:

```
.output/
  server/
    index.mjs       # Server entry point
    chunks/          # Server-side code chunks
  public/
    _nuxt/          # Client-side assets (JS, CSS)
    favicon.ico     # Static files from public/
  nitro.json        # Server configuration
```

The key advantage of Nitro's output is that it bundles all server dependencies. You do not need to copy `node_modules` into the production image for most applications. The server is self-contained.

## The Dockerfile

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Nuxt application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Nuxt 3 (produces .output directory via Nitro)
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nuxt
RUN adduser --system --uid 1001 nuxt

# Copy the Nitro output (self-contained server + client assets)
COPY --from=builder --chown=nuxt:nuxt /app/.output ./.output

USER nuxt

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
```

Notice that the production stage does not copy `node_modules`. Nitro bundles dependencies into the server output. This is the main reason Nuxt 3 Docker images can be so small.

## When You Need node_modules

Some packages cannot be bundled by Nitro (native modules, packages with dynamic requires). If your application uses these, include production dependencies:

```dockerfile
# Stage 3 (modified): Include node_modules for unbundled packages
FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system nuxt && adduser --system nuxt --ingroup nuxt

# Copy Nitro output
COPY --from=builder --chown=nuxt:nuxt /app/.output ./.output

# Copy production dependencies for packages that Nitro cannot bundle
COPY --from=production-deps --chown=nuxt:nuxt /app/node_modules ./node_modules

COPY package.json .

USER nuxt
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## The .dockerignore File

```
# .dockerignore
node_modules
.output
.nuxt
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
coverage
tests
test
e2e
docker-compose*.yml
Dockerfile*
.dockerignore
.eslintrc*
.prettierrc*
```

Excluding `.output` and `.nuxt` prevents stale build artifacts from leaking into the build context. These directories can be large and would slow down context transfer.

## Environment Variables

Nuxt 3 handles runtime environment variables through `runtimeConfig`:

```typescript
// nuxt.config.ts - Define runtime configuration
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only variables (not exposed to client)
    databaseUrl: '',
    apiSecret: '',

    // Public variables (exposed to client)
    public: {
      apiBase: '/api',
      appName: 'My App',
    },
  },
});
```

Nuxt automatically maps environment variables to runtime config. The naming convention uses the `NUXT_` prefix:

```bash
# Server-only: NUXT_ + UPPER_SNAKE_CASE key
# runtimeConfig.databaseUrl -> NUXT_DATABASE_URL
# runtimeConfig.apiSecret -> NUXT_API_SECRET

# Public: NUXT_PUBLIC_ + UPPER_SNAKE_CASE key
# runtimeConfig.public.apiBase -> NUXT_PUBLIC_API_BASE
# runtimeConfig.public.appName -> NUXT_PUBLIC_APP_NAME

docker run -d \
  -e NUXT_DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e NUXT_API_SECRET="secret-key" \
  -e NUXT_PUBLIC_API_BASE="https://api.example.com" \
  -p 3000:3000 \
  myapp
```

This is a runtime feature, so you do not need to rebuild the image when changing these values.

## Docker Compose Setup

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
    ports:
      - "3000:3000"
    environment:
      - NUXT_DATABASE_URL=postgresql://postgres:devpass@db:5432/nuxt_dev
      - NUXT_API_SECRET=dev-secret
      - NUXT_PUBLIC_API_BASE=http://localhost:3000/api
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: nuxt_dev
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

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps
    command: npx nuxt dev --host 0.0.0.0
    ports:
      - "3000:3000"
      - "24678:24678"  # Vite HMR WebSocket port
    volumes:
      - ./app:/app/app
      - ./components:/app/components
      - ./composables:/app/composables
      - ./layouts:/app/layouts
      - ./pages:/app/pages
      - ./plugins:/app/plugins
      - ./public:/app/public
      - ./server:/app/server
      - ./nuxt.config.ts:/app/nuxt.config.ts
      - /app/node_modules
    environment:
      - NUXT_DATABASE_URL=postgresql://postgres:devpass@db:5432/nuxt_dev
```

```bash
docker compose -f docker-compose.dev.yml up
```

## Server Routes and API

Nuxt 3's server routes (in the `server/` directory) are bundled into the Nitro output. They work identically in Docker:

```typescript
// server/api/health.get.ts - Health check endpoint
export default defineEventHandler(() => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
```

```dockerfile
# Health check using the API route
HEALTHCHECK --interval=15s --timeout=3s --start-period=8s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

## Pre-rendering with Docker

If your Nuxt application uses hybrid rendering (some pages pre-rendered, others server-rendered), the build step generates the pre-rendered HTML:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },           // Pre-render the home page
    '/blog/**': { prerender: true },    // Pre-render all blog pages
    '/dashboard/**': { ssr: true },     // Server-render dashboard pages
  },
});
```

Pre-rendered pages are included in `.output/public/` and served as static files. No changes to the Dockerfile are needed.

## Nitro Presets

Nitro supports different presets that optimize the output for specific platforms. For Docker, the default Node.js preset works best:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'node-server',  // Default, explicit for clarity
  },
});
```

## Multi-Architecture Builds

Build images for both AMD64 and ARM64 (useful if your team has both Intel and Apple Silicon Macs):

```bash
# Set up Docker buildx for multi-platform builds
docker buildx create --name mybuilder --use

# Build and push for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t myregistry/myapp:latest .
```

## Image Size

```bash
# Build and check the image size
docker build -t nuxtapp .
docker images nuxtapp --format "{{.Size}}"
# ~130MB (Nitro's bundled output, no node_modules)
# ~180MB (with node_modules for unbundled packages)
```

Nuxt 3's Nitro output produces some of the smallest Docker images among Node.js frameworks. The self-contained server bundle eliminates the need for most `node_modules`, keeping the production image lean. Combined with Alpine and multi-stage builds, you get a production-ready image well under 200MB that starts in under a second.

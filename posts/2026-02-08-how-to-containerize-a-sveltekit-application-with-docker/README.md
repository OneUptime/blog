# How to Containerize a SvelteKit Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, sveltekit, svelte, containerization, node.js, adapter-node

Description: Build optimized Docker images for SvelteKit applications using the Node.js adapter

---

SvelteKit supports multiple deployment targets through adapters. For Docker deployments, you need the Node.js adapter (`@sveltejs/adapter-node`), which produces a standalone Node.js server. This guide covers the complete Docker setup for SvelteKit, from adapter configuration to a production-optimized multi-stage Dockerfile.

## Prerequisites: Configure the Node.js Adapter

SvelteKit's default adapter targets static hosting. Switch to the Node.js adapter for Docker:

```bash
# Install the Node.js adapter
npm install -D @sveltejs/adapter-node
```

Update your SvelteKit config:

```javascript
// svelte.config.js - Switch to the Node.js adapter
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // Output directory for the built server
      out: 'build',
      // Listen on all interfaces inside Docker
      host: '0.0.0.0',
      port: 3000,
    }),
  },
};

export default config;
```

When you run `npm run build`, the adapter produces a `build/` directory containing:

- `build/index.js` - The server entry point
- `build/client/` - Static client assets
- `build/server/` - Server-side code
- `build/handler.js` - The request handler

## The Dockerfile

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the SvelteKit application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application with the Node.js adapter
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --omit=dev

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 sveltekit
RUN adduser --system --uid 1001 sveltekit

# Copy the built application
COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build

# Copy production dependencies
COPY --from=builder --chown=sveltekit:sveltekit /app/node_modules ./node_modules

# Copy package.json for module resolution
COPY --chown=sveltekit:sveltekit package.json .

USER sveltekit

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the SvelteKit server
CMD ["node", "build/index.js"]
```

## Why This Structure Works

SvelteKit with `adapter-node` bundles most dependencies into the output. However, some packages that cannot be bundled (native modules, dynamic imports) need to be available in `node_modules`. Copying the pruned `node_modules` from the builder stage handles this.

The build output in `build/index.js` is a self-contained Express-based server. It serves both the API routes (server endpoints) and the static client assets.

## The .dockerignore File

```
# .dockerignore
node_modules
build
.svelte-kit
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
coverage
tests
__tests__
e2e
playwright-report
docker-compose*.yml
Dockerfile*
.dockerignore
.eslintrc*
.prettierrc*
vite.config.ts.timestamp*
```

Excluding `.svelte-kit` and `build` directories prevents stale build artifacts from entering the Docker build context.

## Environment Variables

SvelteKit distinguishes between public and private environment variables:

```typescript
// In server-side code (load functions, API routes)
import { env } from '$env/dynamic/private';

// Access server-only variables
const dbUrl = env.DATABASE_URL;
const apiKey = env.SECRET_API_KEY;
```

```typescript
// In client-side code
import { env } from '$env/dynamic/public';

// Only PUBLIC_ prefixed variables are available
const apiUrl = env.PUBLIC_API_URL;
```

Dynamic environment variables are read at runtime, which means you set them when running the container:

```bash
# Pass environment variables at runtime
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e SECRET_API_KEY="your-api-key" \
  -e PUBLIC_API_URL="https://api.example.com" \
  -p 3000:3000 \
  myapp
```

For static (build-time) environment variables, pass them as build args:

```dockerfile
FROM node:20-alpine AS builder
ARG PUBLIC_ANALYTICS_ID
ENV PUBLIC_ANALYTICS_ID=$PUBLIC_ANALYTICS_ID
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

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
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/sveltekit_dev
      - ORIGIN=http://localhost:3000
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: sveltekit_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 2s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

The `ORIGIN` environment variable is important for SvelteKit in production. It tells the server the expected origin for CSRF protection. Without it, form submissions may fail.

## Development with Hot Reload

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "5173:5173"  # Vite dev server port
    volumes:
      - ./src:/app/src
      - ./static:/app/static
      - ./svelte.config.js:/app/svelte.config.js
      - ./vite.config.ts:/app/vite.config.ts
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/sveltekit_dev
```

```bash
docker compose -f docker-compose.dev.yml up
```

The `-- --host 0.0.0.0` argument makes Vite's dev server accessible from outside the container.

## Handling Prisma or Drizzle

If your SvelteKit project uses Prisma:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev
# Regenerate Prisma client for production
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system sveltekit && adduser --system sveltekit --ingroup sveltekit

COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build
COPY --from=builder --chown=sveltekit:sveltekit /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:sveltekit /app/prisma ./prisma
COPY --chown=sveltekit:sveltekit package.json .

USER sveltekit
EXPOSE 3000
CMD ["node", "build/index.js"]
```

## Health Check

Add a health check endpoint in your SvelteKit application:

```typescript
// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';

export function GET() {
  return json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

```dockerfile
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

## WebSocket Support

If your SvelteKit application uses WebSockets (via the `handleWebsocket` hook or a custom server), make sure to configure the adapter:

```javascript
// svelte.config.js
adapter: adapter({
  out: 'build',
  // Enable WebSocket support
  envPrefix: '',
})
```

## Image Size

```bash
docker images myapp --format "{{.Size}}"
# ~160MB with Alpine + multi-stage + pruned deps
```

SvelteKit's build output is compact. The `adapter-node` bundles most code into the server output, so the `node_modules` in the production image contains only unbundled dependencies. Most SvelteKit applications produce Docker images between 140-200MB, making them among the smaller Node.js framework images.

## Troubleshooting

**CSRF errors in production:** Set the `ORIGIN` environment variable to your public URL (e.g., `https://myapp.example.com`).

**Static assets 404:** Verify that `build/client` exists in the built output and that the server serves it correctly. The adapter-node server handles this automatically.

**Environment variables undefined:** Check that server-side variables use `$env/dynamic/private` and client-side variables use the `PUBLIC_` prefix with `$env/dynamic/public`.

SvelteKit's adapter-node output is well-suited for Docker. The built server is lightweight, handles static serving, and reads environment variables at runtime. Combined with a multi-stage Alpine build, you get a small, fast, production-ready container.

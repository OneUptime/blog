# How to Containerize a Solid Start Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, solid-start, solidjs, containerization, vinxi, node.js, multi-stage builds

Description: Docker setup for Solid Start applications with Vinxi server and production-optimized builds

---

Solid Start is the full-stack framework for SolidJS. It uses Vinxi as its server framework, which is built on top of Nitro (the same engine Nuxt uses). This means Solid Start produces a self-contained server output similar to Nuxt, making it straightforward to containerize. This guide covers the complete Docker setup from development to production.

## How Solid Start Builds Work

Solid Start uses Vinxi under the hood. When you run `npm run build`, it produces a `.output/` directory containing:

```
.output/
  server/
    index.mjs       # Server entry point
    chunks/          # Server-side code
  public/
    _build/         # Client-side assets
    assets/         # Static assets
```

The build output is self-contained. Vinxi/Nitro bundles most dependencies, so the production image often does not need a full `node_modules` directory.

## Project Configuration

Make sure your Solid Start application is configured for Node.js deployment:

```typescript
// app.config.ts - Solid Start configuration
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    // Preset for standalone Node.js server
    preset: "node-server",
  },
});
```

## The Dockerfile

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Solid Start application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

# Build Solid Start (produces .output/ directory)
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 solidjs
RUN adduser --system --uid 1001 solidjs

# Copy the Vinxi/Nitro output (self-contained)
COPY --from=builder --chown=solidjs:solidjs /app/.output ./.output

USER solidjs
EXPOSE 3000

# Start the server
CMD ["node", ".output/server/index.mjs"]
```

This Dockerfile follows the same pattern as Nuxt 3 because both frameworks use Nitro for their server output. The `.output` directory contains everything needed to run the application.

## When node_modules Are Required

If your application uses packages with native bindings or dynamic imports that Nitro cannot bundle, include production dependencies:

```dockerfile
# Additional stage: production dependencies
FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Modified runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

RUN addgroup --system solidjs && adduser --system solidjs --ingroup solidjs

COPY --from=builder --chown=solidjs:solidjs /app/.output ./.output
COPY --from=production-deps --chown=solidjs:solidjs /app/node_modules ./node_modules
COPY --chown=solidjs:solidjs package.json .

USER solidjs
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## The .dockerignore File

```
# .dockerignore
node_modules
.output
.vinxi
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
dist
coverage
tests
test
docker-compose*.yml
Dockerfile*
.dockerignore
.eslintrc*
.prettierrc*
```

Excluding `.output` and `.vinxi` prevents stale build artifacts from entering the Docker build context.

## Environment Variables

Solid Start uses Vinxi's environment handling. Server-side code accesses environment variables through `process.env`:

```typescript
// src/lib/server-utils.ts - Server-side environment access
"use server";

export async function getConfig() {
  return {
    databaseUrl: process.env.DATABASE_URL,
    apiSecret: process.env.API_SECRET,
  };
}
```

For client-accessible environment variables, use Vinxi's public env prefix or pass them through a server function:

```typescript
// src/routes/index.tsx - Access server config from a component
import { createResource } from "solid-js";

async function fetchConfig() {
  "use server";
  return {
    apiBase: process.env.PUBLIC_API_BASE || "/api",
  };
}

export default function Home() {
  const [config] = createResource(fetchConfig);

  return (
    <div>
      <p>API Base: {config()?.apiBase}</p>
    </div>
  );
}
```

```bash
# Pass environment variables at runtime
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e API_SECRET="your-secret" \
  -e PUBLIC_API_BASE="https://api.example.com" \
  -p 3000:3000 \
  myapp
```

## Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/solid_dev
      - API_SECRET=dev-secret
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: solid_dev
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
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./app.config.ts:/app/app.config.ts
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/solid_dev
```

```bash
docker compose -f docker-compose.dev.yml up
```

The development server handles hot module replacement through Vite, so file changes reflect immediately in the browser.

## Server Functions and API Routes

Solid Start's server functions (`"use server"`) and API routes are bundled into the Nitro output automatically:

```typescript
// src/routes/api/health.ts - API route for health checks
import { json } from "@solidjs/router";

export function GET() {
  return json({ status: "ok", timestamp: new Date().toISOString() });
}
```

```dockerfile
# Health check for the container
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

## Using with Drizzle ORM

Solid Start applications commonly use Drizzle ORM for database access:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system solidjs && adduser --system solidjs --ingroup solidjs

# Copy the built output
COPY --from=builder --chown=solidjs:solidjs /app/.output ./.output

# Copy Drizzle migration files if you run migrations at startup
COPY --from=builder --chown=solidjs:solidjs /app/drizzle ./drizzle

USER solidjs
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## Static Pre-rendering

Solid Start supports pre-rendering specific routes:

```typescript
// app.config.ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    preset: "node-server",
    prerender: {
      routes: ["/", "/about", "/blog"],
    },
  },
});
```

Pre-rendered HTML files are included in the `.output/public/` directory and served as static files. No Dockerfile changes are needed.

## Image Size

```bash
docker build -t solidapp .
docker images solidapp --format "{{.Size}}"
# ~120-140MB (without node_modules, Nitro-bundled)
# ~170-200MB (with production node_modules)
```

Solid Start's Nitro-based output produces compact Docker images. The self-contained server bundle means most applications run without `node_modules` in the production image. Combined with Alpine and a multi-stage build, you get a production-ready image that is typically smaller than equivalent Next.js or Remix images because SolidJS itself has a smaller runtime footprint.

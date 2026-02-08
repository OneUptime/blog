# How to Containerize a Qwik Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, qwik, qwik city, containerization, node.js, multi-stage builds, edge

Description: Complete guide to containerizing Qwik and Qwik City applications with Docker for production deployment

---

Qwik is a framework designed for instant-loading web applications through resumability instead of hydration. Qwik City, its meta-framework, provides routing, data loading, and server-side rendering. When containerizing a Qwik application for Docker, you need the Node.js adapter for server-side rendering, or you can serve a static build with Nginx if your application supports it. This guide covers both approaches.

## Qwik City with Node.js Adapter

Most Qwik City applications need server-side rendering. Install the Node.js adapter:

```bash
npm run qwik add express
```

This adds the Express adapter, which produces a Node.js server. Your project structure after adding the adapter:

```
my-qwik-app/
  src/
    routes/          # Qwik City routes
    components/      # Shared components
    entry.express.tsx # Express server entry (added by adapter)
  server/
    dist/            # Server build output
  dist/              # Client build output
  package.json
```

## Adapter Configuration

Verify the Express adapter is configured in your project:

```typescript
// src/entry.express.tsx - Express adapter entry
import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";
import express from "express";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Create the Qwik City request handler
const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
});

const app = express();

// Static file serving with caching
const distDir = join(fileURLToPath(import.meta.url), "..", "..", "dist");
const buildDir = join(distDir, "build");

app.use("/build", express.static(buildDir, { immutable: true, maxAge: "1y" }));
app.use(express.static(distDir, { redirect: false }));

// Handle Qwik City routes
app.use(router);
app.use(notFound);

const port = process.env.PORT ?? 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server started on port ${port}`);
});
```

## The Dockerfile

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Qwik application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build both client and server
RUN npm run build

# Stage 3: Production dependencies
FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 4: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 qwik
RUN adduser --system --uid 1001 qwik

# Copy production dependencies (Express and related packages)
COPY --from=production-deps --chown=qwik:qwik /app/node_modules ./node_modules

# Copy the client build output (static assets)
COPY --from=builder --chown=qwik:qwik /app/dist ./dist

# Copy the server build output
COPY --from=builder --chown=qwik:qwik /app/server ./server

# Copy package.json for module resolution
COPY --chown=qwik:qwik package.json .

USER qwik

EXPOSE 3000
ENV PORT=3000

# Start the Express server
CMD ["node", "server/entry.express"]
```

## The .dockerignore File

```
# .dockerignore
node_modules
dist
server/dist
.git
.gitignore
*.md
.env
.env.*
.vscode
.idea
coverage
tests
e2e
tmp
docker-compose*.yml
Dockerfile*
.dockerignore
.eslintrc*
.prettierrc*
```

## Static Qwik Build with Nginx

If your Qwik application can be fully static (no server-side data loading), use the static adapter:

```bash
npm run qwik add static
```

```dockerfile
# Stage 1: Install and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Custom Nginx config for Qwik's static output
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Qwik's build directory has hashed filenames - cache aggressively
    location /build/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/index.html /index.html;
    }
}
```

## Environment Variables

Qwik City server routes access environment variables through the request event:

```typescript
// src/routes/api/config/index.tsx - Server endpoint
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ json, env }) => {
  // Access environment variables through the env platform object
  const apiUrl = env.get("API_URL");

  json(200, { apiUrl });
};
```

In Express adapter mode, `process.env` is also available:

```typescript
// src/routes/api/data/index.tsx
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ json }) => {
  const dbUrl = process.env.DATABASE_URL;
  // Use dbUrl to fetch data
  json(200, { status: "ok" });
};
```

```bash
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
  -e API_URL="https://api.example.com" \
  -e SESSION_SECRET="production-secret" \
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
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/qwik_dev
      - API_URL=http://localhost:3000/api
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: qwik_dev
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
      - "5173:5173"  # Vite dev server
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./vite.config.ts:/app/vite.config.ts
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/qwik_dev
```

```bash
docker compose -f docker-compose.dev.yml up
```

## Health Check Endpoint

Create a health check route in your Qwik City application:

```typescript
// src/routes/api/health/index.tsx
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ json }) => {
  json(200, {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};
```

```dockerfile
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/ || exit 1
```

## Qwik's Prefetching and Service Workers

Qwik generates a service worker for module prefetching. Make sure the build output includes these files:

```bash
# Verify the build output includes service worker files
ls dist/
# Should include: q-manifest.json, service-worker.js, build/
```

The Dockerfile already handles this since we copy the entire `dist/` directory. The Express server serves these files with proper caching headers.

## Build-Time vs Runtime Configuration

For values that must be available during the build (public URLs, analytics IDs):

```dockerfile
FROM node:20-alpine AS builder
ARG PUBLIC_API_URL
ARG PUBLIC_ANALYTICS_ID
ENV PUBLIC_API_URL=$PUBLIC_API_URL
ENV PUBLIC_ANALYTICS_ID=$PUBLIC_ANALYTICS_ID
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```

```bash
docker build \
  --build-arg PUBLIC_API_URL=https://api.example.com \
  --build-arg PUBLIC_ANALYTICS_ID=UA-12345 \
  -t myapp .
```

## Image Size

| Approach | Image Size |
|---|---|
| SSR + Express + Alpine | 150-190 MB |
| Static + Nginx Alpine | 30-50 MB |

Qwik's resumability model means smaller JavaScript bundles on the client side, but the server-side image size is comparable to other Node.js frameworks. The Express adapter needs `node_modules` for the Express server itself and any server-side dependencies.

For the best performance-to-size ratio, evaluate whether your application can use the static adapter. If all your data loading happens client-side or at build time, the Nginx-based static approach gives you a tiny image with excellent serving performance. For applications that need server-side data loading, the Express adapter with Alpine multi-stage builds keeps the image under 200MB.

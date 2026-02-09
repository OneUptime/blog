# How to Containerize a Remix Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, remix, react, containerization, multi-stage builds, node.js

Description: Step-by-step guide to building a production-ready Docker image for Remix applications

---

Remix is a full-stack React framework that runs on Node.js, Deno, or various cloud runtimes. For Docker deployments, the Node.js runtime is the most common choice. Containerizing Remix requires understanding its build output structure, server entry point, and how it handles static assets. This guide walks through the complete Docker setup with optimizations for production.

## Project Setup

A standard Remix project (created with `npx create-remix@latest`) has this structure:

```
my-remix-app/
  app/
    root.tsx
    routes/
    entry.client.tsx
    entry.server.tsx
  public/
  build/           # Generated after running remix build
  package.json
  remix.config.js  # or vite.config.ts for Remix with Vite
```

When you run `npm run build`, Remix produces:

- `build/server/` - The server-side bundle
- `build/client/` - Static client assets (JS, CSS, images)

## The Dockerfile

Here is the complete multi-stage Dockerfile:

```dockerfile
# Stage 1: Install all dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the Remix application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Remix (produces build/server and build/client)
RUN npm run build

# Stage 3: Production dependencies only
FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 remix
RUN adduser --system --uid 1001 remix

# Copy production node_modules
COPY --from=production-deps /app/node_modules ./node_modules

# Copy the built application
COPY --from=builder /app/build ./build

# Copy public directory for static assets
COPY --from=builder /app/public ./public

# Copy package.json (needed for the start script)
COPY package.json .

# Set ownership
RUN chown -R remix:remix /app

USER remix

EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Remix with Vite

If your Remix project uses Vite (the default since Remix v2.7+), the build output structure is slightly different. The Dockerfile stays mostly the same, but the Vite config needs attention:

```typescript
// vite.config.ts - Remix with Vite configuration
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    remix({
      // Server entry for the Node.js adapter
      serverModuleFormat: "esm",
    }),
  ],
  // Set the server to listen on all interfaces inside Docker
  server: {
    host: "0.0.0.0",
  },
});
```

The build command (`remix vite:build` or `npm run build`) produces output in `build/server` and `build/client` just like the classic compiler.

## Custom Server Entry

For production Docker deployments, you might want a custom Express server instead of the built-in Remix server. This gives you more control over middleware, logging, and health checks:

```typescript
// server.ts - Custom Express server for Remix
import express from "express";
import { createRequestHandler } from "@remix-run/express";
import path from "path";

const app = express();

// Serve static client assets with long cache headers
app.use(
  "/assets",
  express.static(path.join(process.cwd(), "build/client/assets"), {
    immutable: true,
    maxAge: "1y",
  })
);

// Serve other static files from public directory
app.use(express.static(path.join(process.cwd(), "build/client"), { maxAge: "1h" }));

// Health check endpoint
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Handle all other requests with Remix
app.all(
  "*",
  createRequestHandler({
    build: await import("./build/server/index.js"),
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
```

Update the Dockerfile to use the custom server:

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 remix
RUN adduser --system --uid 1001 remix

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY package.json .

RUN chown -R remix:remix /app
USER remix

EXPOSE 3000

# Use the custom server entry point
CMD ["node", "--import", "tsx", "server.ts"]
```

## The .dockerignore File

```
# .dockerignore
node_modules
build
.cache
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
```

## Docker Compose for Development

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: runner
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/remix_dev
      - SESSION_SECRET=dev-secret-change-in-production
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: remix_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 2s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

## Development with Hot Reload

For development, mount source files and use the Remix dev server:

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps  # Use the deps stage that has all dependencies
    command: npm run dev
    ports:
      - "3000:3000"
      - "8002:8002"  # Remix hot module replacement WebSocket
    volumes:
      - ./app:/app/app
      - ./public:/app/public
      - ./vite.config.ts:/app/vite.config.ts
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:devpass@db:5432/remix_dev
```

```bash
docker compose -f docker-compose.dev.yml up
```

## Handling Prisma with Remix

Many Remix projects use Prisma for database access. Prisma needs special handling in Docker because it generates a platform-specific client:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# Copy Prisma schema before npm ci so the postinstall hook generates the client
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# Generate Prisma client for the Linux platform
RUN npx prisma generate

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system remix && adduser --system remix --ingroup remix

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY package.json .

# Run migrations before starting (or handle this in your deployment pipeline)
# COPY --from=builder /app/prisma/migrations ./prisma/migrations

RUN chown -R remix:remix /app
USER remix

EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Environment Variables

Remix handles environment variables on the server side. For client-side access, you expose them through a loader:

```typescript
// app/root.tsx - Expose selected env vars to the client
export async function loader() {
  return json({
    ENV: {
      PUBLIC_API_URL: process.env.PUBLIC_API_URL,
      PUBLIC_ANALYTICS_ID: process.env.PUBLIC_ANALYTICS_ID,
    },
  });
}
```

```bash
# Pass environment variables when running the container
docker run -d \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e SESSION_SECRET="production-secret" \
  -e PUBLIC_API_URL="https://api.example.com" \
  -p 3000:3000 \
  myapp
```

## Health Check

```dockerfile
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1
```

## Image Size

```bash
docker images myremixapp --format "{{.Size}}"
# ~180MB with Alpine + multi-stage
# ~450MB without multi-stage optimization
```

The multi-stage build with separate production dependency installation keeps the image lean. Remix's server bundle is typically small (under 5MB), so most of the image size comes from `node_modules` and the base Node.js image. Using Alpine and stripping dev dependencies gets you to a production-ready image under 200MB.

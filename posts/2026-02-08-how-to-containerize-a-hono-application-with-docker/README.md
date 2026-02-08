# How to Containerize a Hono Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Hono, Node.js, Bun, Containerization, Backend, DevOps, Edge

Description: A practical guide to containerizing Hono web applications with Docker for Node.js, Bun, and Deno runtimes

---

Hono is a small, fast web framework that runs on multiple JavaScript runtimes: Node.js, Bun, Deno, Cloudflare Workers, and more. Its ultralight design and Web Standard API compatibility make it a compelling choice for APIs and microservices. Containerizing a Hono app with Docker lets you deploy it consistently regardless of the target environment. This guide covers containerization for multiple runtimes, with detailed examples for both Node.js and Bun.

## Prerequisites

You need:

- Docker Engine 20.10+
- Node.js 20+ (for the Node.js runtime) or Bun 1.0+ (for the Bun runtime)
- Basic knowledge of web APIs

## Creating a Hono Project

Hono provides a CLI for scaffolding projects. Let's create one targeting Node.js.

Scaffold a Hono project:

```bash
# Create a Hono project with the Node.js template
npm create hono@latest my-hono-app
cd my-hono-app
npm install
```

When prompted, select `nodejs` as the runtime. The generated project includes a `src/index.ts` file with a basic Hono setup.

Here is what a typical Hono entry point looks like:

```typescript
// src/index.ts - Hono application entry point
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

// Root route
app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server on port 3000
serve({
  fetch: app.fetch,
  port: 3000,
});

console.log('Server running on http://localhost:3000');
```

## Dockerfile for Hono on Node.js

If your Hono project targets Node.js, the containerization process follows the standard Node.js pattern.

This Dockerfile builds and runs a Hono Node.js application:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled code and dependency manifests
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/package-lock.json ./

# Install production dependencies only
RUN npm ci --production

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## Dockerfile for Hono on Bun

Bun is a faster JavaScript runtime that Hono supports natively. The Dockerfile is simpler because Bun handles TypeScript directly without a separate compile step.

This Dockerfile runs Hono on the Bun runtime:

```dockerfile
# Use the official Bun image
FROM oven/bun:1-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependency files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy application source
COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Run directly with Bun (no build step needed for TypeScript)
CMD ["bun", "run", "src/index.ts"]
```

For the Bun runtime, modify your entry point slightly:

```typescript
// src/index.ts - Hono with Bun runtime
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono on Bun!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Bun's built-in server
export default {
  port: 3000,
  fetch: app.fetch,
};
```

## The .dockerignore File

Same principle applies regardless of runtime:

```
node_modules
dist
.git
.gitignore
.vscode
*.md
.env
.env.*
```

## Building and Running

Build and test with either runtime:

```bash
# Build the image (Node.js version)
docker build -t my-hono-app:node .

# Or build the Bun version
docker build -f Dockerfile.bun -t my-hono-app:bun .

# Run the container
docker run -d -p 3000:3000 --name hono-app my-hono-app:node

# Test it
curl http://localhost:3000
```

## Docker Compose Setup

A Compose file for the Hono application with a PostgreSQL database:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://hono:secret@postgres:5432/honodb
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hono
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: honodb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hono"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Middleware and Routing in Docker

Hono has a rich middleware ecosystem. Here is an example with CORS, logging, and error handling, all of which work seamlessly in Docker.

Add middleware to your Hono app:

```typescript
// src/index.ts - Hono with middleware
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { serve } from '@hono/node-server';

const app = new Hono();

// Enable request logging (outputs to stdout, captured by Docker logs)
app.use('*', logger());

// Enable CORS using environment variable for allowed origins
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
}));

// Pretty print JSON responses in development
if (process.env.NODE_ENV !== 'production') {
  app.use('*', prettyJSON());
}

// API routes
const api = new Hono();
api.get('/users', (c) => c.json({ users: [] }));
api.get('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ user: { id } });
});

// Mount API routes
app.route('/api', api);

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

serve({ fetch: app.fetch, port: 3000 });
```

## Development Workflow

For development with hot reload:

```dockerfile
# Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000

# Use tsx for TypeScript execution with file watching
CMD ["npx", "tsx", "watch", "src/index.ts"]
```

Development Compose file:

```yaml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

## Comparing Image Sizes

Hono's small dependency footprint keeps Docker images lean. Here is a rough comparison:

```bash
# Check image sizes
docker images | grep hono
```

| Runtime   | Base Image          | Approximate Size |
|-----------|---------------------|------------------|
| Node.js   | node:20-alpine      | 130-160 MB       |
| Bun       | oven/bun:1-alpine   | 100-130 MB       |

Bun images tend to be slightly smaller because Bun bundles its own runtime and does not need the full Node.js installation.

## Graceful Shutdown

Handle container stop signals properly:

```typescript
// Graceful shutdown for Hono on Node.js
import { serve } from '@hono/node-server';

const server = serve({ fetch: app.fetch, port: 3000 });

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Conclusion

Hono's runtime-agnostic design gives you flexibility in how you containerize it. Whether you choose Node.js for its mature ecosystem or Bun for its raw speed, the Docker setup remains simple. Hono's tiny dependency footprint produces lean container images, and its middleware system integrates smoothly with Docker-based logging and configuration. Pick the runtime that fits your needs, follow the Dockerfile patterns shown here, and you will have a production-ready Hono container in minutes.

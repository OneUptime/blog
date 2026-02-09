# How to Containerize an Elysia (Bun) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Elysia, Bun, Containerization, Backend, DevOps, TypeScript

Description: A complete guide to containerizing Elysia applications running on the Bun runtime with Docker for production deployment

---

Elysia is a TypeScript web framework designed specifically for the Bun runtime. It leverages Bun's speed and native TypeScript support to deliver exceptional performance. Elysia brings end-to-end type safety, a plugin system, and a developer experience that rivals the best Node.js frameworks. Containerizing an Elysia app with Docker gives you portable deployments while preserving Bun's performance advantages. This guide covers everything from a basic Dockerfile to production optimization.

## Prerequisites

You need:

- Bun 1.0+ installed locally (for project setup)
- Docker Engine 20.10+
- Basic familiarity with TypeScript and REST APIs

## Creating an Elysia Project

Scaffold a new Elysia application:

```bash
# Create a new Elysia project
bun create elysia my-elysia-app
cd my-elysia-app
bun install
```

The generated `src/index.ts` file contains a basic Elysia server:

```typescript
// src/index.ts - Default Elysia application
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/', () => 'Hello from Elysia!')
  .get('/health', () => ({ status: 'ok' }))
  .listen(3000);

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
```

Test it locally:

```bash
bun run src/index.ts
curl http://localhost:3000
```

## Why Bun for Docker

Bun executes TypeScript directly without a compilation step. This simplifies the Docker build process since you skip the `tsc` or `tsx` build stage entirely. Bun also starts faster than Node.js, which means quicker container boot times and faster scaling in orchestrated environments like Kubernetes.

## Writing the Dockerfile

Elysia runs exclusively on Bun, so you use the official Bun Docker image.

This Dockerfile creates a production-ready Elysia container:

```dockerfile
# Use the official Bun Alpine image for a small footprint
FROM oven/bun:1-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependency files first for layer caching
COPY package.json bun.lockb ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy application source
COPY src ./src
COPY tsconfig.json ./

# Set file ownership
RUN chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production

EXPOSE 3000

# Run the Elysia application with Bun
CMD ["bun", "run", "src/index.ts"]
```

## Binding to the Correct Host

By default, Elysia binds to `localhost`, which is unreachable from outside the container. You must bind to `0.0.0.0`.

Update your Elysia server to listen on all interfaces:

```typescript
// src/index.ts - Bind to 0.0.0.0 for Docker
import { Elysia } from 'elysia';

const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get('/', () => 'Hello from Elysia!')
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen({
    port,
    hostname: '0.0.0.0',  // Required for Docker - listen on all interfaces
  });

console.log(`Elysia is running at http://0.0.0.0:${port}`);
```

This is a common stumbling point. If your container starts but you cannot reach it from the host, the hostname binding is almost always the problem.

## The .dockerignore File

Keep the build context lean:

```
node_modules
.git
.gitignore
.vscode
*.md
.env
.env.*
dist
```

## Building and Running

Build and run the container:

```bash
# Build the image
docker build -t my-elysia-app:latest .

# Run the container
docker run -d -p 3000:3000 --name elysia-app my-elysia-app:latest

# Verify it works
curl http://localhost:3000
```

## Docker Compose with a Database

Most real applications need a database. Here is a Compose setup with PostgreSQL.

This Compose file defines the Elysia app alongside PostgreSQL:

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
      - PORT=3000
      - DATABASE_URL=postgresql://elysia:secret@postgres:5432/elysiadb
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
      POSTGRES_USER: elysia
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: elysiadb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elysia"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Using Elysia Plugins

Elysia has a growing plugin ecosystem. Here is an example with Swagger documentation and CORS, both useful in containerized API deployments.

Install the plugins:

```bash
bun add @elysiajs/cors @elysiajs/swagger
```

Register them in your application:

```typescript
// src/index.ts - Elysia with plugins
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  // Enable CORS with configurable origins
  .use(cors({
    origin: process.env.CORS_ORIGIN || '*',
  }))
  // Enable Swagger UI at /swagger
  .use(swagger({
    documentation: {
      info: {
        title: 'My Elysia API',
        version: '1.0.0',
      },
    },
  }))
  .get('/', () => 'Hello from Elysia!')
  .get('/health', () => ({ status: 'ok' }))
  .group('/api', (app) =>
    app
      .get('/users', () => ({ users: [] }))
      .get('/users/:id', ({ params: { id } }) => ({ user: { id } }))
  )
  .listen({ port: 3000, hostname: '0.0.0.0' });
```

With Swagger enabled, visit `http://localhost:3000/swagger` to see your API documentation.

## Development Workflow

Bun has built-in file watching, making the development Dockerfile simple.

Development Dockerfile:

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

# Use Bun's built-in hot reload
CMD ["bun", "run", "--hot", "src/index.ts"]
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
      - PORT=3000
```

The `--hot` flag enables Bun's hot module replacement. When you save a file, the server updates without a full restart.

## Environment Variables

Pass configuration through environment variables rather than baking it into the image:

```typescript
// src/config.ts - Centralized configuration from environment
export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/dev',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

Use an env file with Compose:

```yaml
services:
  api:
    env_file:
      - .env.production
```

## Graceful Shutdown

Handle shutdown signals for clean container stops:

```typescript
// Graceful shutdown for Elysia
const app = new Elysia()
  .get('/', () => 'Hello')
  .listen({ port: 3000, hostname: '0.0.0.0' });

// Handle SIGTERM from Docker stop
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down');
  app.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down');
  app.stop();
  process.exit(0);
});
```

## Image Size

Bun Alpine images are relatively small. Check your image:

```bash
docker images my-elysia-app
```

A typical Elysia app on Bun Alpine weighs around 100-140MB. This is competitive with Node.js Alpine images, and Bun's faster startup time gives it an edge in environments where containers scale up and down frequently.

## Conclusion

Elysia and Bun make a powerful combination for containerized APIs. Bun's native TypeScript support eliminates the build step, and its fast startup improves container scaling. The Dockerfile stays simple because there is no compilation phase. Add Docker Compose for database and service orchestration, configure proper health checks and graceful shutdown, and you have a production-ready setup that takes full advantage of Bun's performance characteristics.

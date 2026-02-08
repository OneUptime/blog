# How to Containerize a Fastify Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Fastify, Node.js, Containerization, Backend, DevOps, API

Description: Learn how to containerize a Fastify application with Docker for fast, production-ready API deployments

---

Fastify is a high-performance Node.js web framework built for speed. It handles tens of thousands of requests per second out of the box, making it an excellent choice for APIs and microservices. Docker pairs well with Fastify's lightweight nature, giving you small container images that start fast and use minimal resources. This guide covers everything from writing your first Dockerfile to running Fastify in production with proper logging, health checks, and graceful shutdown.

## Prerequisites

You need:

- Node.js 18+ and npm
- Docker Engine 20.10+
- Basic familiarity with building APIs

## Setting Up a Fastify Project

If you already have a Fastify application, skip to the Dockerfile section.

Create and initialize a new project:

```bash
# Create a new directory and initialize the project
mkdir my-fastify-app && cd my-fastify-app
npm init -y
npm install fastify
```

Create a basic server file:

```javascript
// server.js - Entry point for the Fastify application
const fastify = require('fastify')({
  logger: true
});

// Register a simple route
fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    // Bind to 0.0.0.0 so Docker can expose the port
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

Add a start script to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

Test it locally:

```bash
npm start
curl http://localhost:3000
```

## Writing the Dockerfile

Fastify apps are typically pure JavaScript (or TypeScript that compiles to JavaScript). The Dockerfile can be straightforward.

This Dockerfile creates a lean production image:

```dockerfile
# Use Alpine for a small base image
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --production

# Copy application source
COPY . .

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Set environment to production
ENV NODE_ENV=production

EXPOSE 3000

# Start the Fastify server
CMD ["node", "server.js"]
```

If your project uses TypeScript, add a build stage:

```dockerfile
# Stage 1: Build TypeScript
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --production

RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## The .dockerignore File

Keep the Docker build context small:

```
node_modules
.git
.gitignore
.vscode
*.md
.env
.env.*
test
coverage
```

## Building and Running

Build and run the container:

```bash
# Build the image
docker build -t my-fastify-app:latest .

# Run the container
docker run -d -p 3000:3000 --name fastify-app my-fastify-app:latest

# Verify it is running
curl http://localhost:3000
```

## Docker Compose Configuration

A Compose file is handy for managing the container lifecycle and adding supporting services.

This Compose file includes the Fastify app with a Redis cache:

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
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Fastify Plugins in Docker

Fastify's plugin architecture lets you register functionality in a modular way. Here is how to register a CORS plugin and a database connection that works inside Docker.

Install the plugins:

```bash
npm install @fastify/cors @fastify/postgres
```

Register them in your server:

```javascript
// server.js - Fastify with plugins
const fastify = require('fastify')({ logger: true });

// Register CORS support
fastify.register(require('@fastify/cors'), {
  origin: process.env.CORS_ORIGIN || '*'
});

// Register PostgreSQL connection using environment variables
fastify.register(require('@fastify/postgres'), {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb'
});

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

fastify.get('/health', async (request, reply) => {
  // Check database connectivity
  const client = await fastify.pg.connect();
  try {
    await client.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  } finally {
    client.release();
  }
});

const start = async () => {
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
};

start();
```

## Graceful Shutdown

Fastify has built-in support for graceful shutdown. When Docker sends a SIGTERM signal to stop the container, Fastify closes active connections cleanly.

Handle shutdown signals in your server:

```javascript
// Add graceful shutdown handling
const signals = ['SIGINT', 'SIGTERM'];

for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully`);
    await fastify.close();
    process.exit(0);
  });
}
```

Set the stop grace period in Docker Compose:

```yaml
services:
  api:
    stop_grace_period: 30s
```

This gives Fastify 30 seconds to finish processing requests before Docker kills the container.

## Logging Configuration

Fastify uses Pino for logging, which outputs structured JSON by default. This works great with Docker log drivers and log aggregation systems.

View container logs:

```bash
# Follow the logs in real time
docker logs -f fastify-app
```

Each log line is a JSON object, making it easy to parse with tools like Fluentd, Logstash, or Datadog.

For human-readable logs during development, install `pino-pretty`:

```bash
npm install -D pino-pretty
```

And start with:

```bash
node server.js | npx pino-pretty
```

## Development Workflow

For local development with file watching:

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

Development Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000

# Use Node's built-in file watcher for auto-restart
CMD ["node", "--watch", "server.js"]
```

## Performance Tuning in Docker

Fastify is already fast, but a few Docker-specific tweaks help:

- Set `--max-old-space-size` if you know your container's memory limit
- Use `UV_THREADPOOL_SIZE` for I/O-heavy workloads
- Disable unnecessary Node.js features in production

Add resource limits in Docker Compose:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
```

## Conclusion

Fastify's lightweight design makes it an ideal candidate for Docker containerization. The resulting images are small, start quickly, and perform well under load. Combine the simple Dockerfile approach with Docker Compose for database and cache services, and you have a complete development and deployment setup. Fastify's built-in structured logging and graceful shutdown support make it especially well-suited for containerized production environments.

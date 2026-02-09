# How to Containerize a NestJS Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NestJS, Node.js, Containerization, Backend, DevOps, TypeScript

Description: Learn how to containerize a NestJS backend application with Docker using multi-stage builds and production best practices

---

NestJS is a progressive Node.js framework for building server-side applications. It brings structure and strong typing to backend development with its modular architecture and TypeScript-first approach. Docker is the natural choice for packaging NestJS apps into portable, reproducible containers. This guide covers the full containerization process, from a basic Dockerfile to production optimizations, health checks, and database connectivity.

## Prerequisites

You need the following installed:

- Node.js 18+ and npm
- Docker Engine 20.10+
- NestJS CLI (`npm install -g @nestjs/cli`)

## Creating a NestJS Project

Skip this if you have an existing project.

Scaffold a new NestJS application:

```bash
# Create a new NestJS project
nest new my-nest-app
cd my-nest-app
```

Verify the build:

```bash
# Compile TypeScript to JavaScript
npm run build
```

The compiled output goes to the `dist/` directory.

## Understanding NestJS Build Output

NestJS compiles TypeScript into JavaScript. The production container only needs the compiled `dist/` directory, `node_modules` (production dependencies only), and the `package.json`. You do not need TypeScript, the NestJS CLI, or dev dependencies at runtime.

## Writing the Dockerfile

Create a `Dockerfile` in your project root. This uses a three-stage approach: install dependencies, build, and run.

The first stage installs all dependencies:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev deps for building)
RUN npm ci
```

The second stage builds the TypeScript code:

```dockerfile
# Stage 2: Build the application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TypeScript
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production
```

The third stage creates the lean production image:

```dockerfile
# Stage 3: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what is needed for production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Switch to non-root user
USER appuser

EXPOSE 3000

# Start the NestJS application
CMD ["node", "dist/main.js"]
```

## The .dockerignore File

Keep the build context clean and fast:

```
node_modules
dist
.git
.gitignore
.vscode
*.md
test
.env
.env.*
coverage
```

## Building and Running

Build the image:

```bash
# Build the production image
docker build -t my-nest-app:latest .
```

Run the container:

```bash
# Run the container on port 3000
docker run -d -p 3000:3000 --name nest-app my-nest-app:latest
```

Test it:

```bash
# Check the health endpoint (default NestJS response)
curl http://localhost:3000
```

You should see "Hello World!" or whatever your default route returns.

## Docker Compose with a Database

Most NestJS applications connect to a database. Here is a Compose file that runs the app alongside PostgreSQL.

This Compose file sets up the NestJS app with PostgreSQL and proper networking:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=myuser
      - DATABASE_PASSWORD=mypassword
      - DATABASE_NAME=mydb
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

The `depends_on` with `condition: service_healthy` ensures the database is ready before the app starts.

## Environment Variables

NestJS applications commonly use the `@nestjs/config` module for environment configuration. Pass environment variables through Docker rather than baking them into the image.

Use an env file with Docker Compose:

```yaml
services:
  app:
    build: .
    env_file:
      - .env.production
    ports:
      - "3000:3000"
```

Create `.env.production`:

```
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=myuser
DATABASE_PASSWORD=mypassword
DATABASE_NAME=mydb
JWT_SECRET=your-production-secret
NODE_ENV=production
```

Never commit `.env` files containing real credentials to version control.

## Development Workflow

For local development, you want hot reload with `nest start --watch`. Set up a development Compose file.

This configuration mounts your source code and runs the dev server:

```yaml
version: "3.8"

services:
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
```

The development Dockerfile:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000 9229

# Run the NestJS dev server with file watching and debug port
CMD ["npm", "run", "start:dev"]
```

Port 9229 allows you to attach a debugger from your IDE.

## Health Checks

NestJS has a dedicated health check module. Install it and set up an endpoint.

Install the terminus health check package:

```bash
npm install @nestjs/terminus
```

Create a health controller:

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // Returns a structured health status response
    return this.health.check([]);
  }
}
```

Add a health check to your Docker Compose service:

```yaml
services:
  app:
    build: .
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Graceful Shutdown

NestJS supports graceful shutdown, which is important for containerized applications that may be stopped or restarted at any time.

Enable shutdown hooks in your main.ts:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
```

Docker sends a SIGTERM signal when stopping a container. NestJS will catch it and close database connections, finish pending requests, and shut down cleanly.

## Optimizing the Image

Check your image size:

```bash
docker images my-nest-app
```

A well-built NestJS image typically weighs 150-200MB. Most of that is Node.js and production `node_modules`. To reduce it further:

- Use `node:20-alpine` (not the full Debian-based image)
- Run `npm prune --production` after building to strip dev dependencies
- Avoid installing unnecessary system packages

## Security Hardening

Run as a non-root user (already included in the Dockerfile above). Additionally:

```dockerfile
# Drop all capabilities and run read-only where possible
USER appuser

# Set NODE_ENV to production to disable debug features
ENV NODE_ENV=production
```

Scan your image for vulnerabilities:

```bash
# Use Docker Scout to check for known vulnerabilities
docker scout cves my-nest-app:latest
```

## Conclusion

NestJS and Docker complement each other well. The framework's TypeScript compilation step maps cleanly to a multi-stage Docker build, and the modular architecture makes it easy to add health checks and graceful shutdown handling. Start with the three-stage Dockerfile shown here, add Docker Compose for database integration, and layer in environment variable management and security hardening. The result is a production-ready NestJS container that your team can deploy with confidence.

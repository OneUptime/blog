# How to Containerize an AdonisJS Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, AdonisJS, Node.js, Containerization, Backend, DevOps, TypeScript

Description: Step-by-step guide to containerizing AdonisJS v6 applications with Docker, including database setup and migrations

---

AdonisJS is a full-featured Node.js framework inspired by Laravel. It ships with an ORM (Lucid), authentication, validation, and a powerful CLI. Version 6 brought ESM-first support and a refined developer experience. Docker helps you package all of this into a consistent, deployable unit. This guide walks through containerizing an AdonisJS application, including database connectivity, migrations, and production optimization.

## Prerequisites

You will need:

- Node.js 20+ and npm
- Docker Engine 20.10+
- An existing AdonisJS v6 project or the willingness to create one

## Creating an AdonisJS Project

If you need a fresh project to follow along:

```bash
# Create a new AdonisJS application with the web starter kit
npm init adonisjs@latest my-adonis-app -- -K=web
cd my-adonis-app
```

Verify the build:

```bash
# Build the TypeScript source
node ace build
```

AdonisJS compiles to the `build/` directory. The production build includes compiled JavaScript, the `package.json`, and a standalone server entry point.

## How AdonisJS Builds Work

AdonisJS v6 uses `tsc` to compile TypeScript into JavaScript. The `node ace build` command creates a `build/` directory that contains everything needed to run the app in production. Inside the build directory, there is a `server.js` file and a fresh `package.json` with only production dependencies listed.

This means your production Docker image needs to:

1. Build the TypeScript source
2. Install only production dependencies in the `build/` directory
3. Run `node server.js` from the build directory

## Writing the Dockerfile

Create a `Dockerfile` in your project root.

The first stage builds the application:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install all dependencies (dev + prod) for the build step
RUN npm ci

# Copy the full source
COPY . .

# Build the AdonisJS application
RUN node ace build
```

The second stage prepares the production image:

```dockerfile
# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the build output
COPY --from=build /app/build ./

# Install only production dependencies
RUN npm ci --production

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3333

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

# Start the server
CMD ["node", "server.js"]
```

## The .dockerignore File

Keep builds fast by excluding unnecessary files:

```
node_modules
build
tmp
.git
.gitignore
.vscode
*.md
.env
tests
coverage
```

## Building and Running

Build the image:

```bash
docker build -t my-adonis-app:latest .
```

Run the container:

```bash
# Start the container with necessary environment variables
docker run -d -p 3333:3333 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -e PORT=3333 \
  -e APP_KEY=your-app-key-here \
  --name adonis-app \
  my-adonis-app:latest
```

The `APP_KEY` is required by AdonisJS for encryption and session management. Generate one with `node ace generate:key` in your local project.

## Docker Compose with PostgreSQL

AdonisJS applications typically use a database. Here is a Compose setup with PostgreSQL.

This configuration runs the app alongside a PostgreSQL database:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=3333
      - APP_KEY=${APP_KEY}
      - DB_CONNECTION=pg
      - PG_HOST=postgres
      - PG_PORT=5432
      - PG_USER=adonis
      - PG_PASSWORD=secret
      - PG_DB_NAME=adonis_app
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: adonis
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: adonis_app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adonis -d adonis_app"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Running Migrations

Database migrations need to run before your application starts serving requests. There are several approaches.

Run migrations as a one-off command after the services are up:

```bash
# Run migrations inside the running container
docker compose exec app node ace migration:run --force
```

The `--force` flag is required in production mode. AdonisJS adds this safeguard to prevent accidental migration runs.

Alternatively, create an entrypoint script that runs migrations before starting the server:

```bash
#!/bin/sh
# entrypoint.sh - Run migrations and start the server

# Run pending migrations
node ace migration:run --force

# Start the application
node server.js
```

Update the Dockerfile to use this entrypoint:

```dockerfile
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
```

## Running Seeders

If you need to seed initial data, run seeders after migrations:

```bash
# Run database seeders
docker compose exec app node ace db:seed
```

## Development Workflow

For local development with live reload, use AdonisJS's built-in dev server.

Development Dockerfile:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3333

# Start the AdonisJS dev server with hot reload
CMD ["node", "ace", "serve", "--hmr"]
```

Development Compose file:

```yaml
version: "3.8"

services:
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3333:3333"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - HOST=0.0.0.0
      - PORT=3333
      - APP_KEY=dev-app-key-32-characters-long!!
      - DB_CONNECTION=pg
      - PG_HOST=postgres
      - PG_PORT=5432
      - PG_USER=adonis
      - PG_PASSWORD=secret
      - PG_DB_NAME=adonis_dev
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: adonis
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: adonis_dev
    ports:
      - "5432:5432"
```

## Health Check Endpoint

Add a health check route to your AdonisJS application:

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'

router.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})
```

Reference it in your Compose file:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Static Assets and File Uploads

If your AdonisJS app handles file uploads, you need persistent storage. Mount a volume for the uploads directory.

Add a volume for uploads in Docker Compose:

```yaml
services:
  app:
    volumes:
      - uploads:/app/uploads

volumes:
  pgdata:
  uploads:
```

Configure AdonisJS to use the mounted path for file storage in your drive configuration.

## Image Optimization Tips

AdonisJS production images typically range from 150-250MB. Reduce this by:

- Always using `node:20-alpine` as the base
- Running `npm ci --production` in the production stage (not all dependencies)
- Making sure your `.dockerignore` excludes test files and documentation

Check the image size:

```bash
docker images my-adonis-app
```

## Conclusion

AdonisJS has a clean build process that translates well to Docker's multi-stage build pattern. The framework compiles to a self-contained `build/` directory, and you only need to install production dependencies inside it. Add database connectivity through Docker Compose, handle migrations through an entrypoint script or one-off commands, and configure health checks for production readiness. The result is a well-structured deployment pipeline that keeps your AdonisJS application consistent from development to production.

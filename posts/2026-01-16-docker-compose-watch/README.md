# How to Use Docker Compose Watch for Live Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Compose, Watch, Development, Hot Reload

Description: Learn how to use Docker Compose Watch for automatic rebuilds and syncs during development, enabling fast feedback loops.

---

Docker Compose Watch automatically updates running containers when source files change. This eliminates manual rebuilds and restarts, providing a smooth development experience similar to local development.

## Understanding Compose Watch

```
Compose Watch Actions
┌─────────────────────────────────────────────────────────────┐
│  Action     │ Behavior                                      │
├─────────────┼──────────────────────────────────────────────┤
│  sync       │ Copy changed files to container               │
│  rebuild    │ Rebuild image and recreate container          │
│  sync+restart│ Sync files and restart container             │
└─────────────────────────────────────────────────────────────┘
```

## Basic Watch Configuration

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    develop:
      watch:
        # Sync source files without rebuild
        - path: ./src
          action: sync
          target: /app/src

        # Rebuild on package.json changes
        - path: ./package.json
          action: rebuild
```

```bash
# Start with watch mode
docker compose watch

# Or with up command
docker compose up --watch
```

## Watch Actions

### Sync Action

Copies files directly to the running container without rebuild.

```yaml
services:
  api:
    build: .
    develop:
      watch:
        - path: ./src
          action: sync
          target: /app/src
        - path: ./public
          action: sync
          target: /app/public
        - path: ./templates
          action: sync
          target: /app/templates
```

### Rebuild Action

Triggers image rebuild and container recreation.

```yaml
services:
  api:
    build: .
    develop:
      watch:
        - path: ./package.json
          action: rebuild
        - path: ./package-lock.json
          action: rebuild
        - path: ./Dockerfile
          action: rebuild
```

### Sync + Restart Action

Syncs files and restarts the container (useful when app needs restart to pick up changes).

```yaml
services:
  api:
    build: .
    develop:
      watch:
        - path: ./config
          action: sync+restart
          target: /app/config
        - path: ./.env
          action: sync+restart
          target: /app/.env
```

## Node.js Development Setup

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"  # Debugger
    environment:
      NODE_ENV: development
    command: npm run dev
    develop:
      watch:
        # Sync source - nodemon handles restart
        - path: ./src
          action: sync
          target: /app/src

        # Sync tests
        - path: ./tests
          action: sync
          target: /app/tests

        # Rebuild on dependency changes
        - path: ./package.json
          action: rebuild

        - path: ./package-lock.json
          action: rebuild

        # Restart on config changes
        - path: ./config
          action: sync+restart
          target: /app/config
```

```dockerfile
# Dockerfile
FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]
```

## Python Development Setup

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      target: development
    ports:
      - "8000:8000"
    environment:
      FLASK_DEBUG: "1"
      PYTHONDONTWRITEBYTECODE: "1"
    command: flask run --host=0.0.0.0 --reload
    develop:
      watch:
        # Sync Python source
        - path: ./app
          action: sync
          target: /app/app

        # Sync templates
        - path: ./templates
          action: sync
          target: /app/templates

        # Rebuild on requirements change
        - path: ./requirements.txt
          action: rebuild

        - path: ./setup.py
          action: rebuild

        # Restart on config changes
        - path: ./config.py
          action: sync+restart
          target: /app/config.py
```

## Go Development Setup

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      target: development
    ports:
      - "8080:8080"
    develop:
      watch:
        # Go files need rebuild (compiled language)
        - path: ./*.go
          action: rebuild

        - path: ./cmd
          action: rebuild

        - path: ./internal
          action: rebuild

        - path: ./pkg
          action: rebuild

        # Rebuild on go.mod changes
        - path: ./go.mod
          action: rebuild

        - path: ./go.sum
          action: rebuild

        # Sync static assets
        - path: ./static
          action: sync
          target: /app/static

        # Sync config
        - path: ./config
          action: sync+restart
          target: /app/config
```

## Frontend Development (React/Vue)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      target: development
    ports:
      - "3000:3000"
    environment:
      CHOKIDAR_USEPOLLING: "true"  # For file watching in Docker
    develop:
      watch:
        # Sync source - Vite/webpack handles HMR
        - path: ./frontend/src
          action: sync
          target: /app/src

        # Sync public assets
        - path: ./frontend/public
          action: sync
          target: /app/public

        # Rebuild on config changes
        - path: ./frontend/vite.config.js
          action: rebuild

        - path: ./frontend/package.json
          action: rebuild
```

## Ignoring Files

Use `.dockerignore` or specify ignore patterns.

```yaml
services:
  api:
    build: .
    develop:
      watch:
        - path: ./src
          action: sync
          target: /app/src
          ignore:
            - "**/*.test.js"
            - "**/__tests__"
            - "**/*.spec.js"

        - path: .
          action: rebuild
          ignore:
            - "node_modules/"
            - ".git/"
            - "*.md"
            - "tests/"
```

## Multi-Service Development

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    develop:
      watch:
        - path: ./frontend/src
          action: sync
          target: /app/src
        - path: ./frontend/package.json
          action: rebuild

  api:
    build: ./api
    ports:
      - "8000:8000"
    develop:
      watch:
        - path: ./api/src
          action: sync
          target: /app/src
        - path: ./api/requirements.txt
          action: rebuild

  worker:
    build: ./worker
    develop:
      watch:
        - path: ./worker/src
          action: sync
          target: /app/src
        - path: ./worker/package.json
          action: rebuild

  postgres:
    image: postgres:15
    # No watch needed for database

  redis:
    image: redis:7-alpine
    # No watch needed for cache
```

## Complete Development Setup

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://app:secret@postgres:5432/app
      REDIS_URL: redis://redis:6379/0
      DEBUG: "api:*"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    develop:
      watch:
        # Source code - sync for hot reload
        - path: ./src
          action: sync
          target: /app/src
          ignore:
            - "**/*.test.ts"
            - "**/__mocks__"

        # API routes - sync+restart
        - path: ./routes
          action: sync+restart
          target: /app/routes

        # Migrations - sync+restart
        - path: ./migrations
          action: sync+restart
          target: /app/migrations

        # Tests - sync only
        - path: ./tests
          action: sync
          target: /app/tests

        # Dependencies - rebuild
        - path: ./package.json
          action: rebuild

        - path: ./package-lock.json
          action: rebuild

        # TypeScript config - rebuild
        - path: ./tsconfig.json
          action: rebuild

        # Docker config - rebuild
        - path: ./Dockerfile
          action: rebuild

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Tips and Best Practices

```yaml
services:
  api:
    build: .
    develop:
      watch:
        # 1. Order matters - more specific paths first
        - path: ./src/config
          action: sync+restart
          target: /app/src/config

        - path: ./src
          action: sync
          target: /app/src

        # 2. Use ignore for large directories
        - path: .
          action: rebuild
          ignore:
            - "node_modules/"
            - ".git/"
            - "coverage/"
            - "dist/"

        # 3. Separate dev dependencies
        - path: ./package.json
          action: rebuild

        # 4. Watch specific config files
        - path: ./.env.development
          action: sync+restart
          target: /app/.env
```

## Summary

| Action | Use Case | Performance |
|--------|----------|-------------|
| sync | Source code with HMR | Fastest |
| rebuild | Dependencies, Dockerfile | Slowest |
| sync+restart | Config files | Medium |

Docker Compose Watch streamlines development by automatically handling file changes. Use sync for source code with hot reload support, rebuild for dependencies, and sync+restart for configuration changes. For remote deployments, see our post on [Docker Compose Remote Deployment](https://oneuptime.com/blog/post/2026-01-16-docker-compose-remote/view).


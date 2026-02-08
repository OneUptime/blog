# How to Structure a Monorepo with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Monorepo, Docker Compose, Multi-Service, Build Context, Microservices, DevOps

Description: Learn how to organize Docker builds in a monorepo with shared libraries, efficient caching, and service-specific Dockerfiles.

---

Monorepos hold multiple services, libraries, and tools in a single repository. They simplify dependency management and make cross-service changes atomic. But they introduce challenges for Docker builds. Each service needs its own image, yet they share common code. Build contexts can balloon if you are not careful, and layer caching breaks easily when unrelated changes invalidate shared layers.

This guide covers practical patterns for structuring Docker in a monorepo, from directory layout to build optimization.

## Typical Monorepo Structure

```
monorepo/
├── docker-compose.yml
├── .dockerignore
├── packages/
│   ├── shared-types/
│   │   ├── package.json
│   │   └── src/
│   └── shared-utils/
│       ├── package.json
│       └── src/
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   ├── worker/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   └── web/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
├── package.json
├── package-lock.json
└── turbo.json (or nx.json)
```

The key decision is where to set the Docker build context. Each service depends on shared packages, so the build context must include both the service directory and the shared packages.

## The Build Context Problem

If you set the build context to the service directory, Docker cannot see the shared packages:

```dockerfile
# This will NOT work - shared packages are outside the build context
FROM node:20-alpine
WORKDIR /app
COPY package.json .
# This fails because ../../packages/ is outside the context
COPY ../../packages/shared-types ./packages/shared-types
```

The solution is to set the build context to the repository root and use the `dockerfile` option to point to the service-specific Dockerfile.

## Docker Compose Configuration

```yaml
# docker-compose.yml - Build context is the repo root for all services
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: services/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/app
    depends_on:
      - postgres

  worker:
    build:
      context: .
      dockerfile: services/worker/Dockerfile
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  web:
    build:
      context: .
      dockerfile: services/web/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres-data:
```

## Service Dockerfile Pattern

With the build context at the repo root, your Dockerfiles reference paths relative to the root:

```dockerfile
# services/api/Dockerfile - API service with shared packages
FROM node:20-alpine AS base
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy shared package definitions
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/

# Copy service package definition
COPY services/api/package.json ./services/api/

# Install all dependencies (uses workspace resolution)
RUN npm ci

# Copy shared package source code
COPY packages/shared-types/ ./packages/shared-types/
COPY packages/shared-utils/ ./packages/shared-utils/

# Copy service source code
COPY services/api/ ./services/api/

# Build shared packages first, then the service
RUN npm run build --workspace=packages/shared-types && \
    npm run build --workspace=packages/shared-utils && \
    npm run build --workspace=services/api

# Production stage - only include what is needed at runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=base /app/packages/shared-utils/package.json ./packages/shared-utils/
COPY --from=base /app/services/api/package.json ./services/api/

RUN npm ci --omit=dev

COPY --from=base /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=base /app/packages/shared-utils/dist/ ./packages/shared-utils/dist/
COPY --from=base /app/services/api/dist/ ./services/api/dist/

EXPOSE 3001
CMD ["node", "services/api/dist/index.js"]
```

The key optimization here is copying `package.json` files before source code. This lets Docker cache the `npm ci` layer as long as dependencies have not changed, even when source code changes frequently.

## The .dockerignore File

A proper `.dockerignore` is critical in a monorepo because the build context includes the entire repository:

```
# .dockerignore - Keep the build context lean
node_modules
**/node_modules
**/dist
**/.next
.git
*.md
.env*
.vscode
.idea
coverage
**/__tests__
**/*.test.*
**/*.spec.*
```

Without this file, Docker sends every file in the repo to the build daemon, including all `node_modules` directories, which can be gigabytes.

## Selective Builds with Docker Bake

Docker Buildx Bake lets you define build targets declaratively:

```hcl
// docker-bake.hcl - Build targets for each service
group "default" {
  targets = ["api", "worker", "web"]
}

target "api" {
  context    = "."
  dockerfile = "services/api/Dockerfile"
  tags       = ["myregistry/api:latest"]
}

target "worker" {
  context    = "."
  dockerfile = "services/worker/Dockerfile"
  tags       = ["myregistry/worker:latest"]
}

target "web" {
  context    = "."
  dockerfile = "services/web/Dockerfile"
  tags       = ["myregistry/web:latest"]
}
```

Build specific services or all at once:

```bash
# Build only the API service
docker buildx bake api

# Build all services in parallel
docker buildx bake

# Build with specific tags
docker buildx bake --set "*.tags=myregistry/*:v1.2.3"
```

## Optimizing Build Caching

### Cache Mounts

Use BuildKit cache mounts to persist package manager caches across builds:

```dockerfile
# Use cache mounts for faster repeated builds
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/api/package.json ./services/api/

# Cache the npm cache directory across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

### Target-Specific .dockerignore

If different services need different ignore rules, use named Dockerfiles with matching ignore files:

```
services/api/Dockerfile      -> services/api/Dockerfile.dockerignore
services/worker/Dockerfile   -> services/worker/Dockerfile.dockerignore
```

Docker 1.20+ supports this pattern with BuildKit.

## Handling Shared Configurations

Many monorepos share configuration files like TypeScript configs, ESLint configs, or Babel configs at the root:

```dockerfile
# Copy shared configuration files
COPY tsconfig.base.json ./
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY services/api/tsconfig.json ./services/api/
```

## Building Only Changed Services in CI

In CI/CD, you do not want to rebuild every service on every commit. Detect which services changed:

```bash
# Determine which services were affected by the latest commit
CHANGED_FILES=$(git diff --name-only HEAD~1)

# Check if the API service or its dependencies changed
if echo "$CHANGED_FILES" | grep -qE "^(services/api/|packages/shared-)"; then
  echo "Building API service"
  docker compose build api
fi

# Check if the worker service changed
if echo "$CHANGED_FILES" | grep -qE "^(services/worker/|packages/shared-)"; then
  echo "Building Worker service"
  docker compose build worker
fi
```

Note that changes to shared packages trigger rebuilds for all services that depend on them.

## Local Development with Volume Mounts

For development, mount source code into containers for hot reloading:

```yaml
# docker-compose.override.yml - Development overrides
version: "3.8"

services:
  api:
    build:
      target: base
    command: npm run dev --workspace=services/api
    volumes:
      - ./services/api/src:/app/services/api/src
      - ./packages/shared-types/src:/app/packages/shared-types/src
      - ./packages/shared-utils/src:/app/packages/shared-utils/src

  web:
    build:
      target: base
    command: npm run dev --workspace=services/web
    volumes:
      - ./services/web/src:/app/services/web/src
      - ./packages:/app/packages
```

## Testing in Docker

Run tests for specific services inside containers:

```bash
# Run tests for the API service
docker compose run --rm api npm test --workspace=services/api

# Run tests for shared packages
docker compose run --rm api npm test --workspace=packages/shared-types

# Run all tests
docker compose run --rm api npm test
```

## Summary

Monorepos and Docker work well together once you establish the right patterns. Set the build context to the repository root so Dockerfiles can access shared packages. Use multi-stage builds to keep production images lean. Optimize caching by copying package files before source code. And use `.dockerignore` aggressively to prevent the entire repository from being sent as build context. These patterns scale from a handful of services to dozens.

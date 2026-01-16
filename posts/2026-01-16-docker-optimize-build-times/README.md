# How to Optimize Docker Build Times with Layer Caching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Caching, BuildKit, Optimization

Description: Learn how to dramatically reduce Docker build times through layer caching optimization, Dockerfile best practices, BuildKit features, and multi-stage builds.

---

Docker build times can significantly impact development velocity and CI/CD pipeline efficiency. Proper layer caching can reduce builds from minutes to seconds. This guide covers practical techniques to optimize Docker build performance.

## Understanding Build Cache

```
Docker Build Cache Flow
┌─────────────────────────────────────────────────────────────┐
│  Step 1: FROM node:20                                        │
│  ┌─────────────────┐                                        │
│  │  CACHE HIT ✓    │ ──► Reuse existing layer               │
│  └─────────────────┘                                        │
├─────────────────────────────────────────────────────────────┤
│  Step 2: COPY package.json                                   │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ File unchanged? │ Yes │  CACHE HIT ✓    │               │
│  └─────────────────┘     └─────────────────┘               │
├─────────────────────────────────────────────────────────────┤
│  Step 3: RUN npm install                                     │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Previous cached?│ Yes │  CACHE HIT ✓    │               │
│  └─────────────────┘     └─────────────────┘               │
├─────────────────────────────────────────────────────────────┤
│  Step 4: COPY src/                                           │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Files changed   │ Yes │  CACHE MISS ✗   │ ──► Rebuild   │
│  └─────────────────┘     └─────────────────┘               │
├─────────────────────────────────────────────────────────────┤
│  Step 5+: All subsequent layers                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  CACHE INVALIDATED - Must rebuild all remaining layers  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Dockerfile Optimization

### Order Instructions by Change Frequency

```dockerfile
# BAD: Source code copied early invalidates dependency cache
FROM node:20
WORKDIR /app
COPY . .                    # ← Any file change invalidates cache
RUN npm install             # ← Always rebuilds
RUN npm run build

# GOOD: Dependencies cached separately
FROM node:20
WORKDIR /app
COPY package*.json ./       # ← Only changes when dependencies change
RUN npm ci                  # ← Cached unless package.json changes
COPY . .                    # ← Source changes don't affect above
RUN npm run build
```

### Minimize Cache-Busting Layers

```dockerfile
# BAD: Timestamp changes on every build
FROM alpine
RUN echo "Build time: $(date)" > /build-info

# GOOD: Use build arguments for reproducibility
FROM alpine
ARG BUILD_TIME
RUN echo "Build time: ${BUILD_TIME}" > /build-info
```

### Combine RUN Commands Strategically

```dockerfile
# BAD: Each RUN creates a layer, more cache invalidation points
FROM ubuntu
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y vim
RUN rm -rf /var/lib/apt/lists/*

# GOOD: Single layer, fewer invalidation points
FROM ubuntu
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        vim && \
    rm -rf /var/lib/apt/lists/*
```

### Use .dockerignore

```bash
# .dockerignore
.git
.gitignore
node_modules
npm-debug.log
Dockerfile*
docker-compose*
.dockerignore
.env*
*.md
!README.md
coverage
.nyc_output
test
tests
__tests__
*.test.js
*.spec.js
```

## BuildKit Optimizations

### Enable BuildKit

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Or in Docker daemon
# /etc/docker/daemon.json
{
  "features": {
    "buildkit": true
  }
}
```

### Cache Mounts for Package Managers

```dockerfile
# syntax=docker/dockerfile:1.4

# Node.js
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# Python
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Go
FROM golang:1.21
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Rust
FROM rust:1.73
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release
```

### Bind Mounts for Build Context

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20 AS builder

WORKDIR /app

# Bind mount for reading without copying
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

### Parallel Stage Execution

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20 AS base
WORKDIR /app
COPY package*.json ./

# These stages run in parallel
FROM base AS deps-prod
RUN npm ci --only=production

FROM base AS deps-dev
RUN npm ci

FROM deps-dev AS builder
COPY . .
RUN npm run build

# Final stage combines parallel results
FROM node:20-alpine
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

## Multi-Stage Build Strategies

### Separate Build and Runtime

```dockerfile
# Build stage with all dependencies
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage - minimal image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/index.js"]
```

### Target Specific Stages

```dockerfile
FROM node:20 AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

```bash
# Build specific stage
docker build --target development -t myapp:dev .
docker build --target production -t myapp:prod .
```

## Registry-Based Caching

### Inline Cache

```bash
# Build with inline cache metadata
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t myregistry/myapp:latest .

# Push to registry
docker push myregistry/myapp:latest

# Use cache from registry
docker build \
  --cache-from myregistry/myapp:latest \
  -t myregistry/myapp:new .
```

### External Cache Export

```bash
# Export cache to registry
docker build \
  --cache-to type=registry,ref=myregistry/myapp:cache,mode=max \
  --cache-from type=registry,ref=myregistry/myapp:cache \
  -t myregistry/myapp:latest .
```

### Local Cache Directory

```bash
# Export to local directory
docker build \
  --cache-to type=local,dest=/tmp/docker-cache \
  --cache-from type=local,src=/tmp/docker-cache \
  -t myapp .
```

## CI/CD Optimization

### GitHub Actions

```yaml
name: Optimized Build

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with Cache
        uses: docker/build-push-action@v5
        with:
          context: .
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: myapp:${{ github.sha }}
```

### GitLab CI

```yaml
build:
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_BUILDKIT: 1
  script:
    - docker pull $CI_REGISTRY_IMAGE:latest || true
    - docker build
        --cache-from $CI_REGISTRY_IMAGE:latest
        --build-arg BUILDKIT_INLINE_CACHE=1
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        -t $CI_REGISTRY_IMAGE:latest
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
```

## Measuring Build Performance

### Time Individual Steps

```bash
# BuildKit timing output
DOCKER_BUILDKIT=1 docker build --progress=plain -t myapp . 2>&1 | tee build.log

# Example output:
# #5 [2/6] COPY package*.json ./
# #5 DONE 0.1s
# #6 [3/6] RUN npm ci
# #6 DONE 45.2s   ← Opportunity for optimization
```

### Build Profiling

```bash
# Generate build profile
docker build \
  --progress=plain \
  --build-arg BUILDKIT_PROGRESS=plain \
  -t myapp . 2>&1 | tee build-profile.log

# Analyze cache hits
grep -E "CACHED|DONE" build-profile.log
```

## Complete Optimized Example

```dockerfile
# syntax=docker/dockerfile:1.4

# ===== Base Stage =====
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ===== Dependencies Stage =====
FROM base AS deps
# Copy only files needed for npm install
COPY package*.json ./
# Use cache mount for npm cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# ===== Development Dependencies =====
FROM base AS deps-dev
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ===== Build Stage =====
FROM deps-dev AS builder
COPY . .
RUN npm run build

# ===== Production Stage =====
FROM base AS production
# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy built application
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Non-root user
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Summary

| Technique | Impact | Complexity |
|-----------|--------|------------|
| Instruction ordering | High | Low |
| .dockerignore | Medium | Low |
| BuildKit cache mounts | High | Medium |
| Multi-stage builds | High | Medium |
| Registry caching | High | Medium |
| Parallel stages | Medium | Medium |

Effective build optimization combines proper Dockerfile structure with BuildKit features. Start with instruction ordering and .dockerignore, then add cache mounts and registry caching for CI/CD environments. For more on layer caching in CI/CD, see our post on [Docker Layer Caching in CI/CD](https://oneuptime.com/blog/post/2026-01-16-docker-layer-caching-cicd/view).


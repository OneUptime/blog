# How to Speed Up Podman Builds in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Build Optimization, Performance

Description: Learn practical techniques to dramatically speed up Podman container builds in CI/CD pipelines through caching, multi-stage builds, and parallel execution.

---

> A well-optimized Podman build can reduce CI pipeline times from 10 minutes to under 2 minutes, saving both time and compute costs.

Slow container builds are one of the biggest bottlenecks in CI/CD pipelines. Every wasted minute costs developer productivity and CI compute resources. Podman offers several techniques for speeding up builds, from layer caching and multi-stage builds to parallel execution and build context optimization. This guide covers actionable strategies to make your Podman builds faster.

---

## Optimize Your Containerfile for Layer Caching

The order of instructions in your Containerfile directly impacts cache efficiency.

```dockerfile
# BAD: This invalidates the npm install cache on every code change

FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "dist/index.js"]
```

```dockerfile
# GOOD: Dependencies are cached separately from source code
FROM node:24-alpine
WORKDIR /app

# Layer 1: Copy only package files (changes infrequently)
COPY package.json package-lock.json ./

# Layer 2: Install dependencies (cached when packages unchanged)
RUN npm ci

# Layer 3: Copy source code (changes frequently)
COPY . .

# Layer 4: Build the application
RUN npm run build

CMD ["node", "dist/index.js"]
```

## Use Multi-Stage Builds to Reduce Image Size

Smaller images transfer faster and have less to cache.

```dockerfile
# Multi-stage build: separate build and runtime stages
# Stage 1: Build environment with all dev tools
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Minimal production image
FROM node:24-alpine AS production
WORKDIR /app

# Copy only the build output and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# The final image is much smaller
CMD ["node", "dist/index.js"]
```

## Use a .containerignore File

Reduce the build context size by excluding unnecessary files.

```text
# .containerignore
# Exclude files that should not be in the build context
# A smaller build context means faster build start times

node_modules
.git
.github
.vscode
*.md
LICENSE
.env*
test/
coverage/
.nyc_output/
dist/
.dockerignore
.containerignore
docker-compose.yml
```

```bash
#!/bin/bash
# Measure the build context size before and after .containerignore

# Check context size without ignore file
echo "Context size without .containerignore:"
du -sh --exclude=.git . 2>/dev/null || du -sh .

# Build and check the time difference
time podman build -t myapp:test .
```

## Registry-Based Layer Caching

Use a registry-backed cache repository to reuse layers across CI runs.

```bash
#!/bin/bash
# Use the registry as a layer cache for faster rebuilds
# This is the most effective caching strategy for CI

REGISTRY="docker.io/myorg"
IMAGE="${REGISTRY}/myapp"
CACHE_IMAGE="${REGISTRY}/myapp-cache"
TAG="${COMMIT_SHA}"

# Build using a remote cache repository
echo "Building with cache..."
time podman build \
  --layers \
  --cache-from "${CACHE_IMAGE}" \
  --cache-to "${CACHE_IMAGE}" \
  --tag "${IMAGE}:${TAG}" \
  --tag "${IMAGE}:latest" \
  .

# Push the final image tags
podman push "${IMAGE}:${TAG}"
podman push "${IMAGE}:latest"
```

## Parallel Multi-Stage Builds

Podman can build independent stages in parallel.

```dockerfile
# Containerfile with independent stages that can build in parallel

# Stage 1: Build the frontend
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build the backend (independent of frontend)
FROM golang:1.26-alpine AS backend
WORKDIR /backend
COPY backend/go.* ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -o server .

# Stage 3: Combine into the final image
FROM alpine:3.22
COPY --from=frontend /frontend/dist /srv/static
COPY --from=backend /backend/server /usr/local/bin/server
CMD ["server"]
```

```bash
#!/bin/bash
# Build with parallel stage execution
# Podman/Buildah can execute independent stages concurrently

time podman build \
  --jobs 2 \
  --tag myapp:latest \
  .
```

## Use BuildKit-Style Cache Mounts

Mount cache directories to persist package manager caches between builds on the same builder cache storage.

```dockerfile
# Containerfile with cache mounts for package manager caches
FROM node:24-alpine
WORKDIR /app

COPY package*.json ./

# Mount the npm cache directory so it persists between builds
# This avoids re-downloading packages on every build
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

```dockerfile
# Go example with module cache
FROM golang:1.26-alpine
WORKDIR /app

COPY go.* ./

# Cache Go module downloads
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Cache the Go build cache
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /app/server .

CMD ["/app/server"]
```

## Minimize the Number of Layers

Combine related RUN instructions to reduce layers and image size.

```dockerfile
# BAD: Each RUN creates a new layer
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y build-essential
RUN rm -rf /var/lib/apt/lists/*

# GOOD: Combined into a single layer
FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      git \
      build-essential && \
    rm -rf /var/lib/apt/lists/*
```

## Benchmarking Build Performance

Measure and track your build times.

```bash
#!/bin/bash
# Benchmark Podman build performance
# Run this to measure the impact of optimizations

echo "=== Build Performance Benchmark ==="

# Clean build (no cache)
podman rmi myapp:bench 2>/dev/null || true
echo "--- Cold build (no cache) ---"
time podman build --no-cache -t myapp:bench .

# Cached build (no changes)
echo "--- Warm build (full cache) ---"
time podman build -t myapp:bench .

# Build context size
echo "--- Build context ---"
podman build --tag myapp:context . 2>&1 | grep -i "context"

# Final image size
echo "--- Image size ---"
podman images myapp:bench --format "{{.Size}}"
```

## Summary

Speeding up Podman builds in CI/CD requires a combination of strategies. Structure your Containerfile to maximize layer caching by putting stable dependencies before frequently changing source code. Use multi-stage builds to keep final images small and enable parallel stage execution. A proper .containerignore file reduces build context transfer time. Registry-based caching gives you persistent layer reuse across CI runs, and cache mounts avoid re-downloading packages on every build. Measure your build performance regularly to track improvements and catch regressions. These optimizations can easily cut your CI build times by half or more.

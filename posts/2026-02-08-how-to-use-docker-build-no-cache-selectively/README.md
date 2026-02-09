# How to Use Docker Build --no-cache Selectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Build, Cache, Performance, Docker Build, BuildKit, DevOps

Description: Learn how to selectively invalidate Docker build cache for specific layers instead of using the blanket --no-cache flag on every build.

---

The `docker build --no-cache` flag is a sledgehammer. It rebuilds every single layer from scratch, discarding all cached work. This is wasteful when only one layer is stale. A dependency update, for example, should not force you to re-download your base image and reinstall system packages. Selective cache invalidation gives you fine-grained control over which layers rebuild and which ones stay cached.

## Understanding Docker's Layer Cache

Docker caches each layer in your Dockerfile. When you rebuild, Docker checks whether the instruction and its inputs have changed. If nothing changed, it reuses the cached layer. The catch is that cache invalidation cascades: once one layer misses the cache, every subsequent layer rebuilds too.

```dockerfile
# Example: cache invalidation cascade
FROM node:20-alpine           # Layer 1 - cached
RUN apk add --no-cache curl   # Layer 2 - cached
COPY package.json ./          # Layer 3 - if package.json changes, this misses
RUN npm install               # Layer 4 - forced rebuild (after layer 3 miss)
COPY . .                      # Layer 5 - forced rebuild
RUN npm run build             # Layer 6 - forced rebuild
```

If only your source code changes, layers 1 through 4 stay cached. But if `package.json` changes, layers 3 through 6 all rebuild. Using `--no-cache` would rebuild all six layers, including the base image pull and system package installation.

## Strategy 1: Cache Busting with Build Arguments

The simplest selective cache invalidation uses a build argument. When the argument value changes, Docker invalidates that layer and everything after it.

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache curl git

COPY package.json package-lock.json ./
RUN npm ci

# This ARG invalidates the cache from this point forward when its value changes
ARG CACHE_BUST_APP=1
COPY . .
RUN npm run build
```

Trigger a rebuild of only the app layers by changing the argument:

```bash
# Normal build - uses cache for everything
docker build -t myapp:latest .

# Bust cache only for the COPY and build steps
docker build -t myapp:latest --build-arg CACHE_BUST_APP=$(date +%s) .
```

The layers before the `ARG` instruction stay cached. Only the layers after it rebuild.

You can place multiple cache bust points in your Dockerfile:

```dockerfile
FROM python:3.12-slim

# System dependencies - rarely change
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Python dependencies - change occasionally
ARG CACHE_BUST_DEPS=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code - changes frequently
ARG CACHE_BUST_APP=1
COPY . .
RUN python setup.py install
```

```bash
# Rebuild only the app layer
docker build --build-arg CACHE_BUST_APP=$(date +%s) -t myapp .

# Rebuild both dependencies and app
docker build \
  --build-arg CACHE_BUST_DEPS=$(date +%s) \
  --build-arg CACHE_BUST_APP=$(date +%s) \
  -t myapp .
```

## Strategy 2: BuildKit Cache Mounts

BuildKit cache mounts persist package manager caches across builds, making rebuilds faster even when layers are invalidated. This does not prevent cache invalidation, but it reduces its cost.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./

# Mount a persistent cache for npm packages
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

Even when `npm ci` reruns due to a `package.json` change, the downloaded packages are still in the cache mount. Only new or updated packages need downloading.

Here is the same approach for Python and Go:

```dockerfile
# Python with pip cache mount
FROM python:3.12-slim
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Go with module cache mount
FROM golang:1.22
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -o /app ./cmd/app
```

## Strategy 3: Multi-Stage Builds for Isolation

Multi-stage builds let you isolate cache domains. Changes in one stage do not affect caching in another stage unless their outputs are referenced.

```dockerfile
# Stage 1: Build dependencies (cached independently)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM deps AS builder
COPY . .
RUN npm run build

# Stage 3: Production image
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

With BuildKit, each stage is evaluated independently. If you only change source code, the `deps` stage cache stays valid, and only the `builder` stage reruns.

## Strategy 4: Targeted Cache Invalidation with BuildKit

BuildKit supports cache invalidation for specific stages using `--no-cache-filter`:

```bash
# Invalidate cache only for the "builder" stage
docker buildx build --no-cache-filter builder -t myapp:latest .
```

This is the most precise approach. You name exactly which stages should rebuild while everything else stays cached.

Use it with a multi-stage Dockerfile:

```dockerfile
FROM golang:1.22 AS base
RUN apt-get update && apt-get install -y protobuf-compiler

FROM base AS proto-gen
COPY proto/ ./proto/
RUN protoc --go_out=. proto/*.proto

FROM base AS builder
COPY --from=proto-gen /generated ./generated
COPY . .
RUN go build -o /app

FROM gcr.io/distroless/static
COPY --from=builder /app /app
CMD ["/app"]
```

```bash
# Rebuild only the proto generation stage
docker buildx build --no-cache-filter proto-gen -t myapp:latest .

# Rebuild only the builder stage (proto-gen stays cached)
docker buildx build --no-cache-filter builder -t myapp:latest .

# Rebuild both stages
docker buildx build --no-cache-filter proto-gen --no-cache-filter builder -t myapp:latest .
```

## Strategy 5: Inline Cache with Registry

When building in CI/CD, you often lose the local cache between runs. Registry-based inline caching lets you pull previous build caches from a registry:

```bash
# Build with inline cache metadata
docker buildx build \
  --cache-from type=registry,ref=ghcr.io/your-org/app:cache \
  --cache-to type=inline \
  -t ghcr.io/your-org/app:latest \
  --push .
```

This stores cache metadata inside the image. On the next build, Docker pulls the cache from the registry and reuses layers that have not changed. It is selective by nature since only changed layers rebuild.

For more control, use a dedicated cache image:

```bash
# Push cache to a separate tag
docker buildx build \
  --cache-from type=registry,ref=ghcr.io/your-org/app:buildcache \
  --cache-to type=registry,ref=ghcr.io/your-org/app:buildcache,mode=max \
  -t ghcr.io/your-org/app:latest \
  --push .
```

The `mode=max` option caches all layers, including intermediate stages. Without it, only the final stage is cached.

## Strategy 6: Conditional Cache Busting with Scripts

For advanced scenarios, generate a cache-busting hash based on specific conditions:

```bash
# Generate a hash from dependency files only
DEPS_HASH=$(sha256sum requirements.txt Pipfile.lock 2>/dev/null | sha256sum | cut -d' ' -f1)

# Generate a hash from source code only
SRC_HASH=$(find src/ -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)

# Pass targeted hashes as build args
docker build \
  --build-arg DEPS_HASH=$DEPS_HASH \
  --build-arg SRC_HASH=$SRC_HASH \
  -t myapp:latest .
```

The Dockerfile uses these hashes strategically:

```dockerfile
FROM python:3.12-slim

ARG DEPS_HASH
COPY requirements.txt ./
RUN pip install -r requirements.txt

ARG SRC_HASH
COPY src/ ./src/
RUN python -m compileall src/
```

The dependency layers only rebuild when `DEPS_HASH` changes (meaning the dependency files changed). Source layers only rebuild when `SRC_HASH` changes.

## Choosing the Right Strategy

Different situations call for different approaches:

- Simple projects: Use build argument cache busting. It is easy to understand and requires no special tooling.
- Multi-stage builds: Use `--no-cache-filter` for precise, per-stage control.
- CI/CD pipelines: Combine registry caching with `--no-cache-filter` for the best balance of speed and freshness.
- Package-heavy builds: Always use cache mounts to speed up dependency reinstallation.

## Wrapping Up

Stop using `--no-cache` as a default. It wastes time rebuilding layers that have not changed. Use build arguments for simple cache busting, `--no-cache-filter` for per-stage control, cache mounts to speed up unavoidable rebuilds, and registry caching for CI/CD environments. Your builds will be both faster and fresher.

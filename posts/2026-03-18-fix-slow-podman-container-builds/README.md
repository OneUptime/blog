# How to Fix Slow Podman Container Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Performance, Build Optimization, DevOps

Description: A practical guide to diagnosing and fixing slow container builds in Podman, covering layer caching, build context optimization, multi-stage builds, and Podman-specific performance tuning.

---

> Slow Podman container builds waste developer time and slow down CI/CD pipelines. This guide covers practical techniques to dramatically speed up your builds, from proper layer caching to build context optimization.

Container builds that take minutes instead of seconds can cripple development velocity. Every time you change a line of code and wait three minutes for a build, you lose focus and productivity. The good news is that most slow builds are caused by a handful of common mistakes that are easy to fix. This guide walks through the most impactful optimizations for Podman builds.

---

## Diagnosing Slow Builds

Before optimizing, identify where the time is being spent. Run your build with timing information:

```bash
# Time the overall build

time podman build -t myapp:latest .

# Enable verbose logging to see each step
podman --log-level=debug build -t myapp:latest . 2>&1 | tee build.log
```

Look for steps that take the longest. Common culprits are large build contexts, cache misses, and heavy dependency installation steps.

## Optimization Techniques

### 1. Reduce Build Context Size

The build context is everything in the directory you pass to `podman build`. Podman makes the context available to the build process and applies ignore rules before `COPY` and `ADD` instructions. A large context means a slow start.

Check your build context size:

```bash
# See how large the context is
du -sh .

# See what is taking up space
du -sh * | sort -rh | head -20
```

Create a `.containerignore` file (or `.dockerignore`) to exclude unnecessary files:

```text
# .containerignore
.git
node_modules
dist
build
*.log
*.md
.env
.vscode
__pycache__
*.pyc
.pytest_cache
coverage
.next
vendor
tmp
```

The impact can be dramatic. A Node.js project with `node_modules` in the context might send 500MB to the build process. With a proper `.containerignore`, that drops to a few megabytes.

```bash
# Verify the context size after adding .containerignore
# This gives a rough estimate for simple ignore files
tar cf - --exclude-from=.containerignore . | wc -c | numfmt --to=iec
```

### 2. Optimize Layer Caching

Podman caches each layer of your image. When a layer changes, all subsequent layers are rebuilt. Order your Dockerfile instructions from least-frequently-changed to most-frequently-changed.

Bad ordering (cache invalidated on every code change):

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["node", "dist/index.js"]
```

Optimized ordering (dependencies cached separately from code):

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

With the optimized version, `npm ci` only reruns when `package.json` or `package-lock.json` changes. Code changes only rebuild the `COPY . .` and subsequent layers.

The same principle applies to other languages:

```dockerfile
# Python - cache pip install
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```dockerfile
# Go - cache module download
FROM golang:1.26
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .
CMD ["./main"]
```

### 3. Use Multi-Stage Builds

Multi-stage builds reduce the final image size and can speed up builds by separating the build environment from the runtime environment:

```dockerfile
# Stage 1: Build
FROM node:24 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (much smaller image)
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
CMD ["node", "dist/index.js"]
```

For Go applications, the savings are even more dramatic:

```dockerfile
FROM golang:1.26 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o main .

FROM scratch
COPY --from=builder /app/main /main
CMD ["/main"]
```

### 4. Use Smaller Base Images

Large base images take longer to pull and consume more disk space. Choose the smallest base image that meets your needs:

```dockerfile
# Instead of this (900MB+)
FROM ubuntu:24.04

# Use this (5MB)
FROM alpine:3.22

# For Node.js: instead of this (350MB)
FROM node:24

# Use this (50MB)
FROM node:24-alpine

# For Python: instead of this (400MB)
FROM python:3.13

# Use this (50MB)
FROM python:3.13-alpine
```

### 5. Combine and Minimize RUN Commands

Each `RUN` instruction creates a new layer. Combine related commands and clean up in the same layer:

```dockerfile
# Bad: Multiple layers, no cleanup
RUN apt-get update
RUN apt-get install -y curl wget git
RUN apt-get install -y build-essential
RUN rm -rf /var/lib/apt/lists/*

# Good: Single layer with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      wget \
      git \
      build-essential && \
    rm -rf /var/lib/apt/lists/*
```

The `--no-install-recommends` flag prevents installing suggested packages, reducing both build time and image size.

### 6. Mount Caches for Package Managers

Podman supports BuildKit-style cache mounts that persist package manager caches between builds:

```dockerfile
# Cache npm packages
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build
```

```dockerfile
# Cache pip packages
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```dockerfile
# Cache Go modules
FROM golang:1.26
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build go build -o main .
```

### 7. Use Parallel Build Steps

If your Dockerfile has independent stages, they can be built in parallel:

```dockerfile
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM golang:1.26 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server .

FROM alpine:3.22
COPY --from=backend-builder /app/server /usr/local/bin/
COPY --from=frontend-builder /app/frontend/dist /var/www/static/
CMD ["server"]
```

Podman builds independent stages in parallel when possible.

### 8. Podman-Specific Performance Settings

Configure Podman for better build performance:

```bash
# Use overlay storage driver (fastest option)
# Check current driver
podman info --format '{{.Store.GraphDriverName}}'

# Build with specific parallel job count
podman build --jobs 4 -t myapp:latest .
```

On macOS with Podman machine, allocate more resources to the VM:

```bash
podman machine stop
podman machine rm podman-machine-default --force
podman machine init --cpus 4 --memory 4096 --disk-size 50
podman machine start
```

### 9. Use a Local Registry Cache

For CI/CD environments, a local registry cache avoids pulling base images from the internet:

```bash
# Run a local registry with caching
podman run -d -p 5000:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  --name registry-cache \
  registry:2

# Configure Podman to use it
# Edit /etc/containers/registries.conf
```

### 10. Avoid Unnecessary Rebuilds

Place cache-busting build arguments after expensive cached layers:

```dockerfile
# Bad: This busts the cache every time
ARG BUILD_DATE
RUN echo "Built on $BUILD_DATE" > /build-info.txt
RUN npm ci  # This gets rebuilt every time because the layer above changed

# Good: Put cache-busting arguments after cached layers
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ARG BUILD_DATE
RUN echo "Built on $BUILD_DATE" > /build-info.txt
```

## Conclusion

The biggest improvements to Podman build speed come from three areas: reducing the build context with `.containerignore`, optimizing layer caching by ordering Dockerfile instructions correctly, and using multi-stage builds. Cache mounts for package managers and proper base image selection provide additional gains. Apply these techniques systematically, starting with the build context and layer ordering, and you will see build times drop from minutes to seconds in most cases.

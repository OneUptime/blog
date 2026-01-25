# How to Use Docker BuildKit for Faster Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, BuildKit, CI/CD, Performance, DevOps

Description: Accelerate Docker image builds with BuildKit features including parallel stage execution, advanced caching, secret mounts, and SSH forwarding for significant build time improvements.

---

BuildKit is Docker's modern build subsystem that dramatically improves build performance. It builds stages in parallel, provides better caching, supports build secrets without leaking them into images, and offers many features not available in the legacy builder.

## Enabling BuildKit

### Temporary Enablement

```bash
# Enable for a single build
DOCKER_BUILDKIT=1 docker build -t myapp .

# Or export for the session
export DOCKER_BUILDKIT=1
docker build -t myapp .
```

### Permanent Enablement

```json
// /etc/docker/daemon.json
{
  "features": {
    "buildkit": true
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

Or use Docker Buildx (always uses BuildKit):

```bash
# Buildx is the Docker CLI plugin for BuildKit
docker buildx build -t myapp .
```

## Parallel Stage Execution

BuildKit automatically parallelizes independent build stages:

```dockerfile
# syntax=docker/dockerfile:1.4

# These stages build in parallel
FROM golang:1.22-alpine AS backend
WORKDIR /src
COPY backend/ .
RUN go build -o /app/backend

FROM node:20-alpine AS frontend
WORKDIR /src
COPY frontend/ .
RUN npm ci && npm run build

# Final stage waits for both
FROM alpine:3.20
COPY --from=backend /app/backend /app/
COPY --from=frontend /src/dist /app/static/
```

Without BuildKit, stages build sequentially. With BuildKit, backend and frontend build simultaneously, cutting build time significantly.

## Advanced Caching

### Cache Mounts

Cache mounts persist directories across builds, perfect for package manager caches:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

# Cache npm modules across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

For multiple package managers:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM python:3.12-slim

# Cache apt packages
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y build-essential

WORKDIR /app
COPY requirements.txt .

# Cache pip downloads
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .
```

### Cache Mount Options

```dockerfile
# Specify cache ID for isolation between projects
RUN --mount=type=cache,id=myapp-npm,target=/root/.npm npm ci

# Share cache with write access (default is shared)
RUN --mount=type=cache,target=/root/.npm,sharing=shared npm ci

# Private cache (locked during use)
RUN --mount=type=cache,target=/build,sharing=private make build

# Read-only cache from another stage
RUN --mount=type=cache,target=/deps,from=dependencies,source=/deps,ro \
    cp -r /deps/* ./
```

## Build Secrets

Safely use secrets during build without storing them in image layers:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

# Mount NPM token as secret
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci

COPY . .
RUN npm run build
```

Build with the secret:

```bash
docker build --secret id=npm_token,src=$HOME/.npmrc -t myapp .

# Or from environment variable
echo "$NPM_TOKEN" | docker build --secret id=npm_token -t myapp .
```

The secret is never stored in any image layer.

## SSH Forwarding

Access private repositories during build without copying keys:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM golang:1.22-alpine

RUN apk add --no-cache git openssh-client

# Configure git to use SSH
RUN mkdir -p ~/.ssh && \
    ssh-keyscan github.com >> ~/.ssh/known_hosts

WORKDIR /src
COPY go.mod go.sum ./

# Mount SSH agent for private repo access
RUN --mount=type=ssh \
    go mod download

COPY . .
RUN go build -o /app
```

Build with SSH forwarding:

```bash
# Ensure ssh-agent is running with your key
eval $(ssh-agent)
ssh-add ~/.ssh/id_ed25519

# Build with SSH mount
docker build --ssh default -t myapp .
```

## Inline Cache Export

Export cache metadata within images for registry-based caching:

```bash
# Build with inline cache metadata
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t myregistry/myapp:latest \
  .

# Push the image (includes cache)
docker push myregistry/myapp:latest

# Future builds use the pushed image as cache
docker build \
  --cache-from myregistry/myapp:latest \
  -t myregistry/myapp:new \
  .
```

## External Cache Backend

For CI/CD, use registry-based or local cache:

```bash
# Export cache to registry
docker buildx build \
  --cache-to type=registry,ref=myregistry/myapp:cache \
  --cache-from type=registry,ref=myregistry/myapp:cache \
  -t myapp:latest \
  .

# Export cache to local directory
docker buildx build \
  --cache-to type=local,dest=/tmp/buildcache \
  --cache-from type=local,src=/tmp/buildcache \
  -t myapp:latest \
  .
```

### GitHub Actions with BuildKit Cache

```yaml
name: Build

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```

## BuildKit Progress Output

BuildKit provides better progress display:

```bash
# Default auto-detecting output
docker build -t myapp .

# Plain text output (useful for CI logs)
docker build --progress=plain -t myapp .

# TTY output with real-time updates
docker build --progress=tty -t myapp .
```

## Here-Documents

BuildKit supports multi-line scripts with here-documents:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM ubuntu:22.04

# Multi-line script without escaping
RUN <<EOF
apt-get update
apt-get install -y curl git
rm -rf /var/lib/apt/lists/*
EOF

# Here-doc with different interpreter
RUN <<EOF python3
import os
print(f"Building in: {os.getcwd()}")
with open('/etc/build-info', 'w') as f:
    f.write('Built with BuildKit')
EOF
```

## Bind Mounts

Mount files from the build context without copying:

```dockerfile
# syntax=docker/dockerfile:1.4

FROM node:20-alpine

WORKDIR /app

# Bind mount for reading files without COPY
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

Bind mounts are useful when you need files temporarily but do not want them in the layer.

## BuildKit Configuration

Create a custom builder with specific settings:

```bash
# Create a new builder
docker buildx create --name mybuilder --config /path/to/buildkitd.toml

# Use the builder
docker buildx use mybuilder

# Build with the custom builder
docker buildx build -t myapp .
```

Builder configuration file:

```toml
# buildkitd.toml
[worker.oci]
  gc = true
  gckeepstorage = 20000000000  # 20GB

[[worker.oci.gcpolicy]]
  keepBytes = 10000000000       # 10GB
  keepDuration = 604800         # 7 days
  all = true
```

## Performance Comparison

Measure build time improvements:

```bash
# Time legacy builder
DOCKER_BUILDKIT=0 time docker build -t myapp:legacy .

# Time BuildKit
DOCKER_BUILDKIT=1 time docker build -t myapp:buildkit .
```

Typical improvements:

| Feature | Legacy | BuildKit | Improvement |
|---------|--------|----------|-------------|
| First build | 5m 30s | 3m 15s | 40% faster |
| Cached build | 45s | 12s | 75% faster |
| Parallel stages | Sequential | Parallel | 2-4x faster |

## Best Practices

1. **Always specify syntax directive** at the top of Dockerfile:
   ```dockerfile
   # syntax=docker/dockerfile:1.4
   ```

2. **Use cache mounts** for package managers (npm, pip, apt, go)

3. **Leverage parallel builds** by structuring independent stages

4. **Export cache to registry** for CI/CD pipelines

5. **Use secrets** for sensitive build-time data

6. **Enable BuildKit permanently** in daemon.json

---

BuildKit transforms Docker builds with parallel execution, advanced caching, and secure secret handling. Enable it permanently, use cache mounts for package managers, and leverage registry-based caching in CI/CD pipelines. These features alone can cut build times by 50% or more, significantly improving developer productivity and deployment speed.

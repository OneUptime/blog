# How to Use Docker BuildKit Cache Mounts and Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, BuildKit, Cache, Secrets, Performance, Security

Description: Learn how to use Docker BuildKit's advanced features including cache mounts for faster builds, build secrets for secure credential handling, and other performance optimizations.

---

BuildKit is Docker's modern build engine that provides significant improvements over the legacy builder. It offers cache mounts for persistent build caches, secret mounts for secure credential handling, and many other optimizations that make builds faster and more secure.

## Enable BuildKit

### Environment Variable

```bash
# Enable BuildKit for a single build
DOCKER_BUILDKIT=1 docker build -t myimage .

# Enable permanently (add to shell profile)
export DOCKER_BUILDKIT=1
```

### Docker Daemon Configuration

```json
// /etc/docker/daemon.json
{
  "features": {
    "buildkit": true
  }
}
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    x-bake:
      # BuildKit-specific options
```

Or set environment:
```bash
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

## Cache Mounts

Cache mounts persist build caches between builds, dramatically speeding up dependency installation.

### Syntax

```dockerfile
# syntax=docker/dockerfile:1.4

RUN --mount=type=cache,target=/path/to/cache command
```

### Package Manager Caches

#### APT (Debian/Ubuntu)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM ubuntu:22.04

# Cache APT packages
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y \
    curl \
    git \
    build-essential
```

#### APK (Alpine)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM alpine:3.19

RUN --mount=type=cache,target=/var/cache/apk \
    apk add --update nodejs npm
```

#### pip (Python)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM python:3.11

WORKDIR /app
COPY requirements.txt .

# Cache pip downloads
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

#### npm (Node.js)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20

WORKDIR /app
COPY package*.json ./

# Cache npm packages
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

#### Go Modules

```dockerfile
# syntax=docker/dockerfile:1.4
FROM golang:1.21

WORKDIR /app
COPY go.mod go.sum ./

# Cache Go modules
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o app .
```

#### Maven (Java)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM maven:3.9-eclipse-temurin-21

WORKDIR /app
COPY pom.xml .

# Cache Maven dependencies
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn package -DskipTests
```

#### Cargo (Rust)

```dockerfile
# syntax=docker/dockerfile:1.4
FROM rust:1.74

WORKDIR /app
COPY Cargo.toml Cargo.lock ./

# Cache Cargo registry and build artifacts
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo fetch

COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    cp target/release/app /app/app-binary
```

### Cache Mount Options

```dockerfile
RUN --mount=type=cache,\
    target=/path,\
    id=cache-id,\
    sharing=shared,\
    from=builder,\
    source=/path,\
    mode=0755,\
    uid=1000,\
    gid=1000 \
    command
```

| Option | Description |
|--------|-------------|
| `target` | Mount path in container |
| `id` | Unique cache identifier |
| `sharing` | `shared`, `private`, or `locked` |
| `from` | Stage to copy cache from |
| `source` | Source path from stage |
| `mode` | Directory permissions |
| `uid/gid` | Owner user/group IDs |

## Build Secrets

Secrets allow you to use sensitive data during build without embedding it in the image.

### Basic Secret Usage

```dockerfile
# syntax=docker/dockerfile:1.4
FROM alpine:3.19

# Use secret during build
RUN --mount=type=secret,id=mytoken \
    cat /run/secrets/mytoken

# Custom mount target
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install
```

### Passing Secrets

```bash
# From file
docker build --secret id=mytoken,src=./token.txt -t myimage .

# From environment variable
docker build --secret id=mytoken,env=MY_TOKEN -t myimage .
```

### Private Registry Authentication

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20

WORKDIR /app
COPY package*.json ./

# Mount npm credentials during install
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .
RUN npm run build
```

Build command:
```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t myapp .
```

### Git Repository Cloning

```dockerfile
# syntax=docker/dockerfile:1.4
FROM alpine:3.19

RUN apk add --no-cache git openssh-client

# Mount SSH key for private repo
RUN --mount=type=ssh \
    git clone git@github.com:org/private-repo.git

# Or use token
RUN --mount=type=secret,id=github_token \
    git clone https://$(cat /run/secrets/github_token)@github.com/org/private-repo.git
```

### Docker Compose Secrets

```yaml
services:
  app:
    build:
      context: .
      secrets:
        - npmrc
        - github_token

secrets:
  npmrc:
    file: ~/.npmrc
  github_token:
    environment: GITHUB_TOKEN
```

## SSH Forwarding

Mount SSH agent socket for Git operations.

```dockerfile
# syntax=docker/dockerfile:1.4
FROM alpine:3.19

RUN apk add --no-cache git openssh-client

# Add GitHub to known hosts
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts

# Clone private repo using SSH agent
RUN --mount=type=ssh \
    git clone git@github.com:org/private-repo.git
```

Build command:
```bash
# Ensure SSH agent is running with your key
eval $(ssh-agent)
ssh-add ~/.ssh/id_rsa

# Build with SSH forwarding
docker build --ssh default -t myimage .
```

## Bind Mounts

Mount host directories during build.

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20

WORKDIR /app

# Mount source code read-only
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

## Temporary Mounts

Create tmpfs mounts for temporary files.

```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20

WORKDIR /app
COPY . .

# Use tmpfs for build artifacts
RUN --mount=type=tmpfs,target=/tmp \
    npm run build
```

## Complete Example: Multi-Stage with All Features

```dockerfile
# syntax=docker/dockerfile:1.4

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache and private registry
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --only=production

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .

# Build with environment secrets
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Build command:
```bash
docker build \
  --secret id=npmrc,src=$HOME/.npmrc \
  --secret id=api_key,env=API_KEY \
  -t myapp:latest .
```

## Buildx Bake

For complex builds, use buildx bake with HCL or JSON configuration.

```hcl
# docker-bake.hcl

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["app"]
}

target "app" {
  dockerfile = "Dockerfile"
  tags = ["myapp:${TAG}"]
  cache-from = ["type=registry,ref=myapp:cache"]
  cache-to = ["type=registry,ref=myapp:cache,mode=max"]
  secret = [
    "id=npmrc,src=${HOME}/.npmrc"
  ]
}
```

Build:
```bash
docker buildx bake
```

## Inline Cache

Export build cache with the image for CI/CD.

```bash
# Build with inline cache
docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t myapp:latest .

# Push image (includes cache metadata)
docker push myapp:latest

# Later builds use cached image
docker build \
  --cache-from myapp:latest \
  -t myapp:latest .
```

## Registry Cache

Store cache in a registry separately from the image.

```bash
# Build with registry cache
docker buildx build \
  --cache-from type=registry,ref=myregistry/myapp:cache \
  --cache-to type=registry,ref=myregistry/myapp:cache,mode=max \
  -t myapp:latest \
  --push .
```

## Local Cache

Use local directory for cache.

```bash
# Build with local cache
docker buildx build \
  --cache-from type=local,src=/tmp/buildcache \
  --cache-to type=local,dest=/tmp/buildcache \
  -t myapp:latest .
```

## Troubleshooting

### Debug BuildKit Builds

```bash
# Enable debug output
BUILDKIT_PROGRESS=plain docker build -t myimage .

# Show detailed cache information
docker buildx du
```

### Clear Build Cache

```bash
# Remove all build cache
docker builder prune -a

# Remove cache older than 24h
docker builder prune --filter "until=24h"
```

### Verify Secrets Aren't in Image

```bash
# Check image history
docker history --no-trunc myimage

# Inspect image layers
docker save myimage | tar -tv

# Scan for secrets
trivy image myimage
```

## Summary

| Feature | Syntax | Purpose |
|---------|--------|---------|
| Cache mount | `--mount=type=cache` | Persist package caches |
| Secret mount | `--mount=type=secret` | Use credentials during build |
| SSH mount | `--mount=type=ssh` | Forward SSH agent |
| Bind mount | `--mount=type=bind` | Mount host files |
| Tmpfs mount | `--mount=type=tmpfs` | Temporary storage |

BuildKit's advanced features significantly improve build performance and security. Cache mounts can reduce build times by 10x or more for dependency installation. Secrets ensure credentials never appear in image layers. Combined with multi-stage builds, these features enable efficient, secure container image builds.


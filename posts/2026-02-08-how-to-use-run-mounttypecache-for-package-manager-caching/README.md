# How to Use RUN --mount=type=cache for Package Manager Caching

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, BuildKit, Caching, Package Managers, DevOps, Optimization

Description: Speed up Docker builds by caching package manager downloads with RUN --mount=type=cache for apt, pip, npm, and more.

---

Every time you build a Docker image that installs packages, the package manager downloads all dependencies from scratch. Change one line in your requirements file and pip redownloads every package. Add one system dependency and apt refetches the entire package index. This is painfully slow, especially on slower network connections.

The `RUN --mount=type=cache` feature in BuildKit solves this by persisting package manager caches between builds. Downloaded packages stay on disk, and subsequent builds reuse them instead of hitting the network again. The cache does not end up in the final image, so your images stay small while your builds get fast.

## How Cache Mounts Work

A cache mount creates a directory that persists across builds but never becomes part of any image layer. Think of it as a shared scratch space that BuildKit manages. When a RUN instruction uses a cache mount, it gets access to the cached directory during execution. After the instruction completes, the cache directory is detached, and only the actual changes to the container filesystem become part of the layer.

The basic syntax looks like this:

```dockerfile
# syntax=docker/dockerfile:1

FROM debian:bookworm-slim

# The cache mount persists /var/cache/apt between builds
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y curl
```

## Requirements

Cache mounts require BuildKit. Docker Desktop and Docker Engine 23.0+ use BuildKit by default. If you are on an older version, enable it explicitly:

```bash
# Enable BuildKit if not already the default
export DOCKER_BUILDKIT=1

# Or use docker buildx build which always uses BuildKit
docker buildx build -t myapp .
```

You also need the syntax directive at the top of your Dockerfile:

```dockerfile
# This must be the first line in the Dockerfile
# syntax=docker/dockerfile:1
```

## Caching apt (Debian/Ubuntu)

Apt stores downloaded .deb files in `/var/cache/apt/archives` and package lists in `/var/lib/apt/lists`. Caching both directories eliminates redundant downloads.

Cache apt downloads between builds:

```dockerfile
# syntax=docker/dockerfile:1

FROM ubuntu:22.04

# Cache both the package lists and downloaded .deb files
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
        build-essential

# No need for "rm -rf /var/lib/apt/lists/*" because
# the cache mount keeps these files OUT of the final layer
```

Notice that we no longer need the `rm -rf /var/lib/apt/lists/*` cleanup step. The cache mount directory is not included in the image layer, so there is nothing to clean up. This simplifies the Dockerfile and the cache persists for the next build.

## Caching pip (Python)

Pip caches downloaded wheels and source distributions in `~/.cache/pip`. Mounting this directory means pip only downloads packages that are not already cached.

Speed up Python dependency installation:

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .

# Mount pip's cache directory to reuse downloaded packages
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

The improvement is dramatic. A fresh build might take 2 minutes to download and install 50 packages. A rebuild after changing one dependency takes seconds because 49 packages are already cached.

## Caching npm (Node.js)

npm stores its cache in `~/.npm`. Caching this directory speeds up `npm install` and `npm ci` significantly.

Cache npm downloads:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./

# Mount npm cache for faster installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production

COPY . .
CMD ["node", "index.js"]
```

For yarn, the cache directory is different:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app
COPY package.json yarn.lock ./

# Mount yarn cache
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --production

COPY . .
CMD ["node", "index.js"]
```

## Caching Go Modules

Go caches downloaded modules in the Go module cache and build artifacts in the Go build cache. Mounting both gives you faster dependency resolution and compilation.

Cache Go module downloads and build artifacts:

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

# Cache Go module downloads
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Cache both module downloads and build artifacts
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /server ./cmd/server

FROM alpine:3.19
COPY --from=builder /server /usr/local/bin/server
CMD ["server"]
```

The Go build cache (`/root/.cache/go-build`) stores compiled packages. If you change one file, Go only recompiles the affected package instead of everything.

## Caching Maven (Java)

Maven downloads dependencies to `~/.m2/repository`. This directory can grow large and takes a long time to populate from scratch.

Cache Maven dependency downloads:

```dockerfile
# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app
COPY pom.xml .

# Cache Maven's local repository
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline

COPY src ./src

RUN --mount=type=cache,target=/root/.m2/repository \
    mvn package -DskipTests

FROM eclipse-temurin:21-jre
COPY --from=builder /app/target/*.jar /app/app.jar
CMD ["java", "-jar", "/app/app.jar"]
```

## Caching Gradle (Java/Kotlin)

Gradle uses `~/.gradle` for caches and downloaded dependencies:

```dockerfile
# syntax=docker/dockerfile:1

FROM gradle:8.5-jdk21 AS builder

WORKDIR /app
COPY build.gradle settings.gradle ./

# Cache Gradle wrapper and dependency downloads
RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle dependencies --no-daemon

COPY src ./src

RUN --mount=type=cache,target=/home/gradle/.gradle \
    gradle build --no-daemon

FROM eclipse-temurin:21-jre
COPY --from=builder /app/build/libs/*.jar /app/app.jar
CMD ["java", "-jar", "/app/app.jar"]
```

## Caching apk (Alpine)

Alpine's package manager also benefits from cache mounts:

```dockerfile
# syntax=docker/dockerfile:1

FROM alpine:3.19

# Cache apk package downloads
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache curl git openssh
```

Wait, there is a subtlety here. The `--no-cache` flag in apk tells it not to use or create a local cache. When using a cache mount, you should remove that flag:

```dockerfile
# syntax=docker/dockerfile:1

FROM alpine:3.19

# Let apk use the cache mount for downloads
RUN --mount=type=cache,target=/var/cache/apk \
    ln -s /var/cache/apk /etc/apk/cache && \
    apk add curl git openssh
```

## Cache Mount Options

The cache mount supports several options that control its behavior.

Sharing mode controls concurrent access:

```dockerfile
# shared (default): multiple builds can use the cache simultaneously
RUN --mount=type=cache,target=/root/.cache/pip,sharing=shared \
    pip install -r requirements.txt

# locked: only one build can use the cache at a time
RUN --mount=type=cache,target=/root/.cache/pip,sharing=locked \
    pip install -r requirements.txt

# private: each build gets its own copy of the cache
RUN --mount=type=cache,target=/root/.cache/pip,sharing=private \
    pip install -r requirements.txt
```

Set a unique ID to separate caches for different purposes:

```dockerfile
# Use different cache IDs for different stages or Dockerfiles
RUN --mount=type=cache,id=pip-prod,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,id=pip-dev,target=/root/.cache/pip \
    pip install -r requirements-dev.txt
```

## Cache Mounts in CI/CD

Cache mounts persist on the build host. In CI environments where each build runs on a fresh machine, you need to export and import the cache.

Use BuildKit's cache export with GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with cache
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

The GitHub Actions cache backend (`type=gha`) persists BuildKit's layer cache, including cache mount contents, between workflow runs.

## Measuring the Impact

Compare build times with and without cache mounts:

```bash
# Clean build without cache mounts
docker builder prune -af
time docker build -t test-no-cache -f Dockerfile.nocache .

# Clean build with cache mounts (first run, cache is empty)
docker builder prune -af
time docker build -t test-cache -f Dockerfile.cache .

# Rebuild with cache mounts (cache is populated)
# Change a source file to trigger a rebuild
time docker build -t test-cache -f Dockerfile.cache .
```

Typical results for a Python project with 100 dependencies:

```
Without cache mounts: 120 seconds (every rebuild)
With cache mounts (first build): 120 seconds
With cache mounts (rebuild): 15 seconds
```

## Summary

Cache mounts keep package manager downloads between builds without bloating your images. Add `# syntax=docker/dockerfile:1` to the top of your Dockerfile, then mount the appropriate cache directory for your package manager. The key directories are `/var/cache/apt` for apt, `/root/.cache/pip` for pip, `/root/.npm` for npm, `/go/pkg/mod` for Go, and `/root/.m2/repository` for Maven. In CI environments, use BuildKit's cache export features to persist caches across builds.

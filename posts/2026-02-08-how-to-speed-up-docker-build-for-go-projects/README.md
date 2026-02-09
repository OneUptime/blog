# How to Speed Up Docker Build for Go Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, go, golang, build optimization, layer caching, multi-stage builds

Description: Optimize Docker builds for Go applications with module caching and compilation strategies

---

Go is already one of the fastest languages to compile, but Docker builds can still feel slow when you are downloading modules repeatedly and not taking advantage of the build cache. A Go project with a hundred dependencies might build in 10 seconds locally but take 3 minutes in Docker because every module gets re-downloaded. Let's fix that with practical techniques that bring Docker build times close to local build speeds.

## The Baseline: A Slow Build

Most Go developers start with something like this:

```dockerfile
# BAD: Downloads all modules and recompiles everything on any change
FROM golang:1.22-alpine
WORKDIR /app
COPY . .
RUN go build -o /server ./cmd/server
CMD ["/server"]
```

This copies everything, runs `go build`, and produces a working image. The problem is that any file change invalidates the `COPY . .` layer and forces Go to re-download all modules and recompile every package.

## Technique 1: Separate Module Download from Compilation

Copy `go.mod` and `go.sum` first, download modules, then copy source code:

```dockerfile
# GOOD: Module cache persists unless go.mod/go.sum change
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Copy module files first
COPY go.mod go.sum ./

# Download modules - cached unless go.mod or go.sum changes
RUN go mod download

# Copy source code - only this layer rebuilds on code changes
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM scratch
COPY --from=builder /server /server
CMD ["/server"]
```

When you edit a `.go` file, Docker reuses the cached module download layer and only recompiles the source. This alone cuts most incremental builds from minutes to seconds.

## Technique 2: BuildKit Cache Mounts

Cache mounts preserve Go's module cache and build cache between Docker builds, even when the layer cache is invalidated:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
COPY . .

# Mount both the module cache and the build cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM scratch
COPY --from=builder /server /server
CMD ["/server"]
```

```bash
# Enable BuildKit
DOCKER_BUILDKIT=1 docker build -t myapp .
```

The Go build cache (`/root/.cache/go-build`) stores compiled packages. Even when source code changes, Go only recompiles the packages that are affected. The module cache (`/go/pkg/mod`) stores downloaded dependencies. Together, these caches make incremental builds nearly as fast as local builds.

## Technique 3: Combine Both Approaches

For maximum speed, use both layer ordering and cache mounts:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Layer 1: Module download (cached unless go.mod/go.sum change)
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Layer 2: Build (uses go build cache for incremental compilation)
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Minimal production image
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

The `-ldflags="-s -w"` flag strips debug information and the symbol table from the binary, reducing its size by 20-30%.

## Technique 4: Multi-Stage Builds with scratch

Go's ability to produce statically linked binaries makes it a perfect match for the `scratch` base image:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.22-alpine AS builder
# Install CA certificates and timezone data in the build stage
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .

# Static binary with no external dependencies
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /server ./cmd/server

# Final image: just the binary and supporting files
FROM scratch

# Copy CA certificates for HTTPS connections
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data for time.LoadLocation()
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /server /server

# Run as non-root (numeric user since scratch has no /etc/passwd)
USER 65534

EXPOSE 8080
ENTRYPOINT ["/server"]
```

This produces a final image that is typically 10-20MB, containing nothing but your binary and essential certificates.

## Technique 5: Optimize for CGO-Enabled Builds

Some Go libraries require CGO (SQLite, certain crypto packages). These need a different approach:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.22 AS builder
# Install C build tools for CGO
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libc6-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .

# CGO enabled - produces dynamically linked binary
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /server ./cmd/server

# Use distroless instead of scratch for dynamic linking support
FROM gcr.io/distroless/base-debian12
COPY --from=builder /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

For CGO builds, use `distroless/base` instead of `scratch` since the binary needs glibc at runtime.

## Technique 6: Parallel Build for Multiple Binaries

If your project produces multiple binaries, build them in parallel stages:

```dockerfile
# syntax=docker/dockerfile:1

# Shared base with modules downloaded
FROM golang:1.22-alpine AS base
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .

# Build API server (runs in parallel with other stages)
FROM base AS build-api
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o /api ./cmd/api

# Build worker (runs in parallel with api build)
FROM base AS build-worker
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o /worker ./cmd/worker

# Build CLI tool (runs in parallel)
FROM base AS build-cli
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o /cli ./cmd/cli

# Final image with all binaries
FROM scratch
COPY --from=build-api /api /api
COPY --from=build-worker /worker /worker
COPY --from=build-cli /cli /cli
```

BuildKit executes independent stages in parallel, so all three binaries compile simultaneously.

## Technique 7: Use a .dockerignore File

```
# .dockerignore - exclude non-essential files
.git
.gitignore
*.md
vendor
bin
dist
.env
.env.*
docker-compose*.yml
Dockerfile*
.dockerignore
.vscode
.idea
**/*_test.go
```

Note: excluding `*_test.go` from the Docker image is fine since you run tests separately. Removing test files from the build context means Docker does not need to send them to the daemon.

## Technique 8: Cross-Compilation for Multi-Architecture

Go's built-in cross-compilation is faster than building with QEMU emulation:

```bash
# SLOW: Using buildx with QEMU emulation
docker buildx build --platform linux/amd64,linux/arm64 -t myapp .

# FAST: Cross-compile in the Dockerfile instead
```

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .

# Cross-compile natively - much faster than QEMU emulation
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-s -w" -o /server ./cmd/server

FROM scratch
COPY --from=builder /server /server
ENTRYPOINT ["/server"]
```

```bash
# Build for both platforms using native cross-compilation
docker buildx build --platform linux/amd64,linux/arm64 --push -t myapp:latest .
```

This builds both architectures using the host CPU natively. Go handles cross-compilation internally, so there is no QEMU overhead. A build that takes 10 minutes with emulation finishes in under a minute with cross-compilation.

## Build Time Comparison

| Approach | Clean Build | Incremental Build |
|---|---|---|
| Naive Dockerfile | 2-3 min | 2-3 min |
| Separated modules | 2-3 min | 20-30 sec |
| BuildKit cache mounts | 30-60 sec | 5-15 sec |
| Both combined | 30-60 sec | 3-10 sec |

The combined approach gives you near-instant incremental builds. Go's compiler is already fast; the main bottleneck was module downloads, which caching eliminates entirely. Start with technique 3 (the combined approach) and add cross-compilation if you target multiple architectures.

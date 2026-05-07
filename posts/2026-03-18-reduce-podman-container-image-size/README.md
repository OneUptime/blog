# How to Reduce Podman Container Image Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Docker, Image Optimization, DevOps, Multi-Stage Build, Linux

Description: A practical guide to reducing Podman container image sizes using multi-stage builds, minimal base images, layer optimization, and dependency management techniques.

---

> Bloated container images waste bandwidth, slow deployments, and increase your attack surface. Every megabyte you trim pays dividends across every pull, push, and startup in your infrastructure.

Container image size directly impacts deployment speed, storage costs, and security posture. A 1GB image that could be 50MB means slower CI/CD pipelines, more registry storage, and a larger attack surface. Podman uses the same OCI image format as Docker, so all image optimization techniques apply. This guide covers practical strategies to shrink your Podman images dramatically.

---

## Audit Your Current Image Size

Start by understanding what is consuming space in your existing images:

```bash
# Check image size

podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# Inspect layer sizes
podman history your-image:latest

# Get detailed layer breakdown
podman inspect your-image:latest --format '{{range .RootFS.Layers}}{{.}}{{"\n"}}{{end}}'
```

The `podman history` command shows each layer with its size, making it easy to identify which Dockerfile instructions create the largest layers.

---

## Choose the Right Base Image

Your base image is the foundation of your image size. Here is how common bases compare:

| Base Image | Approximate Image Size | Use Case |
|-----------|----------------|----------|
| ubuntu:24.04 | ~77MB | Full OS, broad compatibility |
| debian:bookworm-slim | ~52MB | Debian without extras |
| alpine:3.23 | ~8MB | Minimal Linux with musl libc |
| gcr.io/distroless/base | ~20MB | No shell, no package manager |
| scratch | 0MB | Empty, for static binaries |

Choose the smallest base that supports your application:

```dockerfile
# For Python applications - use slim variant
FROM python:3.12-slim AS base

# For Go applications - use scratch
FROM scratch

# For Node.js - use alpine variant
FROM node:22-alpine

# For Java - use Eclipse Temurin slim
FROM eclipse-temurin:21-jre-alpine
```

---

## Multi-Stage Builds

Multi-stage builds are the most effective technique for reducing image size. Build dependencies stay in the build stage and never appear in the final image:

```dockerfile
# Stage 1: Build with all tools
FROM golang:1.26 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Static binary - no external dependencies needed
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# Stage 2: Minimal runtime
FROM scratch
# Copy only the compiled binary
COPY --from=builder /app/server /server
# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/server"]
```

For Python, separate the dependency installation from the runtime:

```dockerfile
# Build stage - install and compile dependencies
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Runtime stage - only the installed packages
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY . .
CMD ["python", "main.py"]
```

For Node.js applications, use multi-stage to exclude devDependencies:

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

---

## Minimize Layer Size

Each `RUN` instruction creates a layer. Files deleted in a later layer still occupy space in earlier layers. Combine operations and clean up in the same layer:

```dockerfile
# Bad: Deleted files still exist in previous layers (3 layers, ~200MB)
RUN apt-get update
RUN apt-get install -y build-essential gcc
RUN make && make install
RUN apt-get purge -y build-essential gcc
RUN rm -rf /var/lib/apt/lists/*

# Good: Single layer with cleanup (~50MB)
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential gcc && \
    make && make install && \
    apt-get purge -y --auto-remove build-essential gcc && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

The `--no-install-recommends` flag prevents APT from installing suggested packages, saving significant space.

---

## Use .containerignore

Prevent unnecessary files from entering the build context. A large build context slows down builds and can accidentally include sensitive or large files:

```text
# .containerignore
.git
.gitignore
node_modules
*.md
LICENSE
docs/
tests/
test/
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.env
.env.*
docker-compose*.yml
Makefile
.vscode
.idea
coverage/
dist/
build/
```

---

## Remove Unnecessary Files

Identify and remove common space wasters:

```dockerfile
FROM python:3.12-slim

# Remove documentation, man pages, and locale data
RUN rm -rf /usr/share/doc /usr/share/man /usr/share/locale

# Install only what you need
RUN pip install --no-cache-dir --no-compile your-package

# Remove pip cache and bytecode
RUN find /usr/local -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
    find /usr/local -name '*.pyc' -delete 2>/dev/null; \
    rm -rf /root/.cache
```

For Alpine-based images, clean up APK cache:

```dockerfile
FROM alpine:3.23

RUN apk add --no-cache curl jq && \
    rm -rf /var/cache/apk/*
```

The `--no-cache` flag for `apk add` avoids creating a local cache entirely.

---

## Compress Binaries

For compiled applications, strip debug symbols and compress binaries:

```dockerfile
FROM golang:1.26 AS builder
WORKDIR /app
COPY . .

# -s removes symbol table, -w removes DWARF debug info
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/server .

# Optional: UPX compression (30-50% smaller)
RUN apt-get update && apt-get install -y --no-install-recommends upx-ucl && \
    upx --best /app/server && \
    rm -rf /var/lib/apt/lists/*
```

For C/C++ applications:

```dockerfile
RUN gcc -O2 -o myapp main.c && \
    strip --strip-all myapp
```

---

## Use Podman Squash

Podman can squash all layers into a single layer, eliminating space wasted by files that were created and then deleted across layers:

```bash
# Build with layer squashing (squashes only new layers, keeps base image layers for caching)
podman build --squash -t your-image:optimized .

# Or squash all layers including base image layers into a single layer
podman build --squash-all -t your-image:optimized .
```

Squashing trades layer caching for smaller images. Use it for final production builds, not during development.

---

## Optimize Package Managers

Each package manager has flags to minimize installed size:

```dockerfile
# APT: Skip recommends and clean cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends package-name && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# DNF/YUM: Use --nodocs and clean
RUN dnf install -y --nodocs package-name && \
    dnf clean all && \
    rm -rf /var/cache/dnf

# pip: No cache, no compile
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# npm: Production only, clean cache
RUN npm ci --omit=dev && npm cache clean --force

# Go: Download only needed modules
RUN go mod download && go mod verify
```

---

## Compare Before and After

Always verify your optimizations with measurements:

```bash
#!/bin/bash
# compare-sizes.sh

echo "=== Image Size Comparison ==="
echo ""

# Build unoptimized version
podman build -t app:unoptimized -f Dockerfile.original .
SIZE_BEFORE=$(podman image inspect app:unoptimized --format '{{.Size}}')

# Build optimized version
podman build -t app:optimized -f Dockerfile.optimized .
SIZE_AFTER=$(podman image inspect app:optimized --format '{{.Size}}')

echo "Before: $((SIZE_BEFORE / 1048576)) MB"
echo "After:  $((SIZE_AFTER / 1048576)) MB"
echo "Saved:  $(( (SIZE_BEFORE - SIZE_AFTER) / 1048576 )) MB"
echo "Reduction: $(( (SIZE_BEFORE - SIZE_AFTER) * 100 / SIZE_BEFORE ))%"
```

You can also use `podman image tree` to visualize the layer structure:

```bash
# Show image layer tree
podman image tree your-image:latest
```

---

## Conclusion

Reducing container image size is a compounding optimization. Smaller images pull faster, start faster, consume less storage, and present a smaller attack surface. Start with the highest-impact changes: pick a minimal base image and use multi-stage builds. Then refine with layer consolidation, dependency pruning, and binary compression. A typical application image can be reduced from over 1GB to under 50MB with these techniques. Make image size a metric you track in CI, and prevent bloat from creeping back in over time.

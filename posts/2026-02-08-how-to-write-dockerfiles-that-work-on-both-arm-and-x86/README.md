# How to Write Dockerfiles That Work on Both ARM and x86

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, ARM, x86, Multi-Architecture, BuildKit, DevOps, Cross-Platform

Description: A practical guide to writing Dockerfiles that build and run on both ARM64 and x86_64 architectures using Docker Buildx.

---

The days of x86 being the only architecture that matters are behind us. Apple Silicon Macs run on ARM64. AWS Graviton instances save money on ARM. Raspberry Pi clusters run ARM. If you build Docker images that only work on x86_64, you are cutting off a growing chunk of the computing landscape.

Writing cross-architecture Dockerfiles is not difficult once you understand the patterns. This guide covers everything from basic multi-platform builds to handling architecture-specific binaries and conditional logic in Dockerfiles.

## Understanding the Problem

A Docker image built on an x86_64 machine contains x86_64 binaries. Try to run that image on an ARM machine and it fails. The kernel cannot execute binaries compiled for a different CPU architecture.

Docker can emulate other architectures using QEMU, but emulation is slow. The proper solution is to build native images for each target architecture and publish them under a single tag using a manifest list.

## Setting Up Docker Buildx

Docker Buildx is the tool that makes multi-platform builds possible. It comes pre-installed with Docker Desktop and recent versions of Docker Engine.

Check if Buildx is available and create a multi-platform builder:

```bash
# Verify buildx is available
docker buildx version

# Create a new builder instance with multi-platform support
docker buildx create --name multiarch --driver docker-container --bootstrap

# Set it as the active builder
docker buildx use multiarch

# Verify the builder supports multiple platforms
docker buildx inspect --bootstrap
# You should see platforms like: linux/amd64, linux/arm64, linux/arm/v7
```

## Your First Multi-Platform Build

Most Dockerfiles work across architectures without any changes, as long as the base image supports multiple platforms.

A simple Dockerfile that works on both ARM and x86:

```dockerfile
# This Dockerfile works on both ARM64 and x86_64
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["python", "app.py"]
```

Build it for both platforms:

```bash
# Build for both AMD64 and ARM64, push to a registry
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t myregistry/myapp:latest \
    --push .
```

The `--push` flag is required because multi-platform images cannot be loaded into the local Docker daemon directly. They need to go to a registry. For local testing, build for a single platform:

```bash
# Build for the current platform only (loads into local Docker)
docker buildx build --load -t myapp:latest .
```

## Choosing the Right Base Image

Not all base images support multiple architectures. Before writing your Dockerfile, verify that your base image supports your target platforms.

Check which architectures a base image supports:

```bash
# Inspect the available platforms for an image
docker buildx imagetools inspect python:3.12-slim

# Look for the "Platform" entries in the output
docker buildx imagetools inspect nginx:alpine | grep -A2 "Platform"
```

Most official Docker images support at least `linux/amd64` and `linux/arm64`. Some also support `linux/arm/v7` (32-bit ARM, common on older Raspberry Pis).

## Handling Architecture-Specific Downloads

The trickiest part of multi-architecture Dockerfiles is dealing with binaries that have different download URLs per architecture. Many tools distribute separate binaries for each platform.

Use Docker's built-in `TARGETARCH` variable to download the correct binary:

```dockerfile
# Download architecture-specific binaries using TARGETARCH
FROM debian:bookworm-slim

# TARGETARCH is automatically set by Docker Buildx
# It will be "amd64" on x86_64 and "arm64" on ARM
ARG TARGETARCH

# Download the correct binary based on the target architecture
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL "https://example.com/tool-linux-${TARGETARCH}" \
        -o /usr/local/bin/tool && \
    chmod +x /usr/local/bin/tool && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

CMD ["tool"]
```

Docker provides several build-time variables automatically:

```dockerfile
# Available platform variables
ARG TARGETPLATFORM   # e.g., linux/amd64, linux/arm64
ARG TARGETOS         # e.g., linux
ARG TARGETARCH       # e.g., amd64, arm64
ARG TARGETVARIANT    # e.g., v7 (for armv7)
ARG BUILDPLATFORM    # Platform of the build machine
ARG BUILDOS          # OS of the build machine
ARG BUILDARCH        # Architecture of the build machine
```

## Handling Different Naming Conventions

Some projects use different naming conventions for architectures. Go uses `amd64` and `arm64`, but some projects use `x86_64` and `aarch64` instead.

Map Docker's architecture names to the project's naming convention:

```dockerfile
# Map architecture names when projects use different conventions
FROM debian:bookworm-slim

ARG TARGETARCH

# Some tools use x86_64/aarch64 instead of amd64/arm64
RUN ARCH=$(case "${TARGETARCH}" in \
        amd64) echo "x86_64" ;; \
        arm64) echo "aarch64" ;; \
        *) echo "${TARGETARCH}" ;; \
    esac) && \
    curl -fsSL "https://github.com/example/releases/download/v1.0/tool-linux-${ARCH}.tar.gz" \
        -o /tmp/tool.tar.gz && \
    tar xzf /tmp/tool.tar.gz -C /usr/local/bin/ && \
    rm /tmp/tool.tar.gz
```

## Conditional Logic with Architecture Checks

Sometimes you need different installation steps for different architectures.

Use shell conditionals for architecture-specific logic:

```dockerfile
# Architecture-specific installation logic
FROM ubuntu:22.04

ARG TARGETARCH

# Install different packages depending on architecture
RUN apt-get update && \
    if [ "${TARGETARCH}" = "amd64" ]; then \
        # x86_64 specific: install Intel MKL for better performance
        apt-get install -y --no-install-recommends libmkl-dev; \
    elif [ "${TARGETARCH}" = "arm64" ]; then \
        # ARM64 specific: install OpenBLAS instead
        apt-get install -y --no-install-recommends libopenblas-dev; \
    fi && \
    rm -rf /var/lib/apt/lists/*
```

## Multi-Platform Go Builds

Go has excellent cross-compilation support. You can compile Go programs for any architecture from any build machine without emulation.

Cross-compile a Go application:

```dockerfile
# Multi-platform Go build without emulation
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

# Use the build machine's native architecture for compilation
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Cross-compile for the target architecture
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -o /app/server ./cmd/server

# Final stage uses the target platform
FROM alpine:3.19
COPY --from=builder /app/server /usr/local/bin/server
CMD ["server"]
```

The key insight here is `FROM --platform=$BUILDPLATFORM`. This tells Docker to run the build stage on the native architecture of the build machine rather than emulating the target architecture. The Go compiler handles cross-compilation natively, which is much faster than running under QEMU emulation.

## Multi-Platform Rust Builds

Rust cross-compilation requires a cross-linker for the target architecture.

Cross-compile a Rust application:

```dockerfile
# Multi-platform Rust build
FROM --platform=$BUILDPLATFORM rust:1.76-slim AS builder

ARG TARGETARCH

# Install the cross-compilation toolchain
RUN apt-get update && \
    if [ "${TARGETARCH}" = "arm64" ]; then \
        apt-get install -y gcc-aarch64-linux-gnu && \
        rustup target add aarch64-unknown-linux-gnu; \
    fi && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build for the target architecture
RUN if [ "${TARGETARCH}" = "arm64" ]; then \
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc && \
        cargo build --release --target aarch64-unknown-linux-gnu && \
        cp target/aarch64-unknown-linux-gnu/release/myapp /app/myapp; \
    else \
        cargo build --release && \
        cp target/release/myapp /app/myapp; \
    fi

FROM debian:bookworm-slim
COPY --from=builder /app/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

## Testing Multi-Platform Images

After building, verify that your images work on each target platform.

Test images built for different architectures:

```bash
# Run an ARM64 image on an x86_64 machine (uses QEMU emulation)
docker run --rm --platform linux/arm64 myregistry/myapp:latest uname -m
# Output: aarch64

# Run an x86_64 image explicitly
docker run --rm --platform linux/amd64 myregistry/myapp:latest uname -m
# Output: x86_64

# Inspect the manifest to see all platforms
docker buildx imagetools inspect myregistry/myapp:latest
```

## CI/CD Pipeline for Multi-Platform Builds

A GitHub Actions workflow that builds and pushes multi-platform images:

```yaml
# .github/workflows/docker.yml
name: Build Multi-Platform Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU for multi-platform emulation
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push multi-platform image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: myuser/myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Common Pitfalls

Several mistakes crop up frequently when building multi-platform images.

Avoid hardcoding architecture-specific paths. The path `/usr/lib/x86_64-linux-gnu/` exists on amd64 but not on arm64, where it becomes `/usr/lib/aarch64-linux-gnu/`. Use package managers and `pkg-config` to find library paths dynamically.

Watch out for Node.js native modules. Packages like `sharp`, `bcrypt`, and `sqlite3` compile native code during `npm install`. If you build on x86 and try to run on ARM, these modules will crash. Always install dependencies on the target platform or use `--platform` appropriately in your build stages.

Do not assume QEMU will always be available. While Docker Desktop includes QEMU, CI environments may need explicit setup. Always include the QEMU setup step in your CI pipeline.

## Summary

Write your Dockerfile normally, use `TARGETARCH` for architecture-specific downloads, run builds with `docker buildx build --platform linux/amd64,linux/arm64`, and push to a registry. For compiled languages like Go and Rust, use `FROM --platform=$BUILDPLATFORM` in the build stage to avoid slow emulation. Test your images on both architectures, and automate multi-platform builds in CI.

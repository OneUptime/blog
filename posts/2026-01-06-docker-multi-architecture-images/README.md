# How to Build Multi-Architecture Docker Images (ARM64 + AMD64)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, CI/CD, ARM64, BuildKit

Description: Master docker buildx, QEMU emulation, manifest lists, and CI integration to build images that run on both Intel and Apple Silicon machines.

Apple Silicon Macs, AWS Graviton instances, and Raspberry Pis all use ARM64 processors. If you're only building AMD64 images, you're forcing these machines to run emulation (slow) or excluding them entirely. Multi-architecture images solve this by packaging multiple platform variants in a single tag.

---

## Understanding Multi-Arch Images

A multi-arch image is actually a **manifest list** - a pointer to platform-specific images:

```
myapp:latest
├── linux/amd64  → sha256:abc123...
├── linux/arm64  → sha256:def456...
└── linux/arm/v7 → sha256:ghi789...
```

When you `docker pull myapp:latest`, Docker automatically selects the right variant for your platform.

---

## Setting Up Buildx

Docker Buildx extends the `docker build` command with multi-platform support.

### Check Buildx Installation

```bash
# Buildx comes with Docker Desktop and recent Docker Engine
docker buildx version
# docker buildx version v0.12.0

# List available builders
docker buildx ls
```

### Create a Multi-Platform Builder

```bash
# Create builder with multi-platform support
docker buildx create --name multiarch --driver docker-container --bootstrap

# Use the new builder
docker buildx use multiarch

# Verify platforms
docker buildx inspect multiarch
```

Output shows supported platforms:
```
Platforms: linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/arm64, linux/arm/v7, linux/arm/v6
```

---

## Building Multi-Arch Images

### Basic Multi-Platform Build

```bash
# Build for AMD64 and ARM64, push to registry
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry/myapp:latest \
  --push \
  .
```

**Note:** Multi-platform builds must be pushed to a registry. You can't load multi-platform images into local Docker directly.

### Build and Load Locally (Single Platform)

For local testing, build just your native platform:

```bash
# Build for current platform and load into Docker
docker buildx build --load -t myapp:latest .

# Or explicitly specify platform
docker buildx build --platform linux/arm64 --load -t myapp:latest .
```

### Build with Multiple Tags

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry/myapp:latest \
  --tag myregistry/myapp:1.0.0 \
  --tag myregistry/myapp:1.0 \
  --push \
  .
```

---

## Writing Multi-Arch Dockerfiles

Most Dockerfiles work across architectures without changes. Issues arise with:

1. Architecture-specific base images
2. Architecture-specific binaries
3. Platform-specific build steps

### Handling Architecture-Specific Dependencies

```dockerfile
FROM node:22-alpine

# These ARGs are automatically set by buildx
ARG TARGETPLATFORM
ARG TARGETARCH
ARG TARGETVARIANT

WORKDIR /app

# Download architecture-specific binary
RUN case "${TARGETARCH}" in \
    "amd64") ARCH="x64" ;; \
    "arm64") ARCH="arm64" ;; \
    *) echo "Unsupported arch: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    curl -fsSL "https://example.com/binary-${ARCH}.tar.gz" | tar -xz

COPY . .
RUN npm install
CMD ["node", "index.js"]
```

### Cross-Compilation for Go

Go makes cross-compilation easy:

```dockerfile
FROM golang:1.22 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY . .

# Go cross-compiles automatically with these env vars
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -o /app/server .

FROM alpine:3.19
COPY --from=builder /app/server /server
CMD ["/server"]
```

### Rust Cross-Compilation

```dockerfile
FROM rust:1.75 AS builder

ARG TARGETPLATFORM

# Install target toolchain
RUN case "${TARGETPLATFORM}" in \
    "linux/amd64") TARGET="x86_64-unknown-linux-musl" ;; \
    "linux/arm64") TARGET="aarch64-unknown-linux-musl" ;; \
    esac && \
    rustup target add ${TARGET}

WORKDIR /app
COPY . .

RUN case "${TARGETPLATFORM}" in \
    "linux/amd64") TARGET="x86_64-unknown-linux-musl" ;; \
    "linux/arm64") TARGET="aarch64-unknown-linux-musl" ;; \
    esac && \
    cargo build --release --target ${TARGET} && \
    cp target/${TARGET}/release/myapp /myapp

FROM alpine:3.19
COPY --from=builder /myapp /myapp
CMD ["/myapp"]
```

---

## QEMU Emulation

Buildx uses QEMU to emulate foreign architectures. This is automatic on Docker Desktop.

### Install QEMU on Linux

```bash
# Install QEMU static binaries
docker run --privileged --rm tonistiigi/binfmt --install all

# Verify installation
docker run --rm --platform linux/arm64 alpine uname -m
# Should output: aarch64
```

### Emulation Performance

QEMU emulation is slow (5-20x). Strategies to minimize it:

1. **Use multi-stage builds** - Build on native, copy to target
2. **Cache dependencies** - Don't rebuild libraries on every change
3. **Use native builders** - Cross-compile when possible

```dockerfile
# Good: Compile natively, final image is multi-arch
FROM --platform=$BUILDPLATFORM golang:1.22 AS builder
ARG TARGETOS TARGETARCH
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o /app .

FROM alpine:3.19
COPY --from=builder /app /app
```

The `--platform=$BUILDPLATFORM` ensures the builder runs natively, then Go cross-compiles.

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build Multi-Arch Image

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            myregistry/myapp:latest
            myregistry/myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### GitLab CI

```yaml
# .gitlab-ci.yml
build:
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker run --privileged --rm tonistiigi/binfmt --install all
    - docker buildx create --use
  script:
    - docker buildx build
      --platform linux/amd64,linux/arm64
      --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
      --tag $CI_REGISTRY_IMAGE:latest
      --push .
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    machine:
      image: ubuntu-2204:current
    steps:
      - checkout
      - run:
          name: Setup QEMU
          command: docker run --privileged --rm tonistiigi/binfmt --install all
      - run:
          name: Setup Buildx
          command: |
            docker buildx create --name multiarch --use
            docker buildx inspect --bootstrap
      - run:
          name: Build and Push
          command: |
            echo $DOCKER_PASSWORD | docker login -u $DOCKER_USER --password-stdin
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              --tag myregistry/myapp:$CIRCLE_SHA1 \
              --push .
```

---

## Inspecting Multi-Arch Images

### View Manifest List

```bash
# Inspect the manifest list
docker buildx imagetools inspect myregistry/myapp:latest
```

Output:
```
Name:      myregistry/myapp:latest
MediaType: application/vnd.oci.image.index.v1+json
Digest:    sha256:abc123...

Manifests:
  Name:        myregistry/myapp:latest@sha256:def456...
  MediaType:   application/vnd.oci.image.manifest.v1+json
  Platform:    linux/amd64

  Name:        myregistry/myapp:latest@sha256:ghi789...
  MediaType:   application/vnd.oci.image.manifest.v1+json
  Platform:    linux/arm64
```

### Pull Specific Architecture

```bash
# Pull specific platform variant
docker pull --platform linux/arm64 myregistry/myapp:latest

# Run with explicit platform
docker run --platform linux/arm64 myregistry/myapp:latest
```

---

## Common Patterns

### Pattern: Separate Build Jobs Per Architecture

For complex builds, run architecture-specific jobs in parallel:

```yaml
# GitHub Actions
jobs:
  build-amd64:
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64
          tags: myregistry/myapp:${{ github.sha }}-amd64
          push: true

  build-arm64:
    runs-on: ubuntu-latest  # or self-hosted ARM runner
    steps:
      - uses: docker/build-push-action@v5
        with:
          platforms: linux/arm64
          tags: myregistry/myapp:${{ github.sha }}-arm64
          push: true

  create-manifest:
    needs: [build-amd64, build-arm64]
    runs-on: ubuntu-latest
    steps:
      - name: Create manifest
        run: |
          docker buildx imagetools create \
            --tag myregistry/myapp:latest \
            myregistry/myapp:${{ github.sha }}-amd64 \
            myregistry/myapp:${{ github.sha }}-arm64
```

### Pattern: Native ARM Builds on Graviton

Use AWS CodeBuild with ARM instances:

```yaml
# buildspec.yml
version: 0.2
phases:
  build:
    commands:
      - docker build -t myregistry/myapp:arm64 .
      - docker push myregistry/myapp:arm64
```

---

## Troubleshooting

### Build Fails on ARM64

```bash
# Check if QEMU is installed
docker run --rm --platform linux/arm64 alpine uname -m

# If it fails, reinstall QEMU
docker run --privileged --rm tonistiigi/binfmt --install all
```

### Slow Builds

```bash
# Use build cache
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from type=registry,ref=myregistry/myapp:cache \
  --cache-to type=registry,ref=myregistry/myapp:cache,mode=max \
  --push \
  -t myregistry/myapp:latest .
```

### Wrong Architecture Selected

```bash
# Force specific platform
docker run --platform linux/amd64 myregistry/myapp:latest

# Check image architecture
docker inspect myregistry/myapp:latest | jq '.[0].Architecture'
```

---

## Quick Reference

```bash
# Create multi-platform builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 --push -t myapp:latest .

# Build for current platform only (local testing)
docker buildx build --load -t myapp:latest .

# Install QEMU
docker run --privileged --rm tonistiigi/binfmt --install all

# Inspect manifest
docker buildx imagetools inspect myapp:latest

# Create manifest from existing images
docker buildx imagetools create --tag myapp:latest myapp:amd64 myapp:arm64
```

---

## Summary

- Multi-arch images bundle platform variants in a single tag
- Buildx with QEMU enables building for foreign architectures
- Use `$BUILDPLATFORM` in FROM for native compilation, then cross-compile
- Go cross-compiles easily; other languages may need more setup
- Cache builds aggressively - emulation is slow
- CI pipelines should include QEMU setup and buildx configuration
- Consider parallel native builds for complex projects

Building multi-arch images future-proofs your containers for the ARM64 future.

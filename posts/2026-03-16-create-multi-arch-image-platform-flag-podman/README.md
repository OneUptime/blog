# How to Create a Multi-Arch Image with --platform Flag in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Build

Description: Learn how to use the --platform flag in Podman to build multi-architecture container images in a single command, targeting multiple platforms simultaneously.

---

> The --platform flag with comma-separated values lets you build for multiple architectures in one command, producing a ready-to-push manifest list.

Podman's `--platform` flag accepts multiple platform targets, separated by commas. Combined with the `--manifest` flag, this creates a complete multi-architecture manifest list in a single build invocation. This is the most concise path to multi-arch images when building from a single machine. If your Containerfile uses `RUN` instructions for non-native architectures, the host also needs working emulation, such as QEMU with binfmt.

---

## Basic Multi-Platform Build

```bash
mkdir -p ~/platform-demo && cd ~/platform-demo

cat > Containerfile <<'EOF'
FROM alpine:3.23
RUN apk add --no-cache curl
CMD ["sh", "-c", "echo Running on $(uname -m)"]
EOF

# Build for AMD64 and ARM64 in one command

podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

This builds the image twice (once per platform) and groups both results into a manifest list.

## The --platform Format

The platform string uses the format `os/architecture` or `os/architecture/variant`.

```bash
# Common platform strings
--platform linux/amd64              # 64-bit x86
--platform linux/arm64              # 64-bit ARM (Apple Silicon, Graviton)
--platform linux/arm/v7             # 32-bit ARM v7
--platform linux/s390x              # IBM Z mainframe
--platform linux/ppc64le            # IBM POWER

# Multiple platforms (comma-separated, no spaces)
--platform linux/amd64,linux/arm64
--platform linux/amd64,linux/arm64,linux/arm/v7
--platform linux/amd64,linux/arm64,linux/s390x,linux/ppc64le
```

## Three-Platform Build

```bash
# Build for AMD64, ARM64, and ARMv7
podman build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --manifest myapp:v1.0 \
  .

# Verify all three platforms
podman manifest inspect myapp:v1.0 | \
  jq '.manifests[] | "\(.platform.os)/\(.platform.architecture)\(if .platform.variant then "/\(.platform.variant)" else "" end)"'
```

## Using --platform in FROM Instructions

The `--platform` flag in `FROM` instructions overrides the target platform for specific stages.

```bash
mkdir -p ~/go-platform-demo && cd ~/go-platform-demo
go mod init example.com/platform-demo
cat > main.go <<'EOF'
package main

func main() {}
EOF

cat > Containerfile <<'EOF'
# Build stage: always runs on the build host's native platform
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /src
COPY . .
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} CGO_ENABLED=0 go build -o /app

# Runtime stage: uses the target platform
FROM alpine:3.23
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build for both platforms
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Automatic Build Arguments

When you use `--platform`, Podman sets these build arguments automatically:

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.23

ARG TARGETPLATFORM    # e.g., linux/amd64
ARG TARGETOS          # e.g., linux
ARG TARGETARCH        # e.g., amd64
ARG TARGETVARIANT     # e.g., v7 (for ARM)
ARG BUILDPLATFORM     # e.g., linux/amd64 (your host)
ARG BUILDOS           # e.g., linux
ARG BUILDARCH         # e.g., amd64
ARG BUILDVARIANT      # e.g., v7 (for ARM hosts)

RUN echo "Build host: ${BUILDPLATFORM}" && \
    echo "Target: ${TARGETPLATFORM}" && \
    echo "Target arch: ${TARGETARCH}"

CMD ["sh", "-c", "echo ${TARGETPLATFORM}"]
EOF
```

## Using --platform with Conditional Logic

Handle architecture-specific steps using the automatic arguments.

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.23

ARG TARGETARCH

# Download platform-specific binary
RUN case "${TARGETARCH}" in \
      amd64) ARCH_SUFFIX="x86_64" ;; \
      arm64) ARCH_SUFFIX="aarch64" ;; \
      arm)   ARCH_SUFFIX="armv7" ;; \
      *)     echo "Unsupported: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    echo "Would download binary for ${ARCH_SUFFIX}" && \
    echo "${ARCH_SUFFIX}" > /arch.txt

CMD ["cat", "/arch.txt"]
EOF

podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Build, Tag, and Push Workflow

```bash
#!/bin/bash
# multiarch-build.sh

REGISTRY="registry.example.com"
IMAGE_NAME="myapp"
TAG="${1:-latest}"
PLATFORMS="linux/amd64,linux/arm64"

FULL_REF="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Building ${FULL_REF} for ${PLATFORMS}"

# Build multi-platform and create manifest
podman build \
  --platform "${PLATFORMS}" \
  --manifest "${FULL_REF}" \
  .

# Inspect
echo ""
echo "Manifest contents:"
podman manifest inspect "${FULL_REF}" | \
  jq '.manifests[] | {os: .platform.os, arch: .platform.architecture}'

# Push
podman manifest push --all "${FULL_REF}" "docker://${FULL_REF}"

echo ""
echo "Published: ${FULL_REF}"
```

## Combining --platform with Other Build Flags

```bash
# Multi-platform build with build arguments
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  --build-arg APP_VERSION=1.0.0 \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  .

# Multi-platform build without cache
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  --no-cache \
  .

# Multi-platform build with a specific Containerfile
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  -f Containerfile.prod \
  .
```

## Verifying Each Platform

Test each platform individually after building.

```bash
# Run the AMD64 variant
podman run --rm --platform linux/amd64 myapp:latest

# Run the ARM64 variant
podman run --rm --platform linux/arm64 myapp:latest

# Detailed inspection per platform
for ARCH in amd64 arm64; do
  echo "=== ${ARCH} ==="
  DIGEST=$(podman manifest inspect myapp:latest | \
    jq -r ".manifests[] | select(.platform.architecture == \"${ARCH}\") | .digest")
  echo "Digest: ${DIGEST}"
done
```

## Error Handling

```bash
# If one platform fails, the entire build fails
# Debug by building platforms individually
podman build --platform linux/amd64 -t myapp:amd64-test .
podman build --platform linux/arm64 -t myapp:arm64-test .

# Check which one fails, fix, then retry the multi-platform build
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Cleaning Up

```bash
# Remove the manifest
podman manifest rm myapp:latest

# Remove all related images
podman rmi $(podman images --filter "reference=myapp" -q) 2>/dev/null

# General cleanup
podman system prune -f
```

## Summary

The `--platform` flag in `podman build` is the most concise way to create multi-architecture images. Pass comma-separated platform strings to build for all targets in one command, and use `--manifest` to automatically assemble them into a manifest list. Leverage automatic build arguments like `TARGETARCH` and `BUILDPLATFORM` for architecture-specific logic and cross-compilation. After building, push with `podman manifest push --all` to make the multi-arch image available in your registry.

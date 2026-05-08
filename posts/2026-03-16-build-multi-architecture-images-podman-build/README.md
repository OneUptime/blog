# How to Build Multi-Architecture Images with podman build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Multi-Architecture

Description: Learn how to use podman build with the --platform flag to create multi-architecture container images directly, building for multiple platforms in a single command.

---

> The podman build command with --platform lets you target multiple architectures in a single build invocation, simplifying multi-arch image creation.

Podman's `build` command supports the `--platform` flag, which can accept multiple platform targets. Combined with the `--manifest` flag, you can build images for several architectures and automatically group them into a manifest list, all in one command.

---

## Single Platform Build

The simplest case targets one platform.

```bash
# Build for a specific platform

podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .
```

## Multi-Platform Build with --manifest

The `--manifest` flag creates or appends to a manifest list during the build.

```bash
mkdir -p ~/multi-build-demo && cd ~/multi-build-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
RUN apk add --no-cache curl
CMD ["sh", "-c", "echo Running on $(uname -m)"]
EOF

# Build for multiple platforms and create a manifest list
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

This single command builds for both AMD64 and ARM64 and groups the results into a manifest list called `myapp:latest`.

## Verifying the Multi-Platform Build

```bash
# Inspect the manifest list
podman manifest inspect myapp:latest

# List platforms
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os}'

# Check the image list
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"
```

## Building for Three or More Platforms

```bash
# Build for AMD64, ARM64, and ARMv7
podman build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --manifest myapp:v1.0 \
  .

# Verify all three platforms are present
podman manifest inspect myapp:v1.0 | jq '.manifests | length'
# Output: 3
```

## Using Automatic Build Arguments

Podman automatically provides target platform-related build arguments that you can use in your Containerfile.

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.19

# These target platform values are automatically set by Podman
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

RUN echo "Target: ${TARGETPLATFORM}" && \
    echo "OS: ${TARGETOS}" && \
    echo "Arch: ${TARGETARCH}" && \
    echo "Variant: ${TARGETVARIANT}"

# Download architecture-specific tools
RUN if [ "${TARGETARCH}" = "amd64" ]; then \
      echo "Downloading amd64 binary"; \
    elif [ "${TARGETARCH}" = "arm64" ]; then \
      echo "Downloading arm64 binary"; \
    fi

CMD ["sh", "-c", "echo Running on $(uname -m)"]
EOF

podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Cross-Compilation Pattern for Go

Use the build platform for compilation and the target platform for the runtime image.

```bash
cat > Containerfile <<'EOF'
# Build stage runs on the BUILD platform (native, fast)
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

ARG TARGETARCH
ARG TARGETOS

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Cross-compile for the target architecture
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} CGO_ENABLED=0 \
    go build -ldflags="-s -w" -o /app

# Runtime stage runs on the TARGET platform
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build for both platforms - Go cross-compilation is fast
BUILDPLATFORM="$(go env GOOS)/$(go env GOARCH)"

podman build \
  --build-arg BUILDPLATFORM="${BUILDPLATFORM}" \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Building with No Cache

Force a clean build for all platforms.

```bash
podman build \
  --no-cache \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Building and Pushing in One Workflow

```bash
#!/bin/bash
# build-and-push.sh

REGISTRY="registry.example.com"
IMAGE="myapp"
TAG="${1:-latest}"
PLATFORMS="linux/amd64,linux/arm64"

FULL_REF="${REGISTRY}/${IMAGE}:${TAG}"

# Build multi-platform images into a manifest
podman build \
  --platform "${PLATFORMS}" \
  --manifest "${FULL_REF}" \
  .

# Verify
echo "Manifest contents:"
podman manifest inspect "${FULL_REF}" | \
  jq '.manifests[] | {arch: .platform.architecture}'

# Push the manifest and all images
podman manifest push --all \
  "${FULL_REF}" \
  "docker://${FULL_REF}"

echo "Published: ${FULL_REF}"
```

## Handling Build Failures

When building for multiple platforms, a failure on one platform stops the entire build. Debug by building platforms individually.

```bash
# If the multi-platform build fails, build each one separately
podman build --platform linux/amd64 -t myapp:amd64-debug .
podman build --platform linux/arm64 -t myapp:arm64-debug .

# Find which platform has the issue, then fix and retry
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Appending to an Existing Manifest

Build additional platforms and add them to an existing manifest.

```bash
# Initial build for common platforms
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .

# Later, add s390x support
podman build \
  --platform linux/s390x \
  --manifest myapp:latest \
  .

# Now the manifest has three platforms
podman manifest inspect myapp:latest | jq '.manifests | length'
```

## Performance Tips

```bash
# 1. Pass BUILDPLATFORM explicitly for compilation stages (avoids emulation)
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM golang:1.22 AS builder

# 2. Minimize work done in emulated layers
# Put the heavy lifting (compiling) in the build stage
# Keep the runtime stage minimal

# 3. Allow concurrent build stages in CI
podman build --jobs=2 \
  --platform linux/amd64,linux/arm64 \
  --manifest myapp:latest \
  .
```

## Summary

The `podman build` command with `--platform` and `--manifest` flags provides the simplest path to multi-architecture images. Pass a comma-separated list of platforms to build for all of them in one invocation. Use automatic build arguments like `TARGETARCH` to handle architecture-specific logic in your Containerfile. For compiled languages, pass the build platform explicitly and use cross-compilation on the build platform to avoid the overhead of QEMU emulation.

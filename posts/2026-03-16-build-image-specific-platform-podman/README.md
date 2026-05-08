# How to Build an Image for a Specific Platform with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Platform, Cross-Platform, Multi-Architecture

Description: Learn how to build container images for specific CPU architectures and platforms with Podman, including cross-platform and multi-arch manifest builds.

---

> Building for specific platforms ensures your container images run correctly on ARM servers, cloud instances, and mixed-architecture clusters.

Modern infrastructure runs on multiple CPU architectures. Cloud providers offer ARM instances for cost savings, Kubernetes clusters mix architectures, and development machines may differ from production servers. Podman supports building images for specific platforms using the `--platform` flag. This guide covers single-platform builds, cross-compilation, and multi-architecture manifests.

---

## Understanding Platforms

A platform is defined by the operating system and CPU architecture, formatted as `os/arch[/variant]`.

```bash
# Common platforms

# linux/amd64    - Standard x86_64 servers and desktops
# linux/arm64    - ARM 64-bit (AWS Graviton, Apple Silicon in Linux VMs)
# linux/arm/v7   - ARM 32-bit (Raspberry Pi)
# linux/s390x    - IBM Z mainframes
# linux/ppc64le  - IBM Power systems

# Check your current platform
podman info --format '{{.Host.Arch}}'
uname -m
```

## Building for a Specific Platform

Use the `--platform` flag to target a specific architecture.

```bash
# Build for ARM64
podman build --platform linux/arm64 -t myapp:arm64 .

# Build for AMD64
podman build --platform linux/amd64 -t myapp:amd64 .

# Build for ARM v7 (32-bit)
podman build --platform linux/arm/v7 -t myapp:armv7 .
```

## Setting Up Cross-Platform Builds

To build for a different architecture than your host, you need QEMU user-space emulation.

```bash
# Install QEMU static binaries (on Fedora/RHEL)
sudo dnf install qemu-user-static

# Install on Ubuntu/Debian
sudo apt-get install qemu-user-static binfmt-support

# Verify QEMU is registered
ls /proc/sys/fs/binfmt_misc/qemu-*

# Test cross-platform execution
podman run --rm --platform linux/arm64 docker.io/library/alpine:latest uname -m
# Expected output: aarch64
```

## Building Multi-Architecture Images

Create a manifest list that includes images for multiple platforms.

```bash
# Build for each platform
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Create a manifest list
podman manifest create myapp:latest

# Add each platform image to the manifest
podman manifest add myapp:latest containers-storage:localhost/myapp:amd64
podman manifest add myapp:latest containers-storage:localhost/myapp:arm64

# Inspect the manifest
podman manifest inspect myapp:latest

# Push the manifest to a registry
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest
```

## Using --platform with podman build --manifest

Podman can build directly into a manifest.

```bash
# Build for multiple platforms directly into a manifest
podman build --platform linux/amd64,linux/arm64 \
  --manifest myapp:multi \
  .

# Inspect the result
podman manifest inspect myapp:multi

# Push the multi-arch manifest
podman manifest push --all myapp:multi docker://registry.example.com/myapp:latest
```

## Platform-Aware Containerfiles

Write Containerfiles that work across platforms using build arguments.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.22 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /src
COPY . .

# Go supports cross-compilation natively
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -o /app .

FROM docker.io/library/alpine:latest
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# TARGETOS and TARGETARCH are automatically set by --platform
podman build --platform linux/arm64 -t myapp:arm64 .
```

## Automatic Target Platform Variables

Podman sets these target ARG variables automatically when `--platform` is used.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

RUN echo "Target: ${TARGETPLATFORM}" && \
    echo "Target OS: ${TARGETOS}" && \
    echo "Target Arch: ${TARGETARCH}" && \
    echo "Target Variant: ${TARGETVARIANT}"

CMD ["sh"]
EOF

podman build --platform linux/arm64 -t platform-test:latest .
```

## Verifying Platform of Built Images

Confirm that your image targets the correct platform.

```bash
# Check the architecture of a built image
podman inspect myapp:arm64 --format '{{.Architecture}}'
# Output: arm64

podman inspect myapp:amd64 --format '{{.Architecture}}'
# Output: amd64

# Check full platform information
podman inspect myapp:arm64 --format '{{.Os}}/{{.Architecture}}'
# Output: linux/arm64
```

## CI/CD Multi-Arch Build Pipeline

Automate multi-architecture builds in CI/CD.

```bash
#!/bin/bash
# multi-arch-build.sh

set -e

IMAGE="registry.example.com/myapp"
TAG="${1:-latest}"
PLATFORMS="linux/amd64,linux/arm64"

echo "Building multi-arch image for: ${PLATFORMS}"

# Build for all platforms into a manifest
podman build \
  --platform "${PLATFORMS}" \
  --manifest "${IMAGE}:${TAG}" \
  .

# Push the manifest list
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

echo "Pushed multi-arch manifest: ${IMAGE}:${TAG}"
```

## Platform-Specific Base Images

Some base images are only available for certain platforms. Handle this in your Containerfile.

```bash
cat > Containerfile << 'EOF'
ARG TARGETARCH=amd64

# Use platform-specific base if needed
FROM docker.io/library/python:3.12-slim

ARG TARGETARCH
RUN echo "Running on ${TARGETARCH}" && \
    if [ "${TARGETARCH}" = "arm64" ]; then \
      echo "Installing ARM-specific packages"; \
    fi

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
EOF
```

## Summary

Building for specific platforms with Podman is straightforward using the `--platform` flag. Install QEMU for cross-architecture builds, use automatic platform variables in your Containerfiles, and create manifest lists to distribute multi-architecture images. This ensures your container images work correctly across diverse infrastructure, from ARM-based cloud instances to traditional AMD64 servers.

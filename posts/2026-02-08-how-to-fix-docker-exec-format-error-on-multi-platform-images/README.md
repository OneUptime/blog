# How to Fix Docker "Exec Format Error" on Multi-Platform Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Multi-Platform, Exec Format Error, ARM, AMD64, Buildx, Troubleshooting

Description: Diagnose and resolve Docker exec format errors caused by architecture mismatches between images and host platforms.

---

The "exec format error" is one of Docker's most confusing errors. Your image builds successfully, the container starts, and then immediately crashes with a cryptic message about execution format. The cause is almost always an architecture mismatch: you are trying to run an image built for one CPU architecture on a machine with a different architecture. Running an ARM image on an x86 machine, or vice versa, triggers this error.

This problem has become increasingly common as ARM-based machines (Apple Silicon Macs, AWS Graviton, Raspberry Pi) join the development and production landscape. This guide explains why the error happens and how to fix it permanently.

## What the Error Looks Like

The error appears in different forms depending on how you run the container:

```bash
docker run myapp:latest
# exec /app/server: exec format error

docker run myapp:latest
# standard_init_linux.go:228: exec user process caused: exec format error

docker logs myapp
# exec /usr/local/bin/docker-entrypoint.sh: exec format error
```

The container starts but the process inside cannot execute because the binary was compiled for a different CPU architecture.

## Diagnosing the Mismatch

First, check your host architecture:

```bash
# Check the host machine's architecture
uname -m
# x86_64 = AMD64/Intel
# aarch64 or arm64 = ARM (Apple Silicon, Graviton, etc.)

# Check Docker's platform info
docker info --format '{{.Architecture}}'
```

Then check the image's architecture:

```bash
# Inspect the image to see what platform it was built for
docker inspect myapp:latest --format '{{.Architecture}}'

# For more detail, check the image manifest
docker manifest inspect myapp:latest
```

If your host is `aarch64` but the image was built for `amd64` (or the other way around), you have found the problem.

## Fix 1: Pull the Correct Platform

Many popular images on Docker Hub are multi-platform, meaning they have variants for different architectures. Docker usually pulls the right one automatically, but sometimes it gets it wrong, especially when using tags from third-party registries.

Force Docker to pull the correct platform:

```bash
# Pull the AMD64 variant explicitly
docker pull --platform linux/amd64 myapp:latest

# Pull the ARM64 variant explicitly
docker pull --platform linux/arm64 myapp:latest
```

Check which platforms an image supports:

```bash
# List all available platforms for an image
docker manifest inspect nginx:alpine | jq '.manifests[] | {platform: .platform, digest: .digest}'
```

Output shows something like:

```json
{
  "platform": { "architecture": "amd64", "os": "linux" },
  "digest": "sha256:abc123..."
}
{
  "platform": { "architecture": "arm64", "os": "linux" },
  "digest": "sha256:def456..."
}
```

## Fix 2: Build Multi-Platform Images with Buildx

The best long-term solution is to build your images for multiple architectures. Docker Buildx makes this straightforward.

Set up a buildx builder that supports multi-platform builds:

```bash
# Create a new builder instance with multi-platform support
docker buildx create --name multiplatform --driver docker-container --use

# Bootstrap the builder (downloads QEMU emulators)
docker buildx inspect --bootstrap
```

Build for multiple platforms and push to a registry:

```bash
# Build for both AMD64 and ARM64 and push directly
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myuser/myapp:v1.0 \
  --push \
  .
```

The `--push` flag is required for multi-platform builds because the resulting image is a manifest list (index) that references platform-specific images. Docker cannot store multi-platform images in the local daemon.

To load a single-platform image locally (for testing):

```bash
# Build for the current platform and load into the local daemon
docker buildx build \
  --platform linux/arm64 \
  --tag myapp:v1.0 \
  --load \
  .
```

## Fix 3: Use QEMU Emulation

When you absolutely need to run an image built for a different architecture, QEMU user-space emulation lets you do it. Performance takes a hit (roughly 5-10x slower), but it works.

Install QEMU support:

```bash
# Register QEMU binary handlers with the kernel (Linux)
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# On Docker Desktop (macOS/Windows), QEMU is already included
```

Now run images from any architecture:

```bash
# Run an ARM image on an AMD64 host
docker run --platform linux/arm64 arm64v8/alpine uname -m
# Output: aarch64

# Run an AMD64 image on an ARM host
docker run --platform linux/amd64 amd64/alpine uname -m
# Output: x86_64
```

## Fix 4: Adjust Your Dockerfile for Multi-Platform

Some Dockerfiles have architecture-specific steps, like downloading a binary for a specific platform. Use build arguments to handle this:

```dockerfile
# Dockerfile that works on both AMD64 and ARM64
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

# TARGETPLATFORM and TARGETOS/TARGETARCH are set automatically by buildx
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY . .

# Cross-compile for the target platform
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -o /app/server ./cmd/server

# Final stage uses the target platform
FROM alpine:3.19
COPY --from=builder /app/server /usr/local/bin/server
CMD ["server"]
```

For downloading pre-built binaries, handle the architecture switch:

```dockerfile
# Download architecture-specific binaries
FROM alpine:3.19

ARG TARGETARCH

# Download the correct binary based on target architecture
RUN case ${TARGETARCH} in \
      amd64) ARCH="x86_64" ;; \
      arm64) ARCH="aarch64" ;; \
      *) echo "Unsupported arch: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    wget -O /usr/local/bin/tool "https://releases.example.com/tool-${ARCH}" && \
    chmod +x /usr/local/bin/tool
```

## Fix 5: Base Image Selection

Some base images only support one architecture. Switching to a multi-platform base image fixes the problem at its root.

Images that support multiple platforms:
- `alpine` (amd64, arm64, arm/v7, arm/v6, and more)
- `ubuntu` (amd64, arm64)
- `debian` (amd64, arm64, arm/v7)
- `node` (amd64, arm64)
- `python` (amd64, arm64)
- `golang` (amd64, arm64)

Images that may be single-platform:
- Community images without official support
- Images from corporate registries built in CI pipelines targeting only one arch
- Older images that predate ARM adoption

Check before you pull:

```bash
# Quick check of available platforms
docker buildx imagetools inspect python:3.12-alpine
```

## CI/CD Multi-Platform Builds

Set up your CI pipeline to produce multi-platform images automatically.

GitHub Actions example:

```yaml
# .github/workflows/build.yml - Multi-platform build
name: Build Multi-Platform
on:
  push:
    branches: [main]

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
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

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

## Debugging Tips

When you are not sure what architecture an image contains:

```bash
# Check the architecture of an image in detail
docker inspect myapp:latest | jq '.[0] | {Architecture, Os, Variant}'

# Check a running container's architecture
docker exec mycontainer uname -m

# List all platforms supported by a remote image
docker buildx imagetools inspect myuser/myapp:latest

# Check if QEMU is registered for emulation
ls /proc/sys/fs/binfmt_misc/
```

## Conclusion

The exec format error comes down to one thing: architecture mismatch. The fix depends on your situation. If you just need to pull the right variant, use `--platform`. If you are building images, set up buildx with multi-platform support and build for both amd64 and arm64. If you need a quick workaround, QEMU emulation bridges the gap at the cost of performance. With ARM adoption accelerating across cloud providers and developer machines, building multi-platform images should be the default for every project.

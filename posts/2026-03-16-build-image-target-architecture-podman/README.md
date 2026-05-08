# How to Build an Image with Target Architecture with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Multi-Architecture

Description: Learn how to specify a target architecture when building container images with Podman using the --platform flag to produce images for different CPU architectures.

---

> Building for a specific architecture ensures your container image runs correctly on the target hardware, whether it is ARM64, AMD64, or another platform.

When you build a container image with Podman, it defaults to your host machine's architecture. However, you may need to produce images for a different platform, such as building an ARM64 image on an AMD64 machine. Podman's `--platform` flag makes this straightforward.

---

## Prerequisites

Before building for a non-native architecture, you need QEMU user-static binaries installed for cross-platform emulation.

```bash
# On Fedora/RHEL/CentOS

sudo dnf install qemu-user-static

# On Ubuntu/Debian
sudo apt-get install qemu-user-static

# Verify QEMU is registered with binfmt_misc
ls /proc/sys/fs/binfmt_misc/
```

You should see entries like `qemu-aarch64`, `qemu-arm`, `qemu-s390x`, and others.

## Building for a Specific Architecture

Use the `--platform` flag to target a specific OS and architecture combination.

```bash
# Build an ARM64 image on an AMD64 host
podman build --platform linux/arm64 -t myapp:arm64 .

# Build an AMD64 image on an ARM64 host
podman build --platform linux/amd64 -t myapp:amd64 .
```

The platform string follows the format `os/architecture` or `os/architecture/variant`.

## Common Platform Strings

Here are frequently used platform values:

```bash
# 64-bit x86 (most common for servers and desktops)
--platform linux/amd64

# 64-bit ARM (Apple Silicon, AWS Graviton, Raspberry Pi 4)
--platform linux/arm64

# 32-bit ARM v7 (older Raspberry Pi, embedded devices)
--platform linux/arm/v7

# IBM Z mainframes
--platform linux/s390x

# IBM POWER
--platform linux/ppc64le
```

## A Complete Example

Create a simple application and build it for a target architecture.

```bash
# Create a project directory
mkdir -p ~/arch-demo && cd ~/arch-demo

# Create a simple Containerfile
cat > Containerfile <<'EOF'
FROM alpine:3.19

# Install a package to verify the architecture works
RUN apk add --no-cache curl

# Print architecture info at runtime
CMD ["sh", "-c", "echo Architecture: $(uname -m) && echo OS: $(uname -s)"]
EOF

# Build for ARM64
podman build --platform linux/arm64 -t arch-demo:arm64 .
```

## Verifying the Image Architecture

After building, confirm the image was built for the correct architecture.

```bash
# Inspect the image to see its architecture
podman inspect arch-demo:arm64 | grep -i architecture
# Output: "Architecture": "arm64"

# Run the image to verify
podman run --rm arch-demo:arm64
# Output: Architecture: aarch64
#         OS: Linux

# Alternative: use podman image inspect with format
podman image inspect --format '{{.Architecture}}' arch-demo:arm64
# Output: arm64
```

## Building with Architecture-Specific Base Images

Some base images are multi-arch and Podman will automatically pull the correct variant. Others may require you to specify an architecture-specific tag.

```bash
# Multi-arch base image (Podman pulls the right variant automatically)
podman build --platform linux/arm64 -t myapp:arm64 .

# If you need to pin the base image platform in the Containerfile
cat > Containerfile <<'EOF'
FROM --platform=linux/arm64 ubuntu:22.04
RUN apt-get update && apt-get install -y curl
CMD ["curl", "--version"]
EOF

podman build -t myapp:arm64 .
```

## Handling Architecture-Specific Build Logic

Sometimes your build steps differ based on architecture. Use build arguments to handle this.

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.19

ARG TARGETARCH
ARG TARGETOS

# Download architecture-specific binary
RUN echo "Building for ${TARGETOS}/${TARGETARCH}" && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        wget -O /usr/local/bin/mytool https://example.com/mytool-linux-amd64; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        wget -O /usr/local/bin/mytool https://example.com/mytool-linux-arm64; \
    fi && \
    chmod +x /usr/local/bin/mytool

CMD ["/usr/local/bin/mytool"]
EOF

# Podman sets TARGETARCH and TARGETOS when you declare them in the Containerfile
podman build --platform linux/arm64 -t myapp:arm64 .
```

The platform build arguments provided by Podman include:
- `TARGETPLATFORM` - full platform string (e.g., `linux/arm64`)
- `TARGETOS` - operating system (e.g., `linux`)
- `TARGETARCH` - architecture (e.g., `arm64`)
- `TARGETVARIANT` - variant if applicable (e.g., `v7`)
- `BUILDPLATFORM` - full platform string for the host performing the build (e.g., `linux/amd64`)
- `BUILDOS` - operating system for the host performing the build (e.g., `linux`)
- `BUILDARCH` - architecture for the host performing the build (e.g., `amd64`)
- `BUILDVARIANT` - variant for the host performing the build, if applicable

Declare the `ARG` values you need within each `FROM` section where you use them.

## Performance Considerations

Cross-architecture builds using QEMU emulation are slower than native builds. Here are some tips to speed things up:

```bash
# Use multi-stage builds to minimize emulated work
cat > Containerfile <<'EOF'
# Stage 1: Build natively (or with emulation)
FROM --platform=$BUILDPLATFORM golang:1.22 AS builder
ARG TARGETARCH
WORKDIR /src
COPY . .
# Cross-compile with Go (much faster than emulated builds)
RUN GOARCH=$TARGETARCH CGO_ENABLED=0 go build -o /app

# Stage 2: Final image for target platform
FROM --platform=$TARGETPLATFORM alpine:3.19
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

Using `$BUILDPLATFORM` for compilation stages lets you run the compiler natively while only emulating the final stage.

## Summary

Podman's `--platform` flag makes it simple to target a specific architecture during image builds. Combined with QEMU emulation and automatic build arguments like `TARGETARCH`, you can produce images for ARM64, AMD64, s390x, and other platforms from any host machine. For best performance, use cross-compilation in multi-stage builds to minimize the work done under emulation.

# How to Build ARM64 Images on AMD64 with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, ARM64, Cross-Platform

Description: Learn how to build ARM64 container images on AMD64 machines using Podman with QEMU emulation, including setup, optimization, and troubleshooting.

---

> Building ARM64 images on AMD64 hardware lets you support Apple Silicon, AWS Graviton, and other ARM platforms without needing dedicated ARM build machines.

ARM64 (AArch64) is increasingly common with Apple Silicon Macs, AWS Graviton instances, and Raspberry Pi devices. If your build infrastructure runs on AMD64, you can still produce ARM64 images using Podman with QEMU user-space emulation.

---

## Setting Up QEMU Emulation

QEMU translates ARM64 instructions to AMD64 at runtime. Install the required packages for your distribution.

```bash
# Fedora/RHEL/CentOS

sudo dnf install qemu-user-static

# Ubuntu/Debian
sudo apt-get install qemu-user-static binfmt-support

# Arch Linux
sudo pacman -S qemu-user-static qemu-user-static-binfmt
```

Verify QEMU is registered:

```bash
# Check binfmt_misc registrations
ls /proc/sys/fs/binfmt_misc/qemu-*

# Specifically check for ARM64 support
cat /proc/sys/fs/binfmt_misc/qemu-aarch64

# Test that QEMU works
podman run --rm --platform linux/arm64 alpine:3.23 uname -m
# Expected output: aarch64
```

## Basic ARM64 Build

```bash
mkdir -p ~/arm64-demo && cd ~/arm64-demo

cat > Containerfile <<'EOF'
FROM alpine:3.23
RUN apk add --no-cache curl
RUN echo "Architecture: $(uname -m)" > /arch-info.txt
CMD ["cat", "/arch-info.txt"]
EOF

# Build for ARM64 on your AMD64 machine
podman build --platform linux/arm64 -t myapp:arm64 .

# Verify the architecture
podman inspect myapp:arm64 --format '{{.Architecture}}'
# Output: arm64

# Run it (uses QEMU emulation)
podman run --rm myapp:arm64
# Output: Architecture: aarch64
```

## Optimizing Build Speed

QEMU emulation is slower than native builds. Use cross-compilation to minimize emulated work.

### Go Applications

```bash
cat > Containerfile <<'EOF'
# Build stage: runs NATIVELY on AMD64 (fast)
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

ARG TARGETARCH

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Cross-compile for ARM64 (no emulation needed)
RUN GOOS=linux GOARCH=${TARGETARCH} CGO_ENABLED=0 \
    go build -ldflags="-s -w" -o /app

# Runtime stage: ARM64 image (minimal emulation)
FROM --platform=linux/arm64 alpine:3.23
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

### Rust Applications

```bash
cat > Containerfile <<'EOF'
FROM --platform=$BUILDPLATFORM rust:1.95-alpine AS builder

RUN apk add --no-cache musl-dev
RUN rustup target add aarch64-unknown-linux-musl

WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Cross-compile for ARM64
RUN cargo build --release --target aarch64-unknown-linux-musl

FROM --platform=linux/arm64 alpine:3.23
COPY --from=builder /src/target/aarch64-unknown-linux-musl/release/myapp /usr/local/bin/
CMD ["myapp"]
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

### Node.js Applications

Node.js applications with native dependencies usually need target-platform dependency installs, so `npm ci` runs under emulation in this pattern. Minimize the emulated work.

```bash
cat > Containerfile <<'EOF'
FROM --platform=linux/arm64 node:24-alpine

WORKDIR /app

# Dependencies first (cached)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Source code
COPY . .

CMD ["node", "index.js"]
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

## Building with a Multi-Stage Approach

Separate native and emulated work for maximum speed.

```bash
cat > Containerfile <<'EOF'
# Stage 1: Native AMD64 work (fast)
FROM --platform=$BUILDPLATFORM alpine:3.23 AS fetcher
RUN apk add --no-cache curl
# Download ARM64 binaries on AMD64 (just downloading, no emulation needed)
RUN curl -Lo /tmp/mytool https://example.com/mytool-linux-arm64 && \
    chmod +x /tmp/mytool

# Stage 2: ARM64 runtime (emulated, but minimal work)
FROM --platform=linux/arm64 alpine:3.23
COPY --from=fetcher /tmp/mytool /usr/local/bin/mytool
CMD ["mytool"]
EOF

podman build --platform linux/arm64 -t myapp:arm64 .
```

## Testing the ARM64 Image

```bash
# Run the image (QEMU handles emulation transparently)
podman run --rm myapp:arm64

# Interactive shell in the ARM64 image
podman run --rm -it myapp:arm64 /bin/sh

# Verify the architecture inside the container
podman run --rm myapp:arm64 uname -m
# Output: aarch64

# Check that binaries are ARM64
podman run --rm --entrypoint /bin/sh myapp:arm64 -c \
  'apk add --no-cache file >/dev/null && file /usr/local/bin/app'
# Output: ELF 64-bit LSB executable, ARM aarch64
```

## Building Both AMD64 and ARM64

Produce images for both architectures and create a manifest list.

```bash
# Build both
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Create manifest list
podman manifest create myapp:latest
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64

# Verify
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture}'

# Push to registry
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest
```

## Troubleshooting

### QEMU Not Working

```bash
# Check if binfmt_misc is mounted
mount | grep binfmt_misc

# Re-register QEMU handlers
sudo systemctl restart systemd-binfmt

# Verify ARM64 handler
cat /proc/sys/fs/binfmt_misc/qemu-aarch64
```

### Build Hangs or Crashes

```bash
# QEMU can crash with insufficient resources. Increase limits.
# Check system memory
free -h

# Run with more memory for the build
podman build --platform linux/arm64 --memory 4g -t myapp:arm64 .

# If QEMU segfaults, update to the latest version
sudo dnf update qemu-user-static  # or apt-get
```

### Package Installation Fails Under Emulation

```bash
# Some packages have issues under QEMU emulation
# Workaround: Install from pre-built binaries instead of compiling
# Or use multi-stage build with native compilation stage
```

## Summary

Building ARM64 images on AMD64 with Podman requires QEMU user-static for emulation. Install it, verify with a quick test run, then use `--platform linux/arm64` on your build command. For best performance, use cross-compilation in languages that support it (Go, Rust) and minimize the work done in emulated layers. Always verify the resulting image architecture with `podman inspect` before deploying to ARM64 targets.

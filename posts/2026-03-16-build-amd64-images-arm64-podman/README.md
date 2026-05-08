# How to Build AMD64 Images on ARM64 with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, AMD64, Cross-Platform

Description: Learn how to build AMD64 container images on ARM64 machines like Apple Silicon Macs and AWS Graviton instances using Podman with QEMU emulation.

---

> Building AMD64 images on ARM64 hardware lets you maintain backward compatibility with x86-64 infrastructure while developing on Apple Silicon or ARM-based cloud instances.

With the rise of ARM64 machines, especially Apple Silicon Macs (M1/M2/M3) and AWS Graviton instances, developers often need to produce AMD64 (x86-64) images for deployment to traditional server infrastructure. Podman with QEMU emulation makes this straightforward.

---

## Setting Up QEMU on ARM64

Install QEMU user-mode emulation and binfmt registration to enable AMD64 binary emulation on your ARM64 host.

```bash
# On Fedora/RHEL (ARM64)
sudo dnf install qemu-user-static qemu-user-binfmt

# On Ubuntu/Debian (ARM64)
sudo apt-get install qemu-user-static binfmt-support

# On macOS with Podman Machine
# x86_64 translation is handled inside the Podman machine VM
podman machine init
podman machine start
```

Verify the setup:

```bash
# Check that x86_64 emulation is available
ls /proc/sys/fs/binfmt_misc/qemu-x86_64 2>/dev/null || \
  echo "Running in Podman machine or binfmt entry not registered"

# Test AMD64 emulation
podman run --rm --platform linux/amd64 alpine:3.19 uname -m
# Expected output: x86_64
```

## Building an AMD64 Image

```bash
mkdir -p ~/amd64-on-arm && cd ~/amd64-on-arm

cat > Containerfile <<'EOF'
FROM alpine:3.19
RUN apk add --no-cache curl jq
RUN echo "Built for $(uname -m)" > /build-info.txt
CMD ["cat", "/build-info.txt"]
EOF

# Build for AMD64 on your ARM64 machine
podman build --platform linux/amd64 -t myapp:amd64 .

# Verify the architecture
podman inspect myapp:amd64 --format '{{.Architecture}}'
# Output: amd64

# Run it (uses QEMU emulation)
podman run --rm myapp:amd64
# Output: Built for x86_64
```

## Apple Silicon (macOS) Specifics

On Apple Silicon with Podman Machine, x86_64 translation is handled inside the Linux VM. Current Podman Desktop setups enable Rosetta by default; if Rosetta is disabled, QEMU is used instead.

```bash
# Initialize Podman machine if not done
podman machine init --cpus 4 --memory 4096

# Start the machine
podman machine start

# Build AMD64 images directly
podman build --platform linux/amd64 -t myapp:amd64 .

# The Podman machine handles x86_64 translation automatically
```

## Cross-Compilation for Speed

QEMU emulation is slow. Cross-compilation avoids it.

### Go Applications

```bash
cat > Containerfile <<'EOF'
# Build stage runs natively on ARM64
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

ARG TARGETARCH

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Cross-compile for AMD64 (no emulation)
RUN GOOS=linux GOARCH=${TARGETARCH} CGO_ENABLED=0 \
    go build -ldflags="-s -w" -o /app

# Runtime stage is AMD64
FROM --platform=linux/amd64 alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

podman build --platform linux/amd64 -t myapp:amd64 .
```

### Rust Applications

```bash
cat > Containerfile <<'EOF'
FROM --platform=$BUILDPLATFORM rust:1.77-alpine AS builder

RUN apk add --no-cache musl-dev
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release --target x86_64-unknown-linux-musl

FROM --platform=linux/amd64 alpine:3.19
COPY --from=builder /src/target/x86_64-unknown-linux-musl/release/myapp /usr/local/bin/
CMD ["myapp"]
EOF

podman build --platform linux/amd64 -t myapp:amd64 .
```

### Static Binary Approach

Download pre-built AMD64 binaries on your ARM64 host.

```bash
cat > Containerfile <<'EOF'
# Download stage (runs natively, just fetching files)
FROM --platform=$BUILDPLATFORM alpine:3.19 AS fetcher
RUN apk add --no-cache curl

# Download AMD64 binary
ARG TOOL_VERSION=1.0.0
RUN curl -Lo /tmp/tool \
    "https://github.com/example/tool/releases/download/v${TOOL_VERSION}/tool-linux-amd64" && \
    chmod +x /tmp/tool

# AMD64 runtime
FROM --platform=linux/amd64 alpine:3.19
COPY --from=fetcher /tmp/tool /usr/local/bin/tool
CMD ["tool"]
EOF

podman build --platform linux/amd64 -t tool:amd64 .
```

## Building Both Architectures

Create images for both platforms from your ARM64 machine.

```bash
# Build ARM64 (native, fast)
podman build --platform linux/arm64 -t myapp:arm64 .

# Build AMD64 (emulated or cross-compiled)
podman build --platform linux/amd64 -t myapp:amd64 .

# Create a manifest list
podman manifest create myapp:latest
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64

# Verify both platforms
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture}'
```

## Performance Comparison

Benchmark native vs emulated builds:

```bash
# Native ARM64 build (fast)
time podman build --platform linux/arm64 -t bench:arm64 .

# Emulated AMD64 build (slower)
time podman build --platform linux/amd64 -t bench:amd64 .

# Cross-compiled AMD64 build (nearly as fast as native)
time podman build --platform linux/amd64 -t bench:amd64-cross -f Containerfile.cross .
```

## Testing the AMD64 Image

```bash
# Run the AMD64 image on your ARM64 machine
podman run --rm myapp:amd64

# Interactive shell
podman run --rm -it myapp:amd64 /bin/sh

# Verify it is actually AMD64
podman run --rm myapp:amd64 uname -m
# Output: x86_64

# Check a binary
podman run --rm --entrypoint /bin/sh myapp:amd64 -c \
  'apk add --no-cache file >/dev/null && file /usr/local/bin/app'
# Output: ELF 64-bit LSB executable, x86-64
```

## Troubleshooting

### Slow Builds

```bash
# Use cross-compilation whenever possible
# Minimize RUN instructions under emulation
# Use multi-stage builds to limit emulated layers
```

### Segfaults During Build

```bash
# QEMU can crash under heavy loads. Allocate more resources.
# On macOS, increase Podman machine resources
podman machine stop
podman machine set --cpus 4 --memory 8192
podman machine start

# Retry the build
podman build --platform linux/amd64 -t myapp:amd64 .
```

### Package Manager Issues

```bash
# Some AMD64 packages may not install cleanly under emulation
# Workaround: Use pre-built binaries or static compilation
# Alternatively, use a multi-stage build where the install
# happens natively and only the results are copied
```

## CI/CD on AWS Graviton

```bash
#!/bin/bash
# Build script for AWS Graviton (ARM64) CI runners
# Produces both ARM64 and AMD64 images

REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"
IMAGE="${REGISTRY}/myapp"
TAG="${CODEBUILD_RESOLVED_SOURCE_VERSION:0:8}"

# Native ARM64 build (fast on Graviton)
podman build --platform linux/arm64 -t "${IMAGE}:${TAG}-arm64" .

# Cross-compiled AMD64 build
podman build --platform linux/amd64 -t "${IMAGE}:${TAG}-amd64" .

# Create and push manifest
podman manifest create "${IMAGE}:${TAG}"
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-arm64"
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-amd64"
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
```

## Summary

Building AMD64 images on ARM64 with Podman requires emulation or translation for `RUN` instructions that execute AMD64 binaries. Podman Machine handles this on macOS, and Linux ARM64 hosts can use QEMU user-mode emulation with binfmt registration. Use cross-compilation for compiled languages to avoid the emulation overhead. The `--platform linux/amd64` flag is all you need to target AMD64 from your ARM64 build machine. Combine both architectures into a manifest list for seamless multi-platform deployments.

# How to Create Minimal Docker Images for Rust Binaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Docker, Containers, musl, Static Linking, Distroless, Security, Kubernetes

Description: Learn how to create minimal Docker images for Rust binaries using multi-stage builds, static linking with musl, and distroless base images. Achieve images under 10MB while maintaining security and functionality.

---

> A typical Rust binary is already small. Why ship it in a 1GB container? This guide shows you how to build Docker images that are often smaller than 10MB, start instantly, and have minimal attack surface.

Minimal images mean faster deployments, reduced storage costs, and improved security. Rust's ability to compile to static binaries makes it uniquely suited for scratch and distroless containers.

---

## Image Size Comparison

| Approach | Image Size | Attack Surface |
|----------|-----------|----------------|
| Standard Debian | ~1GB | Large |
| Alpine-based | ~50MB | Medium |
| Distroless | ~20MB | Minimal |
| Scratch + static | ~5-10MB | None |

---

## Basic Multi-Stage Build

Start with a standard multi-stage build that separates the build environment from the runtime.

```dockerfile
# Dockerfile
# Basic multi-stage build for Rust

# Build stage
FROM rust:1.75 AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY Cargo.toml Cargo.lock ./

# Create dummy source for dependency caching
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy actual source and rebuild
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install CA certificates and minimal dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -s /bin/false appuser

# Copy binary
COPY --from=builder /app/target/release/myapp /usr/local/bin/

# Use non-root user
USER appuser

EXPOSE 3000

CMD ["myapp"]
```

Build and check size:

```bash
docker build -t myapp:debian .
docker images myapp:debian
# REPOSITORY   TAG      SIZE
# myapp        debian   ~150MB
```

---

## Alpine-Based Build

Alpine Linux uses musl libc, resulting in smaller images.

```dockerfile
# Dockerfile.alpine
# Alpine-based build with musl

# Build stage with Alpine
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Dependency caching layer
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Build actual application
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM alpine:3.19

# Install CA certificates
RUN apk add --no-cache ca-certificates

# Create non-root user
RUN adduser -D -s /bin/false appuser

# Copy binary
COPY --from=builder /app/target/release/myapp /usr/local/bin/

USER appuser

EXPOSE 3000

CMD ["myapp"]
```

```bash
docker build -t myapp:alpine -f Dockerfile.alpine .
docker images myapp:alpine
# REPOSITORY   TAG      SIZE
# myapp        alpine   ~25MB
```

---

## Static Binary with musl for Scratch Images

Compile a fully static binary that runs without any runtime dependencies.

### Setup for Static Compilation

```bash
# Add musl target
rustup target add x86_64-unknown-linux-musl

# For cross-compilation on macOS
brew install filosottile/musl-cross/musl-cross
```

### Dockerfile for Static Binary

```dockerfile
# Dockerfile.scratch
# Minimal scratch image with static binary

# Build stage using official musl builder
FROM rust:1.75-alpine AS builder

# Install musl build tools
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy src for caching
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs

# Build dependencies only (cached if Cargo.toml unchanged)
RUN cargo build --release --target x86_64-unknown-linux-musl && \
    rm -rf src

# Copy actual source
COPY src ./src

# Build the application
RUN touch src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl

# Verify it's statically linked
RUN ldd target/x86_64-unknown-linux-musl/release/myapp 2>&1 | grep -q "statically linked"

# Runtime stage - completely empty base
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the static binary
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /myapp

# Expose port
EXPOSE 3000

# Run the binary
ENTRYPOINT ["/myapp"]
```

```bash
docker build -t myapp:scratch -f Dockerfile.scratch .
docker images myapp:scratch
# REPOSITORY   TAG      SIZE
# myapp        scratch  ~8MB
```

---

## Distroless Images

Google's distroless images provide a minimal runtime with some conveniences over scratch.

```dockerfile
# Dockerfile.distroless
# Distroless image for production

FROM rust:1.75-slim AS builder

WORKDIR /app

# Install SSL development libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev && \
    rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

# Use distroless runtime
FROM gcr.io/distroless/cc-debian12

# Copy binary
COPY --from=builder /app/target/release/myapp /

EXPOSE 3000

CMD ["/myapp"]
```

```bash
docker build -t myapp:distroless -f Dockerfile.distroless .
docker images myapp:distroless
# REPOSITORY   TAG         SIZE
# myapp        distroless  ~22MB
```

---

## Handling OpenSSL vs rustls

OpenSSL requires shared libraries. For true static builds, use rustls instead.

### Cargo.toml Configuration

```toml
[dependencies]
# Use rustls for TLS instead of OpenSSL
reqwest = { version = "0.11", default-features = false, features = [
    "rustls-tls",  # Use rustls instead of native-tls
    "json",
] }

# For sqlx
sqlx = { version = "0.7", default-features = false, features = [
    "runtime-tokio",
    "tls-rustls",  # Use rustls
    "postgres",
] }

# For tonic (gRPC)
tonic = { version = "0.11", features = ["tls-rustls"] }
```

### Verifying Static Linking

```bash
# Check if binary is statically linked
file target/x86_64-unknown-linux-musl/release/myapp
# myapp: ELF 64-bit LSB executable, statically linked

# Verify no dynamic dependencies
ldd target/x86_64-unknown-linux-musl/release/myapp
# statically linked
```

---

## Optimizing Binary Size

### Cargo.toml Release Profile

```toml
[profile.release]
# Optimize for size
opt-level = "z"      # Optimize for size (or "s" for slightly less aggressive)
lto = true           # Link-Time Optimization
codegen-units = 1    # Single codegen unit for better optimization
panic = "abort"      # Smaller binary, no unwinding
strip = true         # Strip symbols

[profile.release.package."*"]
opt-level = "z"      # Also optimize dependencies for size
```

### Using UPX Compression (Optional)

```dockerfile
# Additional compression with UPX
FROM rust:1.75-alpine AS builder
# ... build steps ...

FROM alpine:3.19 AS compressor
RUN apk add --no-cache upx
COPY --from=builder /app/target/release/myapp /myapp
RUN upx --best --lzma /myapp

FROM scratch
COPY --from=compressor /myapp /myapp
ENTRYPOINT ["/myapp"]
```

**Note**: UPX can reduce binary size by 50-70% but increases startup time slightly.

---

## Cross-Compilation from macOS

Build Linux images from macOS using cross-compilation.

```bash
# Install cross-compilation toolchain
cargo install cross

# Build for Linux musl target
cross build --release --target x86_64-unknown-linux-musl
```

Or use Docker for building:

```dockerfile
# Dockerfile.cross
# Cross-compile from any platform

FROM --platform=linux/amd64 rust:1.75-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app
COPY . .

RUN cargo build --release

FROM --platform=linux/amd64 scratch
COPY --from=builder /app/target/release/myapp /myapp
ENTRYPOINT ["/myapp"]
```

```bash
# Build for specific platform
docker buildx build --platform linux/amd64 -t myapp:amd64 .
docker buildx build --platform linux/arm64 -t myapp:arm64 .
```

---

## Multi-Architecture Builds

Support both AMD64 and ARM64 architectures.

```dockerfile
# Dockerfile.multiarch
# Multi-architecture build

FROM --platform=$BUILDPLATFORM rust:1.75-alpine AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM

# Install cross-compilation tools
RUN apk add --no-cache musl-dev

# Map Docker platform to Rust target
RUN case "$TARGETPLATFORM" in \
        "linux/amd64") echo "x86_64-unknown-linux-musl" > /target ;; \
        "linux/arm64") echo "aarch64-unknown-linux-musl" > /target ;; \
        *) echo "Unsupported platform: $TARGETPLATFORM" && exit 1 ;; \
    esac

# Add target
RUN rustup target add $(cat /target)

WORKDIR /app
COPY . .

# Build for target platform
RUN cargo build --release --target $(cat /target)
RUN cp target/$(cat /target)/release/myapp /myapp

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /myapp /myapp
ENTRYPOINT ["/myapp"]
```

```bash
# Build and push multi-arch image
docker buildx create --use
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t myregistry/myapp:latest \
    --push \
    .
```

---

## Production-Ready Dockerfile

Complete example with all best practices:

```dockerfile
# Dockerfile.production
# Production-ready minimal Rust container

# syntax=docker/dockerfile:1.4

# Build stage
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev

WORKDIR /app

# Copy only dependency files first
COPY Cargo.toml Cargo.lock ./

# Create dummy main for dependency caching
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies (this layer is cached)
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    rm -rf src

# Copy source code
COPY src ./src

# Build the actual application
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    touch src/main.rs && \
    cargo build --release && \
    cp target/release/myapp /myapp

# Runtime stage
FROM gcr.io/distroless/static-debian12:nonroot

# Labels
LABEL org.opencontainers.image.source="https://github.com/myorg/myapp"
LABEL org.opencontainers.image.description="My Rust Application"
LABEL org.opencontainers.image.version="1.0.0"

# Copy binary
COPY --from=builder /myapp /myapp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/myapp", "--health-check"]

# Run as non-root (distroless:nonroot runs as user 65532)
USER nonroot

ENTRYPOINT ["/myapp"]
```

---

## Security Considerations

### Run as Non-Root

```dockerfile
# In Dockerfile
USER 65532:65532  # Common nonroot UID

# Or create specific user
RUN adduser -D -H -u 10001 appuser
USER appuser
```

### Read-Only Filesystem

```yaml
# Kubernetes deployment
securityContext:
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 65532
```

### Scan for Vulnerabilities

```bash
# Scan image for vulnerabilities
trivy image myapp:latest

# Zero vulnerabilities with scratch/distroless
trivy image myapp:scratch
# Total: 0 (UNKNOWN: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0)
```

---

## Summary

| Base Image | Size | Use Case |
|------------|------|----------|
| `scratch` | ~5-10MB | Statically linked binaries |
| `distroless/static` | ~2MB | Static binaries with timezone data |
| `distroless/cc` | ~20MB | Binaries needing libc |
| `alpine` | ~25-50MB | When you need a shell for debugging |
| `debian-slim` | ~80-150MB | When Alpine compatibility is an issue |

---

*Need to monitor your containerized Rust services? [OneUptime](https://oneuptime.com) provides container monitoring with resource tracking and health checks.*

**Related Reading:**
- [Shrink and Harden Docker Images](https://oneuptime.com/blog/post/2025-11-27-shrink-and-harden-docker-images/view)
- [How to Implement Health Checks in Rust for Kubernetes](https://oneuptime.com/blog/post/2026-01-07-rust-kubernetes-health-checks/view)

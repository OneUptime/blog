# How to Create a Scratch-Based Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Scratch Image, Minimal Containers, Containerfile, DevOps

Description: Learn how to create the smallest possible container images using the scratch base with Podman, including static binaries, CA certificates, and user configuration.

---

> Scratch is not an image. It is the absence of one, giving you a completely empty filesystem to build upon with only what your application truly needs.

The `scratch` base image is a special construct in container builds. It represents a completely empty filesystem with no operating system, no libraries, no shell, and no utilities. Building from scratch means you are responsible for providing everything your application needs to run. The result is the absolute minimum viable container image. This guide walks through building scratch-based images with Podman for various use cases.

---

## What Is the Scratch Image?

The `scratch` image is an empty, reserved name in container builds. Unlike other base images, you cannot pull it because it does not exist in any registry. It simply means "start with nothing."

```dockerfile
FROM scratch
```

When you build from scratch, the resulting image contains only the files you explicitly COPY into it. There is no `/bin/sh`, no `/lib`, no `/etc`, no filesystem structure at all unless you create it.

## When to Use Scratch

Scratch images are appropriate when your application is a statically linked binary that bundles all its dependencies. This is common with Go, Rust, and C/C++ applications compiled with static linking. If your application needs a runtime (Python, Node.js, Java), scratch is not suitable because you would need to include the entire runtime.

## A Basic Go Application from Scratch

Here is the most common scratch use case: a statically compiled Go binary:

```dockerfile
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /server .

FROM scratch

COPY --from=builder /server /server

ENTRYPOINT ["/server"]
```

Build and check the size:

```bash
podman build -t go-scratch .
podman images go-scratch
```

The image size will be roughly the size of the Go binary itself, typically between 5-20 MB depending on the application.

Key build flags explained: `CGO_ENABLED=0` disables cgo so the binary does not link to system C libraries. `GOOS=linux` targets Linux regardless of the build host. `-ldflags="-s -w"` strips debug information and symbol tables to reduce binary size.

## Adding Essential System Files

Most real applications need more than just the binary. Here are the files you commonly need to include.

### CA Certificates for HTTPS

If your application makes HTTPS requests, it needs CA certificate bundles:

```dockerfile
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM scratch

# Copy CA certificates

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /server /server

ENTRYPOINT ["/server"]
```

Without these certificates, standard HTTPS connections that rely on system roots will fail with certificate verification errors.

### Timezone Data

If your application needs timezone support:

```dockerfile
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder /server /server

ENV TZ=UTC
ENTRYPOINT ["/server"]
```

### Non-Root User

Running as non-root is a security best practice. Since scratch has no `/etc/passwd`, you need to create or copy one:

```dockerfile
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

# Create a non-root user
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

COPY --from=builder /server /server

USER appuser:appgroup

ENTRYPOINT ["/server"]
```

## Complete Production Template

Here is a complete template that includes all common requirements:

```dockerfile
FROM golang:1.26-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    git

# Create non-root user
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup -h /app

WORKDIR /app

# Download dependencies first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source and build
COPY . .

ARG VERSION=dev
ARG COMMIT=unknown

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -o /server ./cmd/server

# Create necessary directories
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Final scratch image
FROM scratch

# System files
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Application data directory
COPY --from=builder --chown=10001:10001 /app/data /app/data

# Application binary
COPY --from=builder /server /server

# Runtime configuration
ENV TZ=UTC
USER appuser:appgroup
EXPOSE 8080

ENTRYPOINT ["/server"]
```

Build with dynamic metadata:

```bash
podman build \
    --build-arg VERSION=$(git describe --tags --always) \
    --build-arg COMMIT=$(git rev-parse --short HEAD) \
    -t my-app:latest .
```

## Rust Application from Scratch

Rust applications can also target scratch using musl for static linking:

```dockerfile
FROM rust:1.95-slim AS builder

RUN apt-get update && apt-get install -y musl-tools && \
    rustup target add x86_64-unknown-linux-musl

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release --target x86_64-unknown-linux-musl && \
    strip /app/target/x86_64-unknown-linux-musl/release/myapp

FROM scratch

COPY --from=builder /etc/ssl/certs /etc/ssl/certs
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /myapp

ENTRYPOINT ["/myapp"]
```

The `strip` command removes debug symbols, further reducing binary size.

## C Application from Scratch

For C applications, use musl-gcc for static compilation:

```dockerfile
FROM alpine:3.23 AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY main.c .

RUN gcc -static -O2 -o /server main.c

FROM scratch

COPY --from=builder /server /server

ENTRYPOINT ["/server"]
```

## Including Static Files

If your application serves static files (HTML, CSS, images), copy them into the scratch image:

```dockerfile
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM node:24-alpine AS frontend

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /server /server
COPY --from=frontend /app/dist /static

ENTRYPOINT ["/server"]
```

## Working with Temporary Files

Scratch images have no `/tmp` directory. If your application needs temporary storage, create the directory in your application startup code or use a volume:

```bash
# Mount a tmpfs for temporary files
podman run -d --tmpfs /tmp:rw,size=100m my-scratch-app

# Or mount a volume
podman run -d -v app-data:/app/data my-scratch-app
```

## Debugging Scratch Containers

Debugging scratch containers is challenging because there is no shell. Here are your options:

```bash
# Copy files out of the container for inspection
podman cp my-container:/app/data/log.txt ./log.txt

# Inspect the container state
podman inspect my-container

# View application logs
podman logs my-container

# Attach a debug container to the same network
podman run --rm -it --network container:my-container alpine sh

# Use podman mount to inspect the filesystem (rootful containers)
sudo podman mount my-container

# For rootless containers, run mount inside the Podman user namespace
podman unshare podman mount my-container
```

For development, consider a debug build target:

```dockerfile
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

# Debug target with a shell
FROM alpine:3.23 AS debug
COPY --from=builder /server /server
ENTRYPOINT ["/server"]

# Production target from scratch
FROM scratch AS production
COPY --from=builder /server /server
ENTRYPOINT ["/server"]
```

Build the debug version when needed:

```bash
podman build --target debug -t my-app:debug .
podman build --target production -t my-app:latest .
```

## Scratch vs Distroless vs Alpine

Understanding when to use each minimal base helps you make the right choice:

**Scratch** gives you the absolute smallest image but requires a fully static binary. You get zero OS overhead and zero attack surface from OS packages. You are responsible for including everything.

**Distroless** includes only the runtime files needed by each image variant, such as glibc in the base and cc images. It can support dynamically linked binaries when you choose a variant with the required runtime libraries, and common variants include useful defaults such as CA certificates and non-root tags. Slightly larger than scratch but much easier to work with.

**Alpine** is a full (minimal) Linux distribution at around 7 MB. It includes a shell, package manager, and common utilities. Use it when you need to install additional packages or need a shell for debugging.

## Best Practices

Always use multi-stage builds to separate the build environment from the scratch runtime. Include CA certificates if your application makes any HTTPS calls. Include timezone data if your application works with time zones. Create and use a non-root user for security. Test your scratch images thoroughly because missing files cause runtime failures, not build failures. Use build targets to maintain both debug and production variants. Pin your builder image versions for reproducible builds. Consider using `--tmpfs` mounts for applications that need temporary file storage.

## Conclusion

Building from scratch produces the smallest and most secure container images possible. The empty filesystem forces you to be intentional about every file in your image, resulting in a minimal attack surface and tiny image sizes. While it demands more effort than using a pre-built base image, the security and size benefits make scratch the ideal choice for statically compiled production applications. Start with the complete production template in this guide and customize it for your specific needs.

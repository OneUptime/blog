# How to Containerize Go Apps with Multi-Stage Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Docker, Containers, DevOps, CI/CD

Description: Build minimal, secure Docker images for Go applications using multi-stage builds with scratch and distroless base images.

---

## Introduction

Go applications are uniquely suited for containerization. Unlike interpreted languages that require runtime environments, Go compiles to a single static binary that can run without any dependencies. This characteristic makes Go the perfect candidate for creating extremely minimal Docker images.

In this comprehensive guide, you will learn how to leverage multi-stage Docker builds to create production-ready Go containers that are:

- **Minimal**: Images as small as 5-20 MB instead of 300+ MB
- **Secure**: Reduced attack surface with no shell or package manager
- **Fast**: Quick deployments and minimal bandwidth usage
- **Reproducible**: Consistent builds across environments

We will cover everything from basic multi-stage builds to advanced techniques using scratch and distroless base images, along with security best practices and troubleshooting tips.

## Understanding Multi-Stage Docker Builds

Multi-stage builds allow you to use multiple `FROM` statements in a single Dockerfile. Each `FROM` instruction starts a new build stage, and you can selectively copy artifacts from one stage to another. This is particularly powerful for compiled languages like Go.

### Why Multi-Stage Builds Matter

Traditional Docker builds for Go applications often include the entire Go toolchain, source code, and intermediate build artifacts in the final image. This results in images that are hundreds of megabytes in size and contain unnecessary files that increase the attack surface.

Multi-stage builds solve this by separating the build environment from the runtime environment:

1. **Build Stage**: Contains the Go compiler, source code, and all build tools
2. **Runtime Stage**: Contains only the compiled binary and essential runtime dependencies

## Setting Up a Sample Go Application

Let's start with a simple HTTP server that we will containerize throughout this guide.

The following code creates a basic HTTP server with health check and info endpoints:

```go
// main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "runtime"
    "time"
)

// AppInfo contains application metadata
type AppInfo struct {
    Name      string `json:"name"`
    Version   string `json:"version"`
    GoVersion string `json:"go_version"`
    Hostname  string `json:"hostname"`
    Timestamp string `json:"timestamp"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
    Status    string `json:"status"`
    Timestamp string `json:"timestamp"`
}

var (
    version   = "1.0.0"
    startTime = time.Now()
)

func main() {
    // Get the port from environment variable or default to 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Register handlers
    http.HandleFunc("/", handleRoot)
    http.HandleFunc("/health", handleHealth)
    http.HandleFunc("/info", handleInfo)

    // Start the server
    log.Printf("Starting server on port %s", port)
    if err := http.ListenAndServe(":"+port, nil); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello from Go Docker Multi-Stage Demo!")
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    response := HealthResponse{
        Status:    "healthy",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func handleInfo(w http.ResponseWriter, r *http.Request) {
    hostname, _ := os.Hostname()

    info := AppInfo{
        Name:      "go-docker-demo",
        Version:   version,
        GoVersion: runtime.Version(),
        Hostname:  hostname,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(info)
}
```

Create a Go module for dependency management:

```bash
# Initialize the Go module
go mod init github.com/example/go-docker-demo
```

## Basic Multi-Stage Dockerfile

This Dockerfile demonstrates the fundamental pattern of multi-stage builds with a builder and runtime stage:

```dockerfile
# Stage 1: Build stage
# Use the official Go image as the build environment
FROM golang:1.22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum first to leverage Docker cache
# This layer will only rebuild when dependencies change
COPY go.mod go.sum* ./

# Download dependencies
# Using go mod download for better caching
RUN go mod download

# Copy the source code
COPY . .

# Build the application
# -o specifies the output binary name
RUN go build -o main .

# Stage 2: Runtime stage
# Use alpine as a minimal base image
FROM alpine:3.19

# Set the working directory
WORKDIR /app

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/main .

# Expose the application port
EXPOSE 8080

# Run the application
CMD ["./main"]
```

Build and test the image:

```bash
# Build the Docker image
docker build -t go-app:alpine .

# Check the image size
docker images go-app:alpine

# Run the container
docker run -p 8080:8080 go-app:alpine
```

This basic approach already reduces image size significantly, but we can do much better.

## Building Static Binaries with CGO_ENABLED=0

By default, Go may link against system C libraries for certain functionality. To create truly portable static binaries, we need to disable CGO.

This Dockerfile shows how to build a fully static binary that has no external dependencies:

```dockerfile
# Stage 1: Build stage with static binary compilation
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency files first for better caching
COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Build a static binary with CGO disabled
# CGO_ENABLED=0: Disables C bindings for a pure Go binary
# GOOS=linux: Target operating system
# GOARCH=amd64: Target architecture (adjust for arm64 if needed)
# -ldflags="-w -s": Strip debug information to reduce binary size
#   -w: Omit DWARF symbol table
#   -s: Omit symbol table and debug information
# -a: Force rebuild of all packages
# -installsuffix cgo: Add suffix to package directory to separate from CGO builds
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Minimal runtime
FROM alpine:3.19

WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
```

### Understanding the Build Flags

| Flag | Purpose |
|------|---------|
| `CGO_ENABLED=0` | Disables CGO for static linking |
| `GOOS=linux` | Sets target OS to Linux |
| `GOARCH=amd64` | Sets target architecture |
| `-ldflags="-w -s"` | Strips debug info (reduces size by ~25%) |
| `-a` | Forces rebuild of all packages |
| `-installsuffix cgo` | Separates build cache from CGO builds |

## Using Scratch as Base Image

The `scratch` image is Docker's reserved minimal image. It contains absolutely nothing - no shell, no libraries, no package manager. This is the ultimate minimal base for Go applications.

This Dockerfile creates the smallest possible image using scratch as the base:

```dockerfile
# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy and download dependencies
COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Build a completely static binary
# The binary must be fully static since scratch has no libraries
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Scratch runtime
# scratch is an empty image with nothing in it
FROM scratch

# Copy the binary from the builder stage
COPY --from=builder /app/main /main

# Expose the port (documentation only in scratch)
EXPOSE 8080

# Run the binary
# Note: We use the exec form since there's no shell
ENTRYPOINT ["/main"]
```

Build and verify the image size:

```bash
# Build with scratch base
docker build -t go-app:scratch .

# Compare image sizes
docker images | grep go-app

# Expected output:
# go-app    scratch    abc123    5.2MB
# go-app    alpine     def456    12.8MB
```

### Limitations of Scratch Images

While scratch images are extremely minimal, they have limitations:

1. **No shell**: Cannot exec into the container for debugging
2. **No certificates**: HTTPS requests will fail
3. **No timezone data**: Time-related operations may fail
4. **No user management**: Runs as root by default

We will address these limitations in the following sections.

## Adding CA Certificates for HTTPS

If your application makes HTTPS requests to external services, you need CA certificates. Scratch images do not include these by default.

This Dockerfile shows how to add CA certificates to a scratch-based image:

```dockerfile
# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install CA certificates in the builder stage
# These will be copied to the final image
RUN apk --no-cache add ca-certificates

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Scratch with certificates
FROM scratch

# Copy CA certificates from the builder stage
# This enables HTTPS requests to external services
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /app/main /main

EXPOSE 8080
ENTRYPOINT ["/main"]
```

## Adding Timezone Data

Go applications that use the `time` package may need timezone data for proper time handling. The scratch image does not include this.

This Dockerfile demonstrates how to include timezone data for time operations:

```dockerfile
# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install required packages
RUN apk --no-cache add ca-certificates tzdata

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Scratch with certificates and timezone
FROM scratch

# Copy CA certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data
# This enables time.LoadLocation() to work correctly
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Set the timezone (optional - can also be set at runtime)
ENV TZ=UTC

COPY --from=builder /app/main /main

EXPOSE 8080
ENTRYPOINT ["/main"]
```

## Using Distroless Images

Google's distroless images provide a middle ground between alpine and scratch. They include CA certificates, timezone data, and a non-root user, but exclude shells and package managers.

This Dockerfile uses the distroless static image for a secure runtime:

```dockerfile
# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Build static binary for distroless
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Distroless runtime
# gcr.io/distroless/static contains:
# - CA certificates
# - Timezone data
# - /etc/passwd with nonroot user
# It does NOT contain:
# - Shell
# - Package manager
# - Any other binaries
FROM gcr.io/distroless/static:nonroot

# Copy the binary
COPY --from=builder /app/main /main

# Use the nonroot user (UID 65532)
USER nonroot:nonroot

EXPOSE 8080
ENTRYPOINT ["/main"]
```

### Distroless Image Variants

| Image | Contents | Use Case |
|-------|----------|----------|
| `static` | Minimal, for pure Go binaries | Static Go apps |
| `base` | Includes glibc | CGO-enabled Go apps |
| `static:nonroot` | Static with nonroot user | Production static apps |
| `base:nonroot` | Base with nonroot user | Production CGO apps |

## Running as Non-Root User

Running containers as non-root is a critical security practice. Here is how to do it with scratch images.

This Dockerfile creates a non-root user for running the application securely:

```dockerfile
# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Create a non-root user in the builder stage
# This user will be copied to the final image
RUN adduser -D -g '' -u 10001 appuser

RUN apk --no-cache add ca-certificates tzdata

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

# Stage 2: Scratch with non-root user
FROM scratch

# Copy CA certificates and timezone data
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy passwd file for the non-root user
# This is required for the USER directive to work
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy the binary
COPY --from=builder /app/main /main

# Use the non-root user
USER appuser:appuser

EXPOSE 8080
ENTRYPOINT ["/main"]
```

## Production-Ready Dockerfile

This comprehensive Dockerfile combines all best practices for production deployments:

```dockerfile
# =============================================================================
# Production-Ready Multi-Stage Dockerfile for Go Applications
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Environment
# -----------------------------------------------------------------------------
FROM golang:1.22-alpine AS builder

# Install build dependencies and security certificates
RUN apk --no-cache add \
    ca-certificates \
    tzdata \
    git

# Create non-root user for the runtime stage
RUN adduser -D -g '' -u 10001 appuser

# Set working directory
WORKDIR /app

# Copy dependency files first (Docker layer caching optimization)
COPY go.mod go.sum* ./

# Download dependencies
# Using mount cache for faster rebuilds
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy source code
COPY . .

# Build the application with all optimizations
# Using mount cache for build cache
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=${VERSION:-dev}" \
    -a \
    -installsuffix cgo \
    -o main .

# Verify the binary is static
RUN file main | grep -q "statically linked" && echo "Binary is static" || echo "Warning: Binary may not be fully static"

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM scratch

# Add metadata labels following OCI conventions
LABEL org.opencontainers.image.title="Go Docker Demo" \
      org.opencontainers.image.description="Production Go application" \
      org.opencontainers.image.vendor="OneUptime" \
      org.opencontainers.image.source="https://github.com/example/go-docker-demo"

# Copy CA certificates for HTTPS support
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data for time operations
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy user/group files for non-root execution
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy the compiled binary
COPY --from=builder /app/main /main

# Set default timezone
ENV TZ=UTC

# Switch to non-root user
USER appuser:appuser

# Document the exposed port
EXPOSE 8080

# Health check instruction
# Note: This won't work in scratch without a shell
# Use orchestrator health checks instead (Kubernetes, Docker Swarm)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD ["/main", "-health-check"]

# Run the application
ENTRYPOINT ["/main"]
```

## Build Arguments and Version Injection

Use build arguments to inject version information and configuration at build time.

This Dockerfile shows how to use build arguments for dynamic configuration:

```dockerfile
FROM golang:1.22-alpine AS builder

# Define build arguments
ARG VERSION=dev
ARG COMMIT_SHA=unknown
ARG BUILD_TIME

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata git

# Create non-root user
RUN adduser -D -g '' -u 10001 appuser

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Inject version information via ldflags
# -X sets the value of a string variable at link time
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s \
        -X main.version=${VERSION} \
        -X main.commitSHA=${COMMIT_SHA} \
        -X main.buildTime=${BUILD_TIME}" \
    -o main .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /app/main /main

USER appuser:appuser
EXPOSE 8080
ENTRYPOINT ["/main"]
```

Build with version information:

```bash
# Build with version information injected at build time
docker build \
    --build-arg VERSION="1.2.3" \
    --build-arg COMMIT_SHA="$(git rev-parse HEAD)" \
    --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -t go-app:1.2.3 .
```

## Multi-Architecture Builds

Support both amd64 and arm64 architectures for broader compatibility.

This Dockerfile supports building for multiple CPU architectures:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.22-alpine AS builder

# These arguments are automatically provided by Docker buildx
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata
RUN adduser -D -g '' -u 10001 appuser

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Build for the target platform
# TARGETOS and TARGETARCH are set automatically by buildx
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /app/main /main

USER appuser:appuser
EXPOSE 8080
ENTRYPOINT ["/main"]
```

Build for multiple architectures:

```bash
# Create a builder for multi-platform builds
docker buildx create --name multiarch --use

# Build and push for multiple architectures
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t myregistry/go-app:latest \
    --push .
```

## Security Scanning

Integrate security scanning into your build process to identify vulnerabilities.

Use Trivy to scan your images for vulnerabilities:

```bash
# Install Trivy (on macOS)
brew install aquasecurity/trivy/trivy

# Scan the image for vulnerabilities
trivy image go-app:scratch

# Scan with severity filter
trivy image --severity HIGH,CRITICAL go-app:scratch

# Scan and fail if vulnerabilities found (for CI/CD)
trivy image --exit-code 1 --severity CRITICAL go-app:scratch
```

Use Snyk for comprehensive security analysis:

```bash
# Authenticate with Snyk
snyk auth

# Test the Docker image
snyk container test go-app:scratch

# Monitor for new vulnerabilities
snyk container monitor go-app:scratch
```

### Integrating Security Scanning in CI/CD

Add security scanning to your GitHub Actions workflow:

```yaml
# .github/workflows/docker.yml
name: Docker Build and Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          load: true
          tags: go-app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: go-app:${{ github.sha }}
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

      - name: Push to registry
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myregistry/go-app:${{ github.sha }}
```

## Docker Compose for Development

Create a development environment with hot reloading.

This Docker Compose configuration provides a development environment with live reload:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      # Mount source code for hot reloading
      - .:/app
      # Use named volume for Go module cache
      - go-modules:/go/pkg/mod
    environment:
      - PORT=8080
      - ENV=development
    # Use air for hot reloading
    command: ["air", "-c", ".air.toml"]

volumes:
  go-modules:
```

Create a development Dockerfile:

```dockerfile
# Dockerfile.dev
FROM golang:1.22-alpine

# Install development tools
RUN apk add --no-cache git curl

# Install air for hot reloading
RUN go install github.com/air-verse/air@latest

WORKDIR /app

# Copy dependency files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

EXPOSE 8080

# Default command (overridden by docker-compose)
CMD ["air", "-c", ".air.toml"]
```

Create an Air configuration file for hot reloading:

```toml
# .air.toml
root = "."
tmp_dir = "tmp"

[build]
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ."
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_error = true

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false
```

## Optimizing Build Performance

Implement caching strategies to speed up builds.

This Dockerfile uses BuildKit cache mounts for faster builds:

```dockerfile
# syntax=docker/dockerfile:1.4
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata
RUN adduser -D -g '' -u 10001 appuser

# Copy dependency files
COPY go.mod go.sum* ./

# Use cache mount for Go module downloads
# This caches the module download between builds
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Use cache mount for build cache
# This significantly speeds up incremental builds
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -a \
    -installsuffix cgo \
    -o main .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /app/main /main

USER appuser:appuser
EXPOSE 8080
ENTRYPOINT ["/main"]
```

Enable BuildKit for cache mounts:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with caching
docker build -t go-app:cached .

# Or use docker buildx
docker buildx build -t go-app:cached .
```

## Debugging Scratch Containers

Scratch containers have no shell, making debugging challenging. Here are strategies to overcome this.

Use a debug sidecar container:

```yaml
# docker-compose.debug.yml
version: '3.8'

services:
  app:
    image: go-app:scratch
    ports:
      - "8080:8080"
    # Share process namespace for debugging
    pid: "shareable"

  debug:
    image: alpine:3.19
    # Share network with the app container
    network_mode: "service:app"
    # Share process namespace
    pid: "service:app"
    stdin_open: true
    tty: true
    command: /bin/sh
```

Build a debug variant with shell access:

```dockerfile
# Dockerfile.debug
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o main .

# Debug variant uses alpine for shell access
FROM alpine:3.19

RUN apk --no-cache add \
    ca-certificates \
    curl \
    strace \
    tcpdump

COPY --from=builder /app/main /main

EXPOSE 8080
CMD ["/main"]
```

## Image Size Comparison

Here is a comparison of image sizes using different base images:

| Base Image | Approximate Size | HTTPS Support | Shell | Non-Root |
|------------|------------------|---------------|-------|----------|
| `golang:1.22` | ~850 MB | Yes | Yes | No |
| `golang:1.22-alpine` | ~250 MB | Yes | Yes | No |
| `alpine:3.19` | ~12 MB | Yes | Yes | No |
| `gcr.io/distroless/static` | ~2 MB | Yes | No | Optional |
| `scratch` | ~5 MB | No* | No | No |

*Requires copying CA certificates manually

## Best Practices Summary

1. **Always use multi-stage builds** to separate build and runtime environments
2. **Disable CGO** with `CGO_ENABLED=0` for static binaries
3. **Strip debug symbols** with `-ldflags="-w -s"` to reduce binary size
4. **Use scratch or distroless** for minimal attack surface
5. **Include CA certificates** if making HTTPS requests
6. **Add timezone data** if using time operations
7. **Run as non-root** user for security
8. **Scan images** for vulnerabilities before deployment
9. **Use build caching** to speed up builds
10. **Support multiple architectures** for broader compatibility

## Troubleshooting Common Issues

### Binary not executing in scratch

The binary might have dynamic dependencies. Verify it is static:

```bash
# Check if binary is static
file main

# Should output: ELF 64-bit LSB executable, ... statically linked
```

### HTTPS requests failing

Add CA certificates to your image:

```dockerfile
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
```

### Timezone errors

Include timezone data:

```dockerfile
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=UTC
```

### Permission denied errors

Ensure proper file permissions and user configuration:

```dockerfile
# Make binary executable
RUN chmod +x /main

# Use correct user
USER appuser:appuser
```

## Conclusion

Multi-stage Docker builds for Go applications offer significant benefits in terms of image size, security, and deployment speed. By using scratch or distroless base images combined with static binaries, you can create production-ready containers that are:

- 10-100x smaller than traditional images
- More secure with reduced attack surface
- Faster to deploy and scale
- Easier to maintain and audit

Start with the production-ready Dockerfile template in this guide and customize it for your specific needs. Remember to integrate security scanning into your CI/CD pipeline and regularly update your base images to patch vulnerabilities.

The techniques covered in this guide apply to any Go application, from simple HTTP servers to complex microservices. By following these best practices, you will be well-equipped to build and deploy Go applications in containerized environments efficiently and securely.

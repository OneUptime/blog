# Using Alpine, Distroless, and Multi-Stage Builds for Smaller Docker Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Optimization, Alpine, Distroless

Description: Reduce Docker image sizes with Alpine Linux, Google Distroless, and scratch base images. Includes multi-stage build patterns and tips for each language.

---

Smaller Docker images lead to faster deployments, reduced bandwidth costs, smaller attack surfaces, and quicker container startup times. This guide covers various techniques to minimize image size while maintaining functionality.

## Image Size Comparison

```
Common Base Image Sizes
┌────────────────────────────────────────────────────────────┐
│  ubuntu:22.04          │████████████████████████│   77 MB  │
├────────────────────────────────────────────────────────────┤
│  debian:bookworm-slim  │██████████████████│       74 MB    │
├────────────────────────────────────────────────────────────┤
│  python:3.11           │████████████████████████████ 1.0 GB│
├────────────────────────────────────────────────────────────┤
│  python:3.11-slim      │████████████│            130 MB    │
├────────────────────────────────────────────────────────────┤
│  python:3.11-alpine    │████│                     50 MB    │
├────────────────────────────────────────────────────────────┤
│  node:20               │████████████████████████████ 1.1 GB│
├────────────────────────────────────────────────────────────┤
│  node:20-slim          │██████████│              200 MB    │
├────────────────────────────────────────────────────────────┤
│  node:20-alpine        │██████│                  135 MB    │
├────────────────────────────────────────────────────────────┤
│  alpine:3.19           │██│                        7 MB    │
├────────────────────────────────────────────────────────────┤
│  gcr.io/distroless/base│██│                       20 MB    │
├────────────────────────────────────────────────────────────┤
│  scratch               │                           0 MB    │
└────────────────────────────────────────────────────────────┘
```

## Alpine Linux

Alpine uses musl libc and BusyBox, resulting in much smaller images.

### Basic Alpine Usage

```dockerfile
# Standard Ubuntu image
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl
# Result: ~100MB

# Alpine equivalent
FROM alpine:3.19
RUN apk add --no-cache curl
# Result: ~12MB
```

### Node.js with Alpine

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# Remove build dependencies
RUN apk del python3 make g++

COPY . .
CMD ["node", "index.js"]
```

### Python with Alpine

```dockerfile
FROM python:3.11-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
```

### Alpine Considerations

```dockerfile
# musl vs glibc compatibility issues
# Some packages may not work with musl libc

# Use --no-cache to avoid storing apk cache
RUN apk add --no-cache package-name

# For packages needing glibc, install compatibility layer
RUN apk add --no-cache libc6-compat
```

## Distroless Images

Google's Distroless images contain only the application and runtime dependencies, no shell or package manager.

### Using Distroless

```dockerfile
# Build stage
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o main .

# Distroless runtime
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/main /
CMD ["/main"]
```

### Distroless for Node.js

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Distroless runtime
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /app .
CMD ["index.js"]
```

### Distroless for Python

```dockerfile
# Build stage
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -t /app/deps

# Distroless runtime
FROM gcr.io/distroless/python3-debian12
WORKDIR /app
COPY --from=builder /app/deps /app/deps
COPY . .
ENV PYTHONPATH=/app/deps
CMD ["app.py"]
```

### Available Distroless Images

| Image | Use Case | Size |
|-------|----------|------|
| gcr.io/distroless/static | Static binaries (Go, Rust) | ~2MB |
| gcr.io/distroless/base | Dynamically linked | ~20MB |
| gcr.io/distroless/cc | C/C++ applications | ~21MB |
| gcr.io/distroless/python3 | Python applications | ~50MB |
| gcr.io/distroless/java | Java applications | ~190MB |
| gcr.io/distroless/nodejs | Node.js applications | ~120MB |

## Scratch Images

Scratch is an empty base image, perfect for statically compiled binaries.

### Go with Scratch

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Scratch runtime
FROM scratch
COPY --from=builder /app/main /
# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/main"]
```

### Rust with Scratch

```dockerfile
FROM rust:1.73 AS builder
WORKDIR /app
COPY . .

# Build static binary with musl
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM scratch
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /
ENTRYPOINT ["/myapp"]
```

### Adding Required Files to Scratch

```dockerfile
FROM scratch

# For HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# For timezone support
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# For user support
COPY --from=builder /etc/passwd /etc/passwd

# Your binary
COPY --from=builder /app/main /
```

## Multi-Stage Build Optimization

### Remove Build Dependencies

```dockerfile
# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 3: Minimal runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

### Selective File Copying

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app

# Only copy what's needed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

CMD ["node", "dist/index.js"]
```

## General Optimization Techniques

### Clean Package Manager Cache

```dockerfile
# APT (Debian/Ubuntu)
RUN apt-get update && \
    apt-get install -y package && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# APK (Alpine)
RUN apk add --no-cache package

# YUM (RHEL/CentOS)
RUN yum install -y package && \
    yum clean all && \
    rm -rf /var/cache/yum

# pip
RUN pip install --no-cache-dir -r requirements.txt

# npm
RUN npm ci --only=production && npm cache clean --force
```

### Remove Unnecessary Files

```dockerfile
# After npm install, remove dev dependencies
RUN npm prune --production

# Remove test files
RUN rm -rf test/ tests/ __tests__/ *.test.js *.spec.js

# Remove documentation
RUN rm -rf docs/ *.md

# Remove source maps
RUN find . -name "*.map" -delete
```

### Use Specific Version Tags

```dockerfile
# Bad: Full image with everything
FROM python:3.11

# Better: Slim variant
FROM python:3.11-slim

# Best: Alpine variant (if compatible)
FROM python:3.11-alpine
```

### Compress Binaries

```dockerfile
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .

# Build and compress
RUN go build -ldflags="-s -w" -o main .
RUN apt-get update && apt-get install -y upx
RUN upx --best main

FROM scratch
COPY --from=builder /app/main /
```

## Language-Specific Optimization

### Python

```dockerfile
# Multi-stage Python build
FROM python:3.11 AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
CMD ["python", "app.py"]
```

### Java

```dockerfile
# Build with JDK
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build --no-daemon

# Run with JRE
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
CMD ["java", "-jar", "app.jar"]
```

### .NET

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
WORKDIR /app
COPY . .
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=builder /app/out .
ENTRYPOINT ["dotnet", "myapp.dll"]
```

## Analyzing Image Size

### Docker History

```bash
# View layer sizes
docker history myimage:latest

# Detailed with full commands
docker history --no-trunc myimage:latest
```

### Dive Tool

```bash
# Install dive
brew install dive  # macOS
# or
wget https://github.com/wagoodman/dive/releases/download/v0.12.0/dive_0.12.0_linux_amd64.deb
sudo dpkg -i dive_0.12.0_linux_amd64.deb

# Analyze image
dive myimage:latest
```

### Container-diff

```bash
# Compare images
container-diff diff myimage:v1 myimage:v2
```

## Summary

| Base Image | Size | Shell | Package Manager | Best For |
|------------|------|-------|-----------------|----------|
| ubuntu | ~77MB | Yes | apt | Compatibility |
| alpine | ~7MB | Yes | apk | General use |
| slim variants | varies | Yes | varies | Production |
| distroless | ~20MB | No | No | Security focus |
| scratch | 0MB | No | No | Static binaries |

Start with multi-stage builds to separate build and runtime environments. Choose the smallest base image compatible with your application: Alpine for most use cases, Distroless for enhanced security, or scratch for statically compiled binaries. For more on Docker build optimization, see our post on [Optimizing Docker Build Times](https://oneuptime.com/blog/post/2026-01-16-docker-optimize-build-times/view).


# How to Use the FROM Instruction in Dockerfiles (Base Image Selection)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, FROM, Base Image, Containers, DevOps

Description: Master the FROM instruction in Dockerfiles including base image selection, multi-stage builds, and platform targeting.

---

The FROM instruction is the foundation of every Dockerfile. It sets the base image that all subsequent instructions build upon. Choosing the right base image affects your final image size, security posture, build speed, and runtime compatibility. Getting this decision right from the start saves significant time and headaches down the road.

This guide dives deep into the FROM instruction, covering syntax, image selection strategies, multi-stage builds, and platform-specific considerations.

## Basic FROM Syntax

At its simplest, FROM takes an image name:

```dockerfile
# Pull the latest Ubuntu image
FROM ubuntu
```

But the instruction supports several optional components:

```dockerfile
# Full syntax: FROM [--platform=<platform>] <image>[:<tag>] [AS <name>]
FROM --platform=linux/amd64 python:3.11-slim AS builder
```

Let's break down each part:

- `--platform` specifies the target platform (useful for cross-platform builds)
- The image name can include a registry path (`registry.example.com/myimage`)
- The tag (after the colon) identifies a specific version
- The `AS` keyword names the build stage for multi-stage builds

## Choosing the Right Base Image

Base image selection is one of the most important decisions in a Dockerfile. Here are the main categories.

### Official Images

Docker maintains a set of official images on Docker Hub. These are curated, regularly updated, and follow best practices.

```dockerfile
# Official language runtime images
FROM python:3.11
FROM node:20
FROM golang:1.22
FROM ruby:3.3

# Official OS images
FROM ubuntu:22.04
FROM debian:bookworm
FROM alpine:3.19
```

Always prefer official images over community-maintained alternatives. They receive timely security patches and follow consistent conventions.

### Full vs Slim vs Alpine

Most official images come in multiple variants. Understanding the differences is critical for making good choices.

**Full images** include development tools, documentation, and a complete package manager. They are the largest but most compatible option.

```dockerfile
# Full Python image - about 900MB
FROM python:3.11
```

**Slim images** strip out development tools and documentation, keeping only the runtime essentials. They are a good middle ground.

```dockerfile
# Slim Python image - about 150MB
FROM python:3.11-slim
```

**Alpine images** use Alpine Linux as the base. They are extremely small but use musl libc instead of glibc, which can cause compatibility issues with some packages.

```dockerfile
# Alpine Python image - about 50MB
FROM python:3.11-alpine
```

Here is a comparison of typical image sizes:

| Variant | Approximate Size | Use Case |
|---------|-----------------|----------|
| Full | 800MB-1GB | Development, debugging, compilation |
| Slim | 100-200MB | Production workloads, most applications |
| Alpine | 40-80MB | Size-critical deployments, simple applications |

### Distroless Images

Google's distroless images take minimalism further by removing the shell, package manager, and all other OS utilities. The image contains only your application and its runtime dependencies.

```dockerfile
# Use distroless for the smallest, most secure runtime image
FROM gcr.io/distroless/python3-debian12
```

Distroless images are excellent for production security since there is nothing for an attacker to exploit if they gain container access. However, they are difficult to debug because you cannot shell into the container.

## Pinning Image Versions

Never use the `latest` tag in production Dockerfiles. It creates non-reproducible builds because `latest` points to a different image over time.

```dockerfile
# Bad - unpredictable builds
FROM python:latest

# Better - pinned to a minor version
FROM python:3.11-slim

# Best - pinned to a specific digest for full reproducibility
FROM python:3.11-slim@sha256:abc123def456...
```

Pin to at least a minor version. For maximum reproducibility, use the SHA256 digest:

```bash
# Get the digest of an image
docker inspect --format='{{index .RepoDigests 0}}' python:3.11-slim
```

## Using FROM with a Registry

By default, Docker pulls images from Docker Hub. You can specify a different registry:

```dockerfile
# Pull from a private registry
FROM registry.example.com/myteam/base-python:3.11

# Pull from GitHub Container Registry
FROM ghcr.io/my-org/my-base-image:1.0

# Pull from Amazon ECR
FROM 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-base:latest

# Pull from Google Container Registry
FROM gcr.io/my-project/my-base:1.0
```

When using private registries, you need to authenticate first:

```bash
# Log in to a private registry
docker login registry.example.com
```

## Multi-Stage Builds with FROM

Multi-stage builds use multiple FROM instructions in a single Dockerfile. Each FROM starts a new build stage. This is one of the most powerful Dockerfile features for creating small production images.

```dockerfile
# Stage 1: Build the application
FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Compile a static binary
RUN CGO_ENABLED=0 go build -o /app/server .

# Stage 2: Create a minimal runtime image
FROM alpine:3.19
# Copy only the compiled binary from the build stage
COPY --from=builder /app/server /usr/local/bin/server
EXPOSE 8080
CMD ["server"]
```

The final image only contains the compiled binary and Alpine Linux, not the Go compiler, source code, or build dependencies. This can reduce image size from over 1GB to under 20MB.

You can reference a build stage by its name (using `AS`) or by its index (starting from 0):

```dockerfile
# Reference by name (preferred)
COPY --from=builder /app/dist ./dist

# Reference by index (0 for the first FROM)
COPY --from=0 /app/dist ./dist
```

You can also copy files from a completely separate image:

```dockerfile
# Copy nginx configuration from the official nginx image
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/nginx.conf
```

## Platform-Specific Builds

The `--platform` flag lets you build images for different CPU architectures:

```dockerfile
# Build specifically for AMD64
FROM --platform=linux/amd64 python:3.11-slim

# Build for ARM64 (Apple Silicon, AWS Graviton)
FROM --platform=linux/arm64 python:3.11-slim
```

This is particularly useful when building on Apple Silicon Macs but deploying to x86 servers, or vice versa.

For multi-platform builds, use Docker Buildx:

```bash
# Build for both AMD64 and ARM64 platforms simultaneously
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .
```

## Using ARG Before FROM

The only instruction that can appear before FROM is ARG. This lets you parameterize the base image:

```dockerfile
# Define the Python version as a build argument
ARG PYTHON_VERSION=3.11

# Use the argument in the FROM instruction
FROM python:${PYTHON_VERSION}-slim

# Note: ARGs defined before FROM are not available after FROM
# You need to re-declare them if needed later
ARG PYTHON_VERSION
RUN echo "Building with Python ${PYTHON_VERSION}"
```

Build with a different version:

```bash
# Override the default Python version at build time
docker build --build-arg PYTHON_VERSION=3.12 -t myapp .
```

## FROM scratch - Building from Nothing

The `scratch` image is an empty image with no filesystem at all. It is used for statically compiled binaries that do not need an operating system.

```dockerfile
# Build a static Go binary
FROM golang:1.22 AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Run from an empty image - the smallest possible container
FROM scratch
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```

Images built from scratch are often just a few megabytes. They have a minimal attack surface since there is literally nothing in the image except your binary.

## Best Practices Summary

1. **Pin your versions**: Use specific tags, not `latest`
2. **Use slim images for production**: Full images are for development
3. **Use multi-stage builds**: Keep your build tools out of the final image
4. **Prefer official images**: They are maintained and patched regularly
5. **Consider distroless for security-critical apps**: No shell means less attack surface
6. **Use ARG to parameterize FROM**: Makes it easy to switch base images
7. **Test Alpine compatibility**: Alpine uses musl libc which can break some packages
8. **Scan your base images**: Use `docker scout` or similar tools to check for vulnerabilities

```bash
# Scan an image for known vulnerabilities
docker scout cves python:3.11-slim
```

## Summary

The FROM instruction determines everything about your Docker image's foundation. Start with an official image, pin it to a specific version, and choose the right variant (full, slim, or alpine) based on your needs. Use multi-stage builds to separate build dependencies from runtime dependencies, and consider distroless images for production deployments where security is paramount. A well-chosen base image is the first step toward a secure, efficient, and maintainable container.

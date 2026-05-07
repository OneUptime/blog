# How to Use FROM Instruction Effectively in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, FROM, Base Images, Multi-Stage Build

Description: Master the FROM instruction in Podman Containerfiles to choose optimal base images, leverage multi-stage builds, and create secure, minimal container images.

---

> The FROM instruction is the foundation of every Containerfile. Choosing the right base image and using FROM effectively can make the difference between a bloated, insecure container and a lean, production-ready one.

A valid Containerfile must include a FROM instruction, though global ARG instructions can appear before the first FROM. It defines the base image that your container will be built upon, and it is arguably the most consequential decision you make when building a container image. The FROM instruction determines your image size, available system libraries, security surface area, and compatibility with your application.

In this guide, we will explore how to use the FROM instruction effectively in Podman, covering base image selection, tag strategies, multi-stage builds, and advanced patterns that will help you build better containers.

---

## Basic Syntax of FROM

The FROM instruction accepts an image name with an optional tag or digest:

```dockerfile
# Basic format

FROM <image>[:<tag>]

# With digest for exact pinning
FROM <image>@<digest>

# With a build stage name
FROM <image>[:<tag>] AS <name>
```

Here are some common examples:

```dockerfile
# Using a tag
FROM node:24-alpine

# Using a specific digest
FROM node@sha256:<64-character-digest>

# Naming a build stage
FROM golang:1.26-alpine AS builder
```

## Choosing the Right Base Image

The base image you select has cascading effects on everything that follows. Here are the main categories of base images and when to use each.

### Full Distribution Images

These include a complete Linux distribution with package managers and common utilities:

```dockerfile
# Ubuntu base
FROM ubuntu:24.04

# Fedora base with DNF
FROM fedora:42

RUN dnf install -y python3 python3-pip && dnf clean all
```

Use full distribution images when you need access to a wide range of system packages or when your application has complex native dependencies.

### Slim Variants

Slim images strip out documentation, extra locales, and uncommon packages:

```dockerfile
# Python slim
FROM python:3.12-slim

# Node slim
FROM node:24-slim
```

These are a good middle ground when you need a package manager but want to keep the image size reasonable.

### Alpine-Based Images

Alpine Linux uses musl libc and busybox, producing significantly smaller images:

```dockerfile
# Alpine base
FROM alpine:3.23

# Node on Alpine
FROM node:24-alpine

RUN apk add --no-cache python3 py3-pip
```

Alpine images are excellent for production but can cause issues with applications that depend on glibc-specific behavior. Always test thoroughly.

### Distroless Images

Distroless images contain only your application and its runtime dependencies, with no shell, package manager, or other OS utilities:

```dockerfile
# Distroless for Java
FROM gcr.io/distroless/java21-debian13

# Distroless for Node.js
FROM gcr.io/distroless/nodejs24-debian13

# Distroless static (for compiled binaries)
FROM gcr.io/distroless/static-debian13
```

Distroless images reduce the attack surface and are ideal for production deployments where you want only the required runtime files.

### Scratch (Empty Base)

The scratch image is a completely empty filesystem. Use it for statically compiled binaries:

```dockerfile
FROM scratch
COPY myapp /myapp
CMD ["/myapp"]
```

## Tag Strategies and Image Pinning

How you reference your base image affects the reproducibility and security of your builds.

```dockerfile
# Bad: 'latest' is mutable and can change unexpectedly
FROM python:latest

# Better: Major version tag
FROM python:3

# Good: Minor version tag
FROM python:3.12

# Better: Specific patch with variant
FROM python:3.12.3-slim

# Best: Pin by digest for full reproducibility
FROM python:3.12.3-slim@sha256:<64-character-digest>
```

For production images, pin at least to a minor version. For critical infrastructure, pin by digest. After pulling the image, you can find its digest using:

```bash
podman pull python:3.12.3-slim
podman image inspect --format '{{ .Digest }}' python:3.12.3-slim
```

Or list local images with digests:

```bash
podman images --digests python
```

## Multi-Stage Builds with FROM

Multi-stage builds use multiple FROM instructions to separate build-time dependencies from runtime dependencies. This is one of the most powerful features of modern Containerfiles.

```dockerfile
# Stage 1: Build the application
FROM rust:1.95-alpine AS builder

RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/
RUN cargo build --release

# Stage 2: Create the runtime image
FROM alpine:3.23

RUN apk add --no-cache ca-certificates
COPY --from=builder /app/target/release/myapp /usr/local/bin/myapp

USER 1001
CMD ["myapp"]
```

The final image contains only the compiled binary and Alpine, not the entire Rust toolchain.

### Copying from External Images

You can copy files from any image, not just previous stages:

```dockerfile
FROM alpine:3.23

# Copy a config file from the official nginx image
COPY --from=nginx:latest /etc/nginx/nginx.conf /nginx.conf
```

### Multiple Build Stages for Complex Applications

For applications with multiple components, you can use several build stages:

```dockerfile
# Stage 1: Build frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -o server .

# Stage 3: Final runtime image
FROM alpine:3.23
RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=backend-builder /backend/server .
COPY --from=frontend-builder /frontend/dist ./static/

USER 1001
EXPOSE 8080
CMD ["./server"]
```

## Using Build Arguments with FROM

You can parameterize the FROM instruction using ARG. ARG is the only instruction that can appear before FROM:

```dockerfile
ARG BASE_IMAGE=python
ARG BASE_TAG=3.12-slim

FROM ${BASE_IMAGE}:${BASE_TAG}

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["python", "app.py"]
```

Build with different base images without changing the Containerfile:

```bash
# Use the default base
podman build -t myapp .

# Use Alpine variant
podman build --build-arg BASE_TAG=3.12-alpine -t myapp:alpine .

# Use a different Python version
podman build --build-arg BASE_IMAGE=python --build-arg BASE_TAG=3.11-slim -t myapp:py311 .
```

## Platform-Specific FROM

When building for multiple architectures, you can specify the target platform:

```dockerfile
FROM --platform=linux/amd64 golang:1.26-alpine AS builder-amd64
WORKDIR /app
COPY . .
RUN GOARCH=amd64 go build -o app-amd64 .

FROM --platform=linux/arm64 golang:1.26-alpine AS builder-arm64
WORKDIR /app
COPY . .
RUN GOARCH=arm64 go build -o app-arm64 .
```

Or build multi-architecture images with Podman:

```bash
podman build --platform linux/amd64,linux/arm64 --manifest myapp .
```

If a build stage runs `RUN` instructions for a non-native architecture, Podman also needs emulation support such as `qemu-user-static`.

## Verifying and Inspecting Base Images

Before using a base image, inspect it to understand what you are building on:

```bash
podman pull node:24-alpine

# Check image configuration and size
podman image inspect node:24-alpine

# View image history (layers)
podman image history node:24-alpine

# Check for known vulnerabilities (requires external tools)
trivy image node:24-alpine
```

## Common Mistakes to Avoid

Here are patterns to watch out for when using FROM:

```dockerfile
# Mistake 1: Using latest tag
FROM ubuntu:latest  # Don't do this

# Mistake 2: Using unnecessarily large base images
FROM ubuntu:24.04   # When you only need a static binary
# Use scratch or distroless instead

# Mistake 3: Not using multi-stage builds
FROM golang:1.26
WORKDIR /app
COPY . .
RUN go build -o server .
CMD ["./server"]
# The Go toolchain is in the final image

# Mistake 4: Ignoring image update schedule
FROM python:3.12.3-slim  # Will never get 3.12.x updates automatically
# Use python:3.12-slim for automatic patch updates
```

## Conclusion

The FROM instruction sets the stage for everything in your Containerfile. Choose minimal base images appropriate for your runtime needs, pin versions for reproducibility, use multi-stage builds to separate build and runtime concerns, and leverage ARG to make your Containerfiles flexible. By making thoughtful decisions about your base images, you lay the groundwork for containers that are small, secure, and fast to build and deploy. Take the time to evaluate your base images regularly, as the ecosystem evolves and better options become available.

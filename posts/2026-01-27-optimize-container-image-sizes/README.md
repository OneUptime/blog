# How to Optimize Container Image Sizes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Kubernetes, Performance, CI/CD

Description: A comprehensive guide to reducing container image sizes through multi-stage builds, minimal base images, layer optimization, and other proven techniques that improve build times and deployment speed.

---

> "The best container image is the smallest one that still runs your application. Every megabyte you remove is bandwidth saved, attack surface reduced, and deployment time shortened."

## Why Container Image Size Matters

Large container images create a cascade of problems across your entire infrastructure. They slow down CI/CD pipelines, increase storage costs, extend deployment times, and expand your security attack surface. A 1GB image that could be 50MB is not just wasteful - it is actively working against your operational goals.

The good news is that optimizing container images follows predictable patterns. Once you understand these techniques, you can apply them to any language or framework.

## Multi-Stage Builds

Multi-stage builds are the single most effective technique for reducing image size. They let you use one image for building your application and a completely different image for running it. Build tools, compilers, and development dependencies never make it into your production image.

```dockerfile
# =============================================================================
# Stage 1: Build Environment
# This stage contains all the tools needed to compile and build the application
# None of these tools will exist in the final production image
# =============================================================================
FROM node:20-bullseye AS builder

# Set the working directory for the build
WORKDIR /app

# Copy package files first to leverage Docker layer caching
# If these files do not change, npm ci will use the cached layer
COPY package.json package-lock.json ./

# Install ALL dependencies including devDependencies for building
# npm ci ensures reproducible builds by using exact versions from lock file
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the production-optimized application
# This creates the dist/ folder with compiled assets
RUN npm run build

# =============================================================================
# Stage 2: Production Runtime
# This stage contains only what is needed to run the application
# No build tools, no source code, no devDependencies
# =============================================================================
FROM node:20-alpine AS production

# Set NODE_ENV to production for optimized runtime behavior
ENV NODE_ENV=production

WORKDIR /app

# Copy only production package files
COPY package.json package-lock.json ./

# Install only production dependencies (devDependencies are excluded)
# --ignore-scripts prevents running postinstall scripts that may need dev tools
RUN npm ci --omit=dev --ignore-scripts

# Copy the built application from the builder stage
# Only the compiled output is transferred, not the source code
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
# node:alpine includes a 'node' user with UID 1000
USER node

# Start the application
CMD ["node", "dist/index.js"]
```

This approach can reduce a Node.js image from 1GB+ to under 150MB. The build stage has everything needed for compilation, while the production stage has only the runtime.

## Minimal Base Images

Your choice of base image has an enormous impact on final size. Here is a comparison of common base images:

| Base Image | Size | Use Case |
|------------|------|----------|
| ubuntu:22.04 | ~77MB | Full OS, maximum compatibility |
| debian:bookworm-slim | ~74MB | Slimmed Debian, good compatibility |
| alpine:3.19 | ~7MB | Minimal Linux, musl libc |
| gcr.io/distroless/static | ~2MB | Static binaries only |
| scratch | 0MB | Absolute minimum, no OS |

```dockerfile
# =============================================================================
# Using Alpine for interpreted languages
# Alpine uses musl libc instead of glibc - test compatibility with your deps
# =============================================================================
FROM python:3.12-alpine

# Alpine uses apk instead of apt-get
# --no-cache prevents storing the package index (saves space)
# --virtual creates a named group for easy removal of build dependencies later
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    libffi-dev

WORKDIR /app
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Remove build dependencies that are no longer needed at runtime
# This removes all packages installed with --virtual .build-deps
RUN apk del .build-deps

COPY . .
CMD ["python", "app.py"]
```

For compiled languages like Go or Rust, you can use even smaller bases.

```dockerfile
# =============================================================================
# Go application with scratch base (0 bytes)
# This works because Go can produce fully static binaries
# =============================================================================
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build a completely static binary with no external dependencies
# CGO_ENABLED=0: Disable C bindings (required for static binary)
# -ldflags="-s -w": Strip debug info (-s) and DWARF tables (-w)
# -trimpath: Remove file system paths from binary (reproducibility)
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /app/server .

# =============================================================================
# Scratch is an empty image - literally 0 bytes
# Only works with static binaries that need no external libraries
# =============================================================================
FROM scratch

# Copy CA certificates for HTTPS (scratch has none by default)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the static binary
COPY --from=builder /app/server /server

# Run as non-root (UID 10001 is arbitrary but non-zero)
USER 10001:10001

ENTRYPOINT ["/server"]
```

## Layer Optimization

Docker images are composed of layers, and understanding how layers work is essential for optimization. Each instruction in a Dockerfile creates a new layer. Layers are cached and reused when possible, but they also accumulate size.

```dockerfile
# =============================================================================
# BAD: Each RUN creates a separate layer
# Even though we delete files, the layer that created them still exists
# Total size includes all intermediate states
# =============================================================================
FROM ubuntu:22.04

# Layer 1: Downloads ~100MB of package lists
RUN apt-get update

# Layer 2: Installs packages (adds to total)
RUN apt-get install -y curl wget git

# Layer 3: Deletes lists, but Layer 1 still has them!
RUN rm -rf /var/lib/apt/lists/*

# =============================================================================
# GOOD: Single RUN with cleanup in the same layer
# Intermediate files are deleted before the layer is committed
# Only the final state is saved to the layer
# =============================================================================
FROM ubuntu:22.04

# All operations in one layer - cleanup happens before layer commit
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        wget \
        git && \
    # Clean up in the same layer so deleted files are not stored
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

Order your Dockerfile instructions from least-changed to most-changed. This maximizes cache reuse.

```dockerfile
# =============================================================================
# Optimal layer ordering for cache efficiency
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# 1. System dependencies (rarely change)
RUN apk add --no-cache tini

# 2. Dependency manifests (change occasionally)
COPY package.json package-lock.json ./

# 3. Install dependencies (cached unless manifests change)
RUN npm ci --omit=dev

# 4. Application code (changes frequently)
# This layer rebuilds often, but steps 1-3 stay cached
COPY . .

# Use tini as init process to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
```

## Using .dockerignore

A `.dockerignore` file prevents unnecessary files from being sent to the Docker daemon during builds. This speeds up builds and prevents accidentally including sensitive or large files.

```dockerignore
# =============================================================================
# .dockerignore - Files to exclude from Docker build context
# =============================================================================

# Version control
.git
.gitignore

# Dependencies (will be installed fresh in the container)
node_modules
vendor
__pycache__
*.pyc
.venv
venv

# Build outputs (will be rebuilt in container)
dist
build
*.egg-info

# IDE and editor files
.vscode
.idea
*.swp
*.swo
*~

# Testing and development
coverage
.pytest_cache
.nyc_output
*.test.js
*.spec.js
test
tests
__tests__

# Documentation
docs
*.md
!README.md

# CI/CD configuration (not needed in image)
.github
.gitlab-ci.yml
Jenkinsfile
.travis.yml

# Docker files (prevent recursive context issues)
Dockerfile*
docker-compose*.yml
.docker

# Environment and secrets (NEVER include these)
.env
.env.*
*.pem
*.key
secrets

# Logs and temporary files
logs
*.log
tmp
temp
```

Without a `.dockerignore`, the entire directory is sent to the daemon. For a project with a large `node_modules` or `.git` folder, this can mean sending gigabytes of unnecessary data.

## Removing Unnecessary Files

Beyond the `.dockerignore`, actively remove files that make it into your image but are not needed at runtime.

```dockerfile
# =============================================================================
# Aggressively remove unnecessary files
# =============================================================================
FROM python:3.12-slim

WORKDIR /app

# Install dependencies and clean up in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 && \
    apt-get clean && \
    rm -rf \
        /var/lib/apt/lists/* \
        /var/cache/apt/archives/* \
        /usr/share/doc/* \
        /usr/share/man/* \
        /usr/share/locale/* \
        /root/.cache

COPY requirements.txt .

# Install Python packages without caching wheel files
# --no-cache-dir prevents pip from storing downloaded packages
RUN pip install --no-cache-dir -r requirements.txt && \
    # Remove pip cache and unnecessary package files
    rm -rf /root/.cache/pip && \
    # Find and remove Python cache files
    find /usr/local/lib/python3.12 -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && \
    # Remove .pyc files
    find /usr/local/lib/python3.12 -name "*.pyc" -delete

COPY . .

CMD ["python", "app.py"]
```

Common files to remove include documentation, man pages, locale data, package manager caches, and test files from dependencies.

## Static Binaries

For compiled languages, producing static binaries gives you the most flexibility in choosing minimal base images. A static binary has all dependencies linked in and needs no shared libraries.

```dockerfile
# =============================================================================
# Rust static binary with musl
# Produces a fully static executable that runs on any Linux
# =============================================================================
FROM rust:1.75-alpine AS builder

# Install musl-dev for static linking
RUN apk add --no-cache musl-dev

# Add the musl target for fully static binaries
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app

# Cache dependencies by building with empty main first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl && \
    rm -rf src

# Build the real application
COPY src ./src
RUN touch src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl && \
    # Strip the binary to remove debug symbols
    strip /app/target/x86_64-unknown-linux-musl/release/myapp

# =============================================================================
# Final image using scratch (0 bytes base)
# =============================================================================
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the static binary
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /myapp

USER 10001:10001
ENTRYPOINT ["/myapp"]
```

This approach produces images under 10MB for most applications.

## Distroless Images

Distroless images from Google contain only your application and its runtime dependencies. They have no shell, no package manager, and no other programs. This dramatically reduces both size and attack surface.

```dockerfile
# =============================================================================
# Java application with distroless
# =============================================================================
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app
COPY . .

# Build the application (using Gradle in this example)
RUN ./gradlew build --no-daemon

# Extract layers for better caching (Spring Boot feature)
RUN java -Djarmode=layertools -jar build/libs/*.jar extract

# =============================================================================
# Distroless Java runtime
# Contains only JRE and CA certificates - no shell, no package manager
# =============================================================================
FROM gcr.io/distroless/java21-debian12

WORKDIR /app

# Copy extracted layers in order of change frequency
# Spring Boot layers: dependencies, spring-boot-loader, snapshot-deps, application
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./

# Distroless has a nonroot user at UID 65532
USER nonroot:nonroot

# JVM options for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Available distroless images include:
- `gcr.io/distroless/static` - For static binaries
- `gcr.io/distroless/base` - For dynamically linked binaries
- `gcr.io/distroless/java21` - Java 21 runtime
- `gcr.io/distroless/python3` - Python 3 runtime
- `gcr.io/distroless/nodejs20` - Node.js 20 runtime

## Best Practices Summary

1. **Use multi-stage builds** - Separate build and runtime environments. Build tools should never reach production.

2. **Choose minimal base images** - Alpine for interpreted languages, distroless or scratch for compiled languages.

3. **Optimize layer ordering** - Put rarely-changed instructions first to maximize cache hits.

4. **Combine RUN commands** - Delete temporary files in the same layer that creates them.

5. **Use .dockerignore** - Exclude version control, dependencies, tests, and documentation from the build context.

6. **Remove unnecessary files** - Delete documentation, caches, and locale data after installation.

7. **Build static binaries** - For compiled languages, static linking enables the smallest possible images.

8. **Strip debug symbols** - Use compiler flags to remove debugging information from production binaries.

9. **Run as non-root** - Always specify a non-root USER for security.

10. **Scan your images** - Use tools like Trivy or Grype to find CVEs and unnecessary packages.

---

Optimizing container images is not about achieving the smallest possible size at any cost. It is about finding the right balance between size, security, and maintainability for your specific use case. Start with multi-stage builds and minimal base images - these two techniques alone will solve most size problems.

Monitor your image sizes as part of your CI/CD pipeline and set alerts when images grow unexpectedly. [OneUptime](https://oneuptime.com) can help you track deployment metrics and catch regressions before they impact your users.

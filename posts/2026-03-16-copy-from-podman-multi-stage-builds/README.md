# How to Use COPY --from in Podman Multi-Stage Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Multi-Stage

Description: Learn how to use COPY --from in Podman multi-stage builds to selectively copy artifacts between build stages, producing minimal production images.

---

> COPY --from lets you cherry-pick files from build stages or external images, keeping your final image free of build tools and dependencies.

Multi-stage builds are a core technique for creating small, efficient container images. The `COPY --from` instruction is what makes them work by allowing you to copy specific files from one build stage into another. This guide covers all the ways to use this powerful feature in Podman.

---

## Basic Multi-Stage Build with COPY --from

The simplest use case is compiling code in one stage and copying the binary to a minimal runtime stage.

```bash
mkdir -p ~/multistage-demo && cd ~/multistage-demo

cat > main.go <<'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello from a multi-stage build!")
}
EOF

cat > go.mod <<'EOF'
module multistage-demo
go 1.22
EOF

cat > Containerfile <<'EOF'
# Stage 1: Build the application

FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod main.go ./
RUN go build -o /app main.go

# Stage 2: Create the runtime image
FROM alpine:3.19
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

podman build -t multistage-demo:latest .
podman run --rm multistage-demo:latest
```

## Referencing Stages by Name vs Index

You can reference build stages by their name (defined with `AS`) or by their zero-based index.

```bash
cat > Containerfile <<'EOF'
# Stage 0 (also named "deps")
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 1 (also named "builder")
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 2: Final image
FROM nginx:alpine
# Reference by name (preferred - more readable)
COPY --from=builder /app/dist /usr/share/nginx/html

# Reference by index (also works, less readable)
# COPY --from=1 /app/dist /usr/share/nginx/html
EOF

podman build -t webapp:latest .
```

Using named stages is strongly recommended for readability and maintainability.

## Copying from External Images

`COPY --from` can reference any image, not just stages in your Containerfile.

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.19

# Copy a self-contained tool from the BusyBox image
COPY --from=busybox:1.36 /bin/busybox /usr/local/bin/busybox

# Copy a release metadata file from a Debian image
COPY --from=debian:bookworm /etc/debian_version /tmp/debian_version

CMD ["busybox", "cat", "/tmp/debian_version"]
EOF

podman build -t from-external:latest .
podman run --rm from-external:latest
```

This is useful for pulling specific tools or files without installing them through a package manager.

## Copying Files Between Multiple Stages

You can chain multiple stages and selectively copy artifacts through the pipeline.

```bash
cat > Containerfile <<'EOF'
# Stage 1: Download and verify a binary
FROM alpine:3.19 AS downloader
RUN apk add --no-cache curl gnupg
RUN curl -LO https://github.com/stedolan/jq/releases/download/jq-1.7.1/jq-linux-amd64 && \
    chmod +x jq-linux-amd64 && \
    mv jq-linux-amd64 /usr/local/bin/jq

# Stage 2: Build application config
FROM alpine:3.19 AS config-builder
RUN apk add --no-cache gettext-envsubst
RUN printf '{"app": "${APP_NAME}", "version": "${APP_VERSION}"}\n' > /tmp/config.template.json && \
    mkdir -p /etc/app && \
    APP_NAME=demo APP_VERSION=1.0 envsubst < /tmp/config.template.json > /etc/app/config.json

# Stage 3: Final image pulls from both stages
FROM alpine:3.19
COPY --from=downloader /usr/local/bin/jq /usr/local/bin/jq
COPY --from=config-builder /etc/app/config.json /etc/app/config.json
CMD ["jq", ".", "/etc/app/config.json"]
EOF
```

## Copying Directories

You can copy entire directories, not just individual files.

```bash
cat > Containerfile <<'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Copy the entire build output directory
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Copy with a specific ownership
COPY --from=builder --chown=nginx:nginx /app/dist/ /usr/share/nginx/html/
EOF
```

## Using COPY --from with --chmod

Set file permissions during the copy operation.

```bash
cat > Containerfile <<'EOF'
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN go build -o /app

FROM alpine:3.19
# Copy with specific permissions
COPY --from=builder --chmod=755 /app /usr/local/bin/app
CMD ["app"]
EOF
```

## Selective Copying for Minimal Images

Only copy what you need to keep the final image small.

```bash
cat > Containerfile <<'EOF'
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

COPY . .

FROM python:3.12-slim
# Copy only the installed packages, not pip cache or build tools
COPY --from=builder /install /usr/local
COPY --from=builder /app /app
WORKDIR /app
CMD ["python", "app.py"]
EOF
```

## Debugging Multi-Stage Builds

Build a specific stage to debug it.

```bash
# Build only the builder stage
podman build --target builder -t debug:builder .

# Run the builder stage to inspect it
podman run --rm -it debug:builder /bin/sh

# Check what files are available to copy
podman run --rm debug:builder ls -la /app/dist/
podman run --rm debug:builder find /app -name "*.js" -type f
```

## Common Patterns

### Pattern 1: Build Tools Separation

```bash
cat > Containerfile <<'EOF'
FROM rust:1.77 AS builder
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /src/target/release/myapp /usr/local/bin/
CMD ["myapp"]
EOF
```

### Pattern 2: Static Asset Pipeline

```bash
cat > Containerfile <<'EOF'
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM golang:1.22-alpine AS backend
WORKDIR /backend
COPY backend/ .
RUN go build -o /server

FROM alpine:3.19
COPY --from=backend /server /usr/local/bin/server
COPY --from=frontend /frontend/dist /var/www/static
CMD ["server"]
EOF
```

## Summary

`COPY --from` is the cornerstone of multi-stage builds in Podman. It lets you reference named stages, stage indexes, or external images to selectively copy artifacts into your final image. Use named stages for clarity, copy only what you need, and chain multiple stages to create a clean separation between build-time and runtime dependencies. This produces smaller, more secure container images.

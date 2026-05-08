# How to Reduce Image Size with Podman Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Image Optimization

Description: Learn practical techniques to reduce container image sizes with Podman, from choosing minimal base images to multi-stage builds and layer optimization.

---

> Smaller container images mean faster pulls, faster deployments, reduced storage costs, and a smaller attack surface.

Large container images slow down CI/CD pipelines, increase registry storage costs, and take longer to deploy. This guide covers proven techniques to shrink your Podman images from hundreds of megabytes down to just a few.

---

## Check Your Current Image Size

Start by measuring what you have.

```bash
# List images with sizes

podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

# Get detailed size information
podman system df

# See size of each layer in an image
podman history myapp:latest
```

## 1. Choose a Minimal Base Image

The base image is often the largest part of your image.

```bash
# Compare base image sizes
podman pull ubuntu:22.04
podman pull debian:bookworm-slim
podman pull alpine:3.19
podman pull gcr.io/distroless/static-debian12

podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
  | grep -E "(ubuntu|debian|alpine|distroless/static-debian12)"

# Typical sizes:
# ubuntu:22.04            ~77MB
# debian:bookworm-slim    ~74MB
# alpine:3.19             ~7MB
# distroless/static       ~2MB
```

Switch to Alpine or distroless when possible:

```bash
# Before: Ubuntu-based (large)
cat > Containerfile.ubuntu <<'EOF'
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
COPY app.py /app/
CMD ["python3", "/app/app.py"]
EOF

# After: Alpine-based (small)
cat > Containerfile.alpine <<'EOF'
FROM python:3.12-alpine
COPY app.py /app/
CMD ["python3", "/app/app.py"]
EOF
```

## 2. Use Multi-Stage Builds

Keep build tools out of your final image.

```bash
cat > Containerfile <<'EOF'
# Build stage: includes compiler, headers, dev tools
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app

# Runtime stage: minimal image with just the binary
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

podman build -t myapp:latest .
podman images myapp:latest
```

## 3. Clean Up in the Same Layer

Files deleted in a subsequent layer still exist in the image. Always clean up in the same `RUN` instruction.

```bash
# BAD: Cleanup in a separate layer (files still in previous layer)
RUN apt-get update && apt-get install -y gcc make
RUN make build
RUN apt-get remove -y gcc make && apt-get clean

# GOOD: All in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc make && \
    make build && \
    apt-get remove -y gcc make && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

## 4. Use --no-install-recommends

On Debian/Ubuntu, prevent unnecessary recommended packages from being installed.

```bash
# Without: installs recommended packages (~200MB extra)
RUN apt-get install -y python3

# With: installs only what is required (~50MB saved)
RUN apt-get install -y --no-install-recommends python3
```

## 5. Remove Package Manager Caches

```bash
# Alpine
RUN apk add --no-cache curl wget

# Debian/Ubuntu
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Fedora/RHEL
RUN dnf install -y curl && \
    dnf clean all && \
    rm -rf /var/cache/dnf

# Python pip
RUN pip install --no-cache-dir -r requirements.txt

# Node.js npm
RUN npm ci --omit=dev && npm cache clean --force
```

## 6. Use .containerignore

Prevent unnecessary files from entering the build context.

```bash
cat > .containerignore <<'EOF'
.git
.gitignore
node_modules
*.md
tests/
coverage/
.env*
*.log
.vscode/
.idea/
Containerfile
.containerignore
dist/
build/
EOF
```

## 7. Minimize Layers

Combine related commands into fewer RUN instructions.

```bash
# BAD: Many layers
RUN apk add curl
RUN apk add wget
RUN apk add jq
RUN mkdir /app
RUN mkdir /data

# GOOD: Single layer
RUN apk add --no-cache curl wget jq && \
    mkdir -p /app /data
```

## 8. Use Static Binaries with Scratch or Distroless

For compiled languages, you can use the empty `scratch` image.

```bash
cat > Containerfile <<'EOF'
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app

FROM scratch
COPY --from=builder /app /app
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/app"]
EOF

# This produces an image that is just your binary + CA certs
podman build -t myapp:scratch .
podman images myapp:scratch
# Typically just 5-15MB
```

## 9. Strip Debug Symbols

For compiled binaries, remove debug information.

```bash
# Go: Use ldflags to strip
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app
# -s removes symbol table
# -w removes DWARF debug info

# C/C++: Strip the binary
RUN gcc -O2 -o app main.c && strip app

# Rust: Build in release mode and strip
RUN cargo build --release
RUN strip target/release/myapp
```

## 10. Squash Layers

Use Podman's squash option to flatten layers.

```bash
# Squash new layers (keep base image layers)
podman build --squash -t myapp:squashed .

# Squash everything into one layer
podman build --squash-all -t myapp:flat .
```

## Putting It All Together

A complete optimized Containerfile:

```bash
cat > Containerfile <<'EOF'
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER node
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
EOF

podman build -t myapp:optimized .
```

## Measuring the Improvement

```bash
# Compare before and after
podman build -f Containerfile.original -t myapp:original .
podman build -f Containerfile.optimized -t myapp:optimized .

podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
  --filter "reference=myapp"

# Use dive to analyze layers (if installed)
# dive myapp:optimized
```

## Summary

Reducing image size is a combination of choosing minimal base images, using multi-stage builds, cleaning up in the same layer, excluding unnecessary files, and stripping binaries. Start with the biggest wins first: switch to Alpine or distroless base images and implement multi-stage builds. Then fine-tune with cache cleanup, `.containerignore`, and layer squashing. These techniques routinely reduce images from 1GB+ down to under 50MB.

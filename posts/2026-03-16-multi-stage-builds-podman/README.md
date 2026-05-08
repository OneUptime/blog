# How to Use Multi-Stage Builds with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Multi-Stage, Optimization

Description: Learn how to use multi-stage builds in Podman to create smaller, more secure container images by separating build and runtime environments.

---

> Multi-stage builds produce dramatically smaller images by discarding build tools and intermediate files from the final image.

Multi-stage builds let you use multiple FROM statements in a single Containerfile, each starting a new build stage. You can copy artifacts from one stage to another while leaving behind everything you do not need. This results in smaller, more secure production images. This guide demonstrates practical multi-stage build patterns with Podman.

---

## Why Multi-Stage Builds Matter

Without multi-stage builds, you either ship build tools in your production image (bloated) or maintain separate Containerfiles (complex). Multi-stage builds solve both problems.

```bash
# Single-stage build: large image with build tools

# Resulting image includes Go compiler, source code, and binary

# Multi-stage build: tiny image with only the binary
# Resulting image includes only the compiled binary
```

## Basic Multi-Stage Build

A Go application is the classic example of multi-stage builds.

```bash
mkdir -p ~/go-app && cd ~/go-app

cat > main.go << 'EOF'
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Podman multi-stage build")
    })
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
EOF

cat > go.mod << 'EOF'
module myapp
go 1.26
EOF

cat > Containerfile << 'EOF'
# Stage 1: Build
FROM docker.io/library/golang:1.26 AS builder
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /app main.go

# Stage 2: Runtime
FROM docker.io/library/alpine:latest
COPY --from=builder /app /usr/local/bin/app
EXPOSE 8080
CMD ["app"]
EOF

# Build the multi-stage image
podman build -t go-app:latest .

# Compare sizes
podman images | grep -E "golang|go-app|alpine"
# golang    1.26    abc123  1.2 GB
# go-app    latest  def456  12 MB
# alpine    latest  ghi789  7.8 MB
```

## Node.js Multi-Stage Build

Separate the dependency installation and build from the runtime.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Install dependencies and build
FROM docker.io/library/node:24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM docker.io/library/node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
EOF

podman build -t node-app:latest .
```

## Python Multi-Stage Build

Use a builder stage to install dependencies, then copy the virtual environment to the same path in a matching runtime image.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Build dependencies
FROM docker.io/library/python:3.14 AS builder
WORKDIR /app
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM docker.io/library/python:3.14-slim
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY . .

USER nobody
CMD ["python", "app.py"]
EOF

podman build -t py-app:latest .
```

## Rust Multi-Stage Build

Rust is another language that benefits greatly from multi-stage builds.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Build the Rust binary
FROM docker.io/library/rust:1.94 AS builder
WORKDIR /usr/src/myapp
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

# Stage 2: Minimal runtime image
FROM docker.io/library/debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/myapp/target/release/myapp /usr/local/bin/
CMD ["myapp"]
EOF

podman build -t rust-app:latest .
```

## Three-Stage Build Pattern

Use three stages for complex applications: dependencies, build, and runtime.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Dependencies
FROM docker.io/library/node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM docker.io/library/node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm run test

# Stage 3: Production runtime
FROM docker.io/library/node:24-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm prune --omit=dev

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
EOF

podman build -t three-stage-app:latest .
```

## Copying from External Images

You can copy files from any image, not just previous build stages.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

# Copy a binary from an external image
COPY --from=docker.io/library/busybox:latest /bin/busybox /usr/local/bin/busybox

# Copy from another external image
COPY --from=docker.io/library/redis:7 /usr/local/bin/redis-cli /usr/local/bin/redis-cli

CMD ["sh"]
EOF

podman build -t tools:latest .
```

## Verifying Image Size Reduction

Compare single-stage vs multi-stage builds.

```bash
# Single-stage Containerfile
cat > Containerfile.single << 'EOF'
FROM docker.io/library/golang:1.26
WORKDIR /src
COPY . .
RUN go build -o /app main.go
CMD ["/app"]
EOF

# Multi-stage Containerfile
cat > Containerfile.multi << 'EOF'
FROM docker.io/library/golang:1.26 AS builder
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /app main.go

FROM docker.io/library/alpine:latest
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build both
podman build -f Containerfile.single -t single-stage:latest .
podman build -f Containerfile.multi -t multi-stage:latest .

# Compare sizes
podman images | grep -E "single-stage|multi-stage"
# single-stage  latest  ...  1.2 GB
# multi-stage   latest  ...  12 MB
```

## Summary

Multi-stage builds are one of the most impactful optimizations for container images. They separate build-time dependencies from runtime requirements, producing smaller and more secure images. Use named stages for clarity, copy only the artifacts you need, and consider using minimal base images like Alpine or distroless for your final stage. Podman handles multi-stage builds identically to Docker, so existing patterns translate directly.

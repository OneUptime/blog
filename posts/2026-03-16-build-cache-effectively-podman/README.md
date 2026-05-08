# How to Use Build Cache Effectively with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Cache, Performance

Description: Learn how to optimize Podman build times by structuring Containerfiles for effective layer caching, reducing rebuilds and speeding up CI/CD pipelines.

---

> Effective build caching can reduce image build times from minutes to seconds by reusing unchanged layers.

Build instructions such as `RUN`, `COPY`, and `ADD` create new layers. Podman caches these layers and reuses them when the instruction and its context have not changed. Understanding how to structure your Containerfile to maximize cache hits is one of the most impactful build optimizations. This guide covers practical strategies for effective build caching with Podman.

---

## How Podman Build Cache Works

Podman evaluates each instruction against its cache. If the instruction, base layer, and relevant files have not changed, the cached layer is reused. If any instruction invalidates the cache, all subsequent layers are rebuilt.

```bash
# Build an image for the first time (no cache)

podman build -t myapp:latest .
# Each step shows: --> abc123def456 (newly built)

# Build again without changes (fully cached)
podman build -t myapp:latest .
# Each step shows: --> Using cache abc123def456
```

## The Cache Invalidation Chain

When one layer's cache is invalidated, every layer after it is also rebuilt.

```bash
# BAD: Copying all files early invalidates cache for everything below
cat > Containerfile.bad << 'EOF'
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "dist/server.js"]
EOF

# GOOD: Copy dependency files first, then source code
cat > Containerfile.good << 'EOF'
FROM docker.io/library/node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]
EOF
```

In the good version, changing application code does not invalidate the `npm ci` layer because `package.json` has not changed.

## Ordering Instructions for Cache Efficiency

Place instructions from least frequently changed to most frequently changed.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

# 1. System dependencies (rarely change)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# 2. Python dependencies (change occasionally)
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Configuration files (change sometimes)
COPY config/ ./config/

# 4. Application code (changes frequently)
COPY src/ ./src/

# 5. Build step (depends on code changes)
RUN python -m compileall src/

CMD ["python", "src/main.py"]
EOF
```

## Separating Dependency Installation

The most important caching pattern is separating dependency definitions from application code.

```bash
# Go application
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.22

WORKDIR /src

# Copy dependency files first
COPY go.mod go.sum ./
RUN go mod download

# Then copy source code
COPY . .
RUN go build -o /app .

CMD ["/app"]
EOF
```

```bash
# Rust application
cat > Containerfile << 'EOF'
FROM docker.io/library/rust:1.77

WORKDIR /usr/src/app

# Copy manifests first
COPY Cargo.toml Cargo.lock ./

# Create a dummy main to cache dependency compilation
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm src/main.rs

# Copy actual source
COPY src ./src

# Touch main.rs to trigger rebuild of our code only
RUN touch src/main.rs
RUN cargo build --release

CMD ["./target/release/app"]
EOF
```

## Combining RUN Instructions

Combine related RUN instructions to reduce layers while keeping cache-friendly boundaries.

```bash
# BAD: Too many layers, each with small changes
cat > Containerfile.bad << 'EOF'
FROM docker.io/library/ubuntu:24.04
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*
EOF

# GOOD: Combined into one layer
cat > Containerfile.good << 'EOF'
FROM docker.io/library/ubuntu:24.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl vim git && \
    rm -rf /var/lib/apt/lists/*
EOF
```

## Using .containerignore for Cache Consistency

Exclude files that change frequently but are not needed in the build to prevent unnecessary cache invalidation.

```bash
# Create .containerignore
cat > .containerignore << 'EOF'
.git
.gitignore
node_modules
*.md
.env
.vscode
coverage/
test/
EOF
```

Without this file, changes to `.git` metadata, README files, or test files would invalidate the COPY cache.

## Verifying Cache Usage

Check whether your builds are using the cache effectively.

```bash
# Build and observe cache hits
podman build -t myapp:latest . 2>&1 | grep -E "STEP|cache|Using"

# Time your builds to measure cache effectiveness
time podman build -t myapp:latest .
# First build: 45 seconds
# Cached build after code change: 8 seconds
# Fully cached build: 2 seconds

# Check layer sizes
podman history myapp:latest
```

## Preserving Cache Across CI Builds

In CI/CD, the cache is often lost between builds. Use these strategies to preserve it.

```bash
# Strategy 1: Use a remote cache repository
podman build \
  --layers \
  --cache-from=myregistry.example.com/myapp-cache \
  --cache-to=myregistry.example.com/myapp-cache \
  -t myapp:latest .

# Strategy 2: Push the final image separately
podman push myapp:latest myregistry.example.com/myapp:latest
```

## Mount Cache for Package Managers

Use RUN mount options to cache package manager data between builds.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
EOF

podman build -t cached-pip:latest .
```

```bash
# For apt
cat > Containerfile << 'EOF'
FROM docker.io/library/ubuntu:24.04
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    apt-get update && apt-get install -y --no-install-recommends curl vim git
EOF
```

## Summary

Effective build caching is about understanding the invalidation chain and structuring your Containerfile accordingly. Copy dependency files before source code, order instructions from least to most frequently changed, combine related RUN commands, and use `.containerignore` to exclude irrelevant files. These practices can reduce build times by an order of magnitude, which adds up significantly in CI/CD pipelines with frequent builds.

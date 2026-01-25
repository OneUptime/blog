# How to Debug Docker Image Build Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Debugging, DevOps, CI/CD, Build

Description: A systematic approach to diagnosing and fixing Docker image build failures, from syntax errors to network issues and layer caching problems.

---

Docker builds fail for many reasons: syntax errors, missing files, network timeouts, or permission issues. The error messages can be cryptic, especially with BuildKit's new output format. This guide walks through a systematic debugging approach that gets you to the root cause quickly.

## Understanding Build Output

Docker BuildKit changed how build output is displayed. Here is how to get more verbose output when debugging:

```bash
# Enable plain progress output for readable error messages
docker build --progress=plain -t myapp:debug .

# Disable BuildKit for classic output format
DOCKER_BUILDKIT=0 docker build -t myapp:debug .

# Enable maximum verbosity with BuildKit
docker build --progress=plain --no-cache -t myapp:debug .
```

## Debugging Syntax Errors

The most common build failures are Dockerfile syntax errors. Docker validates syntax before building.

```dockerfile
# WRONG: Missing instruction keyword
FROM node:18-alpine
/app                          # This will fail - missing WORKDIR

# CORRECT: Include the instruction
FROM node:18-alpine
WORKDIR /app
```

To validate syntax without building:

```bash
# Use hadolint for Dockerfile linting
docker run --rm -i hadolint/hadolint < Dockerfile

# Check specific rules
docker run --rm -i hadolint/hadolint --ignore DL3018 < Dockerfile
```

Common syntax issues:

```dockerfile
# WRONG: Backslash at end without continuation
RUN apt-get update && \
    apt-get install -y curl \

# CORRECT: No trailing backslash on last line
RUN apt-get update && \
    apt-get install -y curl
```

## Debugging Layer Failures

When a specific layer fails, isolate it by building up to that point:

```bash
# Build up to a specific stage
docker build --target=builder -t myapp:builder .

# If using line numbers from error, add a debug target
```

Add debug targets to your Dockerfile:

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package*.json ./
# Build stops here if npm install fails
RUN npm ci

# Add a debug target to inspect the state
FROM dependencies AS debug
RUN ls -la /app
RUN cat package.json

FROM dependencies AS builder
COPY . .
RUN npm run build
```

```bash
# Build the debug target to inspect state
docker build --target=debug -t myapp:debug .
```

## Interactive Debugging with Intermediate Images

BuildKit creates intermediate images you can inspect:

```bash
# Build with BuildKit and keep intermediate layers
DOCKER_BUILDKIT=1 docker build -t myapp:debug .

# Find the failing layer ID from output
# "ERROR: process "/bin/sh -c npm ci" did not complete successfully"

# Run an interactive shell in the previous successful layer
docker run --rm -it <previous-layer-sha> sh
```

For classic builds, use the `--rm=false` flag:

```bash
# Keep containers from failed builds
DOCKER_BUILDKIT=0 docker build --rm=false -t myapp:debug .

# Find the failed container
docker ps -a | head -5

# Start shell in the failed container
docker commit <container-id> debug-image
docker run --rm -it debug-image sh
```

## Debugging Network Issues

Network problems during build often manifest as timeouts or DNS failures:

```bash
# Test network from build context
docker build --network=host -t myapp:debug .

# Add debugging to Dockerfile
```

```dockerfile
FROM node:18-alpine

# Debug network connectivity
RUN ping -c 2 registry.npmjs.org || echo "Cannot reach npm registry"
RUN nslookup registry.npmjs.org || echo "DNS resolution failed"

# Show proxy settings if any
RUN env | grep -i proxy || echo "No proxy configured"

WORKDIR /app
COPY package*.json ./
RUN npm ci
```

Common network fixes:

```bash
# Use custom DNS
docker build --dns=8.8.8.8 -t myapp:debug .

# Pass proxy settings as build args
docker build \
  --build-arg HTTP_PROXY=$HTTP_PROXY \
  --build-arg HTTPS_PROXY=$HTTPS_PROXY \
  -t myapp:debug .
```

## Debugging Permission Errors

Permission issues often occur with mounted volumes or when switching users:

```dockerfile
FROM node:18-alpine

# Create app directory with correct ownership
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app

# Copy files as root, then fix permissions
COPY --chown=node:node package*.json ./

# Switch to non-root user before npm install
USER node
RUN npm ci

# Debug: Show current user and permissions
RUN whoami && ls -la /app
```

For debugging permission issues:

```bash
# Check file ownership in build context
ls -la .

# Build with verbose output
docker build --progress=plain -t myapp:debug . 2>&1 | tee build.log

# Search for permission errors
grep -i "permission\|denied\|EACCES" build.log
```

## Debugging COPY and ADD Failures

File copy operations fail when files do not exist or are excluded by `.dockerignore`:

```bash
# Check what files are in the build context
docker build -f - . <<EOF
FROM alpine
COPY . /context
RUN find /context -type f | head -50
EOF

# Check .dockerignore
cat .dockerignore
```

Common COPY issues:

```dockerfile
# WRONG: Source outside build context
COPY ../shared/lib /app/lib

# CORRECT: Everything must be inside build context
COPY shared/lib /app/lib

# WRONG: Case sensitivity issue on Linux
COPY README.md /docs/  # File might be readme.md

# DEBUG: List actual files
RUN ls -la /app || echo "Directory listing failed"
```

## Debugging Cache Issues

Sometimes builds fail due to stale cache. Force a fresh build:

```bash
# Disable cache entirely
docker build --no-cache -t myapp:debug .

# Invalidate cache from specific layer using build arg
docker build --build-arg CACHE_BUST=$(date +%s) -t myapp:debug .
```

In Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Cache bust this layer when needed
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"

COPY package*.json ./
RUN npm ci
```

## Debugging Multi-Stage Build Failures

Multi-stage builds can fail when copying between stages:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Debug: Verify build output exists
RUN ls -la /app/dist || echo "Build output missing"

FROM nginx:alpine AS production
# This fails if /app/dist does not exist in builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Debug version with explicit check
FROM nginx:alpine AS production-debug
COPY --from=builder /app/dist /usr/share/nginx/html
RUN ls -la /usr/share/nginx/html
```

## Debugging Memory and Resource Issues

Builds can fail due to insufficient resources:

```bash
# Increase memory for build
docker build --memory=4g -t myapp:debug .

# Check available resources
docker system info | grep -i memory

# Monitor resource usage during build
docker stats --no-stream
```

For Node.js builds running out of memory:

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Increase Node.js heap size
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

## Creating a Debug Workflow

Here is a systematic debugging checklist:

```bash
#!/bin/bash
# debug-build.sh - Systematic Docker build debugging

IMAGE_NAME=${1:-myapp:debug}

echo "=== Step 1: Validate Dockerfile syntax ==="
docker run --rm -i hadolint/hadolint < Dockerfile

echo "=== Step 2: Check build context ==="
echo "Build context size:"
du -sh .
echo "Files in context:"
find . -type f | wc -l
echo "Checking .dockerignore:"
cat .dockerignore 2>/dev/null || echo "No .dockerignore found"

echo "=== Step 3: Build with verbose output ==="
docker build --progress=plain --no-cache -t "$IMAGE_NAME" . 2>&1 | tee build.log

echo "=== Step 4: Check for common errors ==="
grep -iE "error|failed|denied|timeout|cannot" build.log | head -20

echo "=== Build log saved to build.log ==="
```

## Reading BuildKit Error Messages

BuildKit errors follow a pattern. Here is how to decode them:

```
#12 [builder 4/5] RUN npm run build
#12 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
------
 > [builder 4/5] RUN npm run build:
0.523 npm ERR! Missing script: "build"
------
```

The key information:
- `#12` is the step number
- `[builder 4/5]` indicates stage name and step within stage
- Exit code tells you failure type (1 = general error, 127 = command not found, 137 = OOM killed)

---

Build failures always have a root cause. Start with verbose output, isolate the failing layer, and inspect the state at that point. Most failures come down to missing files, network issues, or incorrect paths. A systematic approach beats random fixes every time.

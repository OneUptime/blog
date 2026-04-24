# How to Build Docker Images from a Dockerfile in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Dockerfile, DevOps

Description: Learn how to build Docker images directly from a Dockerfile using Portainer's built-in image build feature.

## Introduction

Portainer allows you to build Docker images directly from its web interface by uploading a Dockerfile, providing a Dockerfile URL, or pasting the content. While CI/CD pipelines are better for production image building, Portainer's build feature is useful for quick builds, testing Dockerfiles, or building on a remote host without local Docker access.

## Prerequisites

- Portainer installed with a connected Docker environment
- A Dockerfile ready to build

## Step 1: Access the Build Image Feature

1. Navigate to **Images** in Portainer.
2. Click **Build a new image**.

You'll see a build form with several options.

## Step 2: Configure the Image Build

### Image Name

Enter a name and tag for the image being built:

```text
Name: myorg/myapp:v2.1.0
```

Or for a local-only image:

```text
Name: myapp-local:latest
```

### Build Method Options

**Option A: Web editor (paste Dockerfile content)**

Click **Web editor** and paste your Dockerfile. If it uses `COPY` or `ADD`, click **Select files** to upload the referenced local files into the build context:

```dockerfile
# Simple web application Dockerfile

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (layer caching optimization)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Start command
CMD ["node", "server.js"]
```

**Option B: Upload a Dockerfile**

Upload the Dockerfile directly for self-contained builds. If the Dockerfile needs local context files, use the web editor with **Select files**. If the Dockerfile is hosted in a tarball or public GitHub repository, use Portainer's URL option and specify the Dockerfile path.

## Step 3: Add Build Arguments (--build-arg)

If your Dockerfile uses build arguments:

```dockerfile
# Dockerfile with build args
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION:-3.12}-slim

ARG APP_VERSION
ARG BUILD_DATE

LABEL org.opencontainers.image.version=${APP_VERSION}
LABEL org.opencontainers.image.created=${BUILD_DATE}

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

In Portainer's build form, add build arguments:
```text
Name:  APP_VERSION     Value: 2.1.0
Name:  PYTHON_VERSION  Value: 3.12
Name:  BUILD_DATE      Value: 2026-03-20
```

## Step 4: Complete Dockerfile Examples

### Multi-Stage Build (Production Pattern)

```dockerfile
# Multi-stage Dockerfile: build + runtime
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# ===========================
# Production stage (smaller image)
FROM node:20-alpine AS production

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Python FastAPI Application

```dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Go Application (Small Image)

```dockerfile
# Builder stage
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /myapp .

# ==================
# Final image - scratch (no OS!)
FROM scratch

# Copy binary and certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /myapp /myapp

EXPOSE 8080

ENTRYPOINT ["/myapp"]
```

## Step 5: Click Build

After configuring the build:
1. Review the Dockerfile content and settings.
2. Click **Build the image**.

Portainer shows a live build log:

```yaml
Step 1/8 : FROM node:20-alpine
 ---> 7abc...
Step 2/8 : WORKDIR /app
 ---> Running in def...
Step 3/8 : COPY package*.json ./
 ---> 456...
Step 4/8 : RUN npm ci
...
Successfully built 789abc
Successfully tagged myorg/myapp:v2.1.0
```

## Step 6: Use the Built Image

After the build:
1. Navigate to **Images** to see the new image.
2. Create a container from it:
   - **Containers > Add container**.
   - Enter `myorg/myapp:v2.1.0` as the image.
   - Configure and deploy.

## Troubleshooting Build Failures

```bash
# Error: "failed to solve with frontend dockerfile.v0"
# Fix: Dockerfile syntax error - check the error message for the line

# Error: "error: exec: 'npm': executable file not found"
# Fix: Wrong base image - verify FROM line

# Error: "COPY failed: file not found in build context"
# Fix: The file path in COPY doesn't exist in the uploaded context

# Error: "no space left on device"
# Fix: Docker host disk is full - clean up images:
docker image prune -af
```

## When to Use Portainer Build vs. CI/CD

| Scenario | Recommendation |
|----------|---------------|
| Quick one-off build for testing | Portainer build |
| Building on a remote host without CLI | Portainer build |
| Production image builds | CI/CD pipeline (GitHub Actions, GitLab CI) |
| Reproducible, version-controlled builds | CI/CD pipeline |
| Building with secrets | CI/CD pipeline (use Docker BuildKit secrets) |

## Conclusion

Portainer's image build feature is a convenient way to build Docker images directly on a remote host without command-line access. It's ideal for quick builds and testing Dockerfiles. For production workflows, prefer CI/CD pipelines that provide reproducibility, caching, testing integration, and proper secrets management.

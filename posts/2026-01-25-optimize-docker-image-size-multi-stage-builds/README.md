# How to Optimize Docker Image Size with Multi-Stage Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Multi-Stage Builds, DevOps, Optimization, Containers

Description: Learn how to dramatically reduce Docker image sizes using multi-stage builds, resulting in faster deployments, reduced storage costs, and improved security through smaller attack surfaces.

---

Large Docker images slow down your CI/CD pipelines, consume excessive storage, and increase the attack surface for potential vulnerabilities. Multi-stage builds solve this problem by letting you use multiple FROM statements in a single Dockerfile, copying only the artifacts you need into the final image.

## Understanding the Problem

A typical Node.js application image built the traditional way might look like this:

```dockerfile
# Traditional single-stage build - results in large image
FROM node:20

WORKDIR /app

# Copy everything including dev dependencies
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Image contains: node, npm, source code, dev dependencies, build tools
CMD ["node", "dist/index.js"]
```

This approach has several problems:

- Development dependencies remain in the final image
- Build tools and source code are included
- The image can easily exceed 1GB for a simple application

## Multi-Stage Build Basics

Multi-stage builds let you separate the build environment from the runtime environment. Here is the improved version:

```dockerfile
# Stage 1: Build stage - contains all build tools
FROM node:20 AS builder

WORKDIR /app

# Install all dependencies including dev dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production stage - minimal runtime
FROM node:20-alpine AS production

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
USER node

CMD ["node", "dist/index.js"]
```

The key differences:

- The `AS builder` syntax names the first stage
- `COPY --from=builder` pulls artifacts from the named stage
- The final image uses Alpine Linux, which is much smaller
- Only production dependencies and compiled code exist in the final image

## Practical Example: Go Application

Go applications benefit enormously from multi-stage builds because you can compile to a static binary:

```dockerfile
# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Download dependencies first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .

# Build static binary with optimizations
# CGO_ENABLED=0 creates a static binary without C dependencies
# -ldflags="-s -w" strips debug info to reduce size
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /app/server ./cmd/server

# Stage 2: Minimal runtime image
FROM scratch

# Copy CA certificates for HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /app/server /server

# Run the binary
ENTRYPOINT ["/server"]
```

The `scratch` base image contains nothing at all. Your final image contains only the binary and CA certificates, often under 20MB.

## Python Application Example

Python requires a different approach since it needs the interpreter at runtime:

```dockerfile
# Stage 1: Build stage with full toolchain
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies for compiled packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production image
FROM python:3.12-slim AS production

# Install only runtime dependencies (not build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY . .

# Create non-root user
RUN useradd --create-home appuser
USER appuser

CMD ["python", "-m", "myapp"]
```

Notice how the production stage installs `libpq5` (the runtime library) but not `libpq-dev` (the development headers).

## Advanced Techniques

### Using Build Arguments

You can create conditional builds using arguments:

```dockerfile
# Build argument with default value
ARG BUILD_ENV=production

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

Build specific stages with the `--target` flag:

```bash
# Build development image
docker build --target development -t myapp:dev .

# Build production image
docker build --target production -t myapp:prod .
```

### Copying from External Images

You can copy files from any image, not just previous stages:

```dockerfile
FROM alpine:3.20

# Copy nginx binary from official nginx image
COPY --from=nginx:alpine /usr/sbin/nginx /usr/sbin/nginx

# Copy your configuration
COPY nginx.conf /etc/nginx/nginx.conf
```

### Parallel Builds for Speed

Independent stages can build in parallel with BuildKit:

```dockerfile
# These two stages build in parallel
FROM golang:1.22-alpine AS backend-builder
WORKDIR /src
COPY backend/ .
RUN go build -o /backend ./...

FROM node:20-alpine AS frontend-builder
WORKDIR /src
COPY frontend/ .
RUN npm ci && npm run build

# Final stage combines both
FROM alpine:3.20
COPY --from=backend-builder /backend /app/backend
COPY --from=frontend-builder /src/dist /app/static
```

## Measuring the Results

Always verify your optimization efforts:

```bash
# Compare image sizes
docker images | grep myapp

# Analyze image layers
docker history myapp:latest

# Use dive for detailed analysis
dive myapp:latest
```

A typical comparison shows dramatic improvements:

```
REPOSITORY    TAG           SIZE
myapp         single-stage  1.2GB
myapp         multi-stage   145MB
myapp-go      scratch       12MB
```

## Common Pitfalls to Avoid

1. **Forgetting to copy necessary files**: Make sure all required runtime files are copied to the final stage.

2. **Not leveraging layer caching**: Order your COPY commands from least to most frequently changing.

3. **Using the wrong base image**: Match your base image to your runtime needs. Alpine is small but uses musl libc, which can cause issues with some applications.

4. **Copying entire directories when specific files suffice**: Be explicit about what you copy.

```dockerfile
# Instead of copying everything
COPY --from=builder /app /app

# Copy only what you need
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/
```

## Security Benefits

Smaller images have fewer vulnerabilities simply because they contain fewer packages. A scratch-based Go image has zero OS-level packages to patch. Even Alpine-based images have far fewer CVEs than full Debian or Ubuntu images.

Run vulnerability scans to see the difference:

```bash
# Scan your images for vulnerabilities
docker scout cves myapp:single-stage
docker scout cves myapp:multi-stage
```

---

Multi-stage builds are one of the most effective ways to optimize your Docker workflow. By separating build and runtime environments, you achieve smaller images, faster deployments, and improved security. Start by identifying what your application actually needs at runtime, and ruthlessly exclude everything else from your final image.

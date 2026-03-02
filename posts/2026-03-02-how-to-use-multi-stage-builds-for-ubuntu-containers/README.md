# How to Use Multi-Stage Builds for Ubuntu Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Container, Multi-Stage Build, DevOps

Description: Learn how to use Docker multi-stage builds with Ubuntu base images to create small, secure production container images by separating build dependencies from runtime requirements.

---

Multi-stage Docker builds solve one of the main container security and size challenges: build tools are necessary to compile software but should not be present in production images. With multi-stage builds, you use one container stage to compile and package your application, then copy only the resulting artifacts into a minimal final image. The build tools, compilers, and development libraries stay in the build stage and never make it into the image you push to production.

## The Problem with Single-Stage Builds

Without multi-stage builds, a typical workflow puts everything in one Dockerfile:

```dockerfile
# Single-stage - DON'T do this for production
FROM ubuntu:22.04

# Install build tools AND runtime dependencies together
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    git \
    curl \
    libssl-dev \
    # ... plus 50 other build dependencies ...
    && rm -rf /var/lib/apt/lists/*

COPY . /app
WORKDIR /app
RUN make build

CMD ["./myapp"]
```

This results in a large image containing compilers, header files, and build tools that are never used at runtime - every one of which is a potential attack surface.

## Basic Multi-Stage Build Structure

```dockerfile
# Stage 1: Build stage - use full Ubuntu with all build tools
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    cmake \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

# Build the application
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build -j$(nproc)


# Stage 2: Runtime stage - minimal Ubuntu with only what's needed to run
FROM ubuntu:22.04 AS runtime

# Install only runtime dependencies (no build tools)
RUN apt-get update && apt-get install -y \
    libssl3 \       # Runtime library (not -dev)
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for running the application
RUN useradd --system --create-home --shell /bin/bash appuser

# Copy only the compiled binary from the build stage
COPY --from=builder /build/build/myapp /usr/local/bin/myapp

USER appuser
WORKDIR /home/appuser

EXPOSE 8080
CMD ["/usr/local/bin/myapp"]
```

Build it:

```bash
# Build the image
docker build -t myapp:latest .

# Check the image size difference
docker images | grep myapp
```

## Go Application Example

Go compiles to static binaries, making it ideal for extremely minimal container images:

```dockerfile
# Stage 1: Build with Go
FROM ubuntu:22.04 AS builder

# Install Go
ARG GO_VERSION=1.22.0
RUN apt-get update && apt-get install -y curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN curl -LO "https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz" && \
    tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz" && \
    rm "go${GO_VERSION}.linux-amd64.tar.gz"

ENV PATH="/usr/local/go/bin:$PATH"
WORKDIR /app

# Cache dependencies separately from source
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o myapp ./cmd/myapp


# Stage 2: Minimal runtime - just Ubuntu base
FROM ubuntu:22.04 AS runtime

# For a completely static Go binary, you could even use:
# FROM scratch AS runtime
# But Ubuntu gives you a shell for debugging

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --uid 1001 appuser
COPY --from=builder /app/myapp /usr/local/bin/myapp
USER appuser

EXPOSE 8080
CMD ["myapp"]
```

## Python Application Example

Python applications benefit greatly from multi-stage builds - the wheel building stage can be separated from the runtime:

```dockerfile
# Stage 1: Build wheels for Python dependencies
FROM ubuntu:22.04 AS python-builder

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    # Build dependencies for Python packages with C extensions
    build-essential \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /wheels

# Copy only requirements first for better layer caching
COPY requirements.txt .

# Build wheels (compiled packages) into a directory
RUN pip3 wheel --no-deps --wheel-dir /wheels -r requirements.txt


# Stage 2: Application image
FROM ubuntu:22.04 AS runtime

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    # Runtime library dependencies (not dev packages)
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --system --create-home --shell /bin/bash appuser

WORKDIR /app

# Install wheels from build stage (no compilation needed)
COPY --from=python-builder /wheels /wheels
RUN pip3 install --no-index --find-links=/wheels -r /wheels/../requirements.txt && \
    rm -rf /wheels

# Copy application code
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000
CMD ["python3", "-m", "gunicorn", "myapp:app", "--bind", "0.0.0.0:8000"]
```

## Node.js Application Example

Node.js with TypeScript compilation is a classic multi-stage scenario:

```dockerfile
# Stage 1: Install dependencies and compile TypeScript
FROM ubuntu:22.04 AS node-builder

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (including devDependencies for TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript to JavaScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build


# Stage 2: Production runtime
FROM ubuntu:22.04 AS runtime

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home appuser
WORKDIR /app

# Copy only production dependencies manifest
COPY package*.json ./
# Install only production dependencies (no devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage (NOT TypeScript source)
COPY --from=node-builder /app/dist ./dist

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Using Build Arguments for Flexibility

```dockerfile
# Dockerfile with configurable base image and version
ARG UBUNTU_VERSION=22.04
FROM ubuntu:${UBUNTU_VERSION} AS base

# Multi-arch support using build arguments
ARG TARGETARCH
ARG TARGETPLATFORM

FROM base AS builder
ARG TARGETARCH

RUN apt-get update && apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .

# Use TARGETARCH to download architecture-appropriate binaries
RUN ARCH=${TARGETARCH} make build


FROM base AS runtime
COPY --from=builder /build/dist/myapp /usr/local/bin/myapp
CMD ["myapp"]
```

Build for specific platforms:

```bash
# Build for multiple architectures
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t myapp:latest \
    --push \
    .
```

## Targeting Specific Stages

During development, you might want to stop at the builder stage to debug:

```dockerfile
# Dockerfile with named stages
FROM ubuntu:22.04 AS dependencies
RUN apt-get update && apt-get install -y libssl3 && rm -rf /var/lib/apt/lists/*

FROM ubuntu:22.04 AS builder
RUN apt-get update && apt-get install -y build-essential libssl-dev && rm -rf /var/lib/apt/lists/*
COPY . .
RUN make build

FROM dependencies AS test
COPY --from=builder /app/tests ./tests
COPY --from=builder /app/myapp .
RUN ./run-tests.sh

FROM dependencies AS runtime
COPY --from=builder /app/myapp /usr/local/bin/
CMD ["myapp"]
```

```bash
# Build only up to the test stage
docker build --target test -t myapp:test .

# Build the full production image
docker build --target runtime -t myapp:prod .

# Run tests in the test stage
docker run --rm myapp:test

# If tests pass, push the production image
docker push myapp:prod
```

## Optimizing Layer Cache for Faster Builds

Layer caching is critical for fast CI/CD builds:

```dockerfile
FROM ubuntu:22.04 AS builder

# 1. Install system dependencies first (changes rarely)
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy dependency manifests before source code
COPY go.mod go.sum ./

# 3. Download dependencies (cached unless go.mod/go.sum changes)
RUN go mod download

# 4. Copy source code last (changes most frequently)
COPY . .

# 5. Build
RUN go build -o /app/myapp .


FROM ubuntu:22.04 AS runtime
COPY --from=builder /app/myapp /usr/local/bin/
CMD ["myapp"]
```

With this ordering:
- Changing source code only invalidates the last COPY and RUN layers
- Changing dependencies (go.mod) invalidates the download and build layers
- System package changes (rare) invalidate everything after that point

## Size Comparison Example

```bash
# Build and compare sizes
docker build -t myapp:single-stage -f Dockerfile.single .
docker build -t myapp:multi-stage -f Dockerfile.multi .

docker images | grep myapp
# myapp   single-stage  ...  1.2GB
# myapp   multi-stage   ...  85MB

# Inspect layers to verify no build tools leaked into production image
docker history myapp:multi-stage
```

Multi-stage builds are straightforward to implement and deliver meaningful benefits: smaller images pull faster in CI/CD, deploy quicker to Kubernetes, consume less registry storage, and have a smaller attack surface. For any compiled language or applications with heavy build-time dependencies, they should be the default approach.

# How to Write Efficient Dockerfiles for Ubuntu-Based Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Containers, DevOps, CI/CD

Description: A practical guide to writing efficient Dockerfiles for Ubuntu-based images, covering layer optimization, multi-stage builds, security hardening, and build performance techniques.

---

Ubuntu is a common base for container images, partly because of its familiar package ecosystem and partly because many developers are already comfortable with it. But Ubuntu images are not small - the base image is around 70 MB and grows quickly with additional packages. Writing efficient Dockerfiles means balancing image size, build speed, security, and maintainability.

This guide covers the techniques that make a real difference in production image sizes and build times.

## Starting with the Right Base Image

Ubuntu offers several base images with different trade-offs:

```dockerfile
# Full Ubuntu - largest, most complete
FROM ubuntu:22.04  # ~70 MB compressed

# Ubuntu minimal - stripped packages
FROM ubuntu:22.04-minimal  # ~30 MB compressed

# Specific release tag - never use 'latest' in production
FROM ubuntu:22.04  # Good - specific version

# Bad practice - 'latest' changes without notice
# FROM ubuntu:latest
```

For many applications, consider whether Ubuntu is actually needed:

```dockerfile
# If you only need a minimal runtime (no shell, no package manager)
FROM scratch  # truly empty - requires static binaries

# Distroless Ubuntu - no shell, minimal attack surface
FROM gcr.io/distroless/base-debian11

# Alpine - 5 MB base, musl libc (may have compatibility issues)
FROM alpine:3.19
```

For most Ubuntu-based workflows, `ubuntu:22.04` pinned to a specific version is a reasonable starting point.

## Layer Caching and Order

Docker caches each layer. A change to any layer invalidates all layers below it in the Dockerfile. Order instructions from least to most frequently changing:

```dockerfile
# Bad ordering - any file change busts the package cache
FROM ubuntu:22.04
COPY . /app
RUN apt-get update && apt-get install -y python3-pip
RUN pip install -r /app/requirements.txt

# Good ordering - packages are cached until they actually need to change
FROM ubuntu:22.04
# System packages change rarely
RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Dependencies change less often than source code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Source code changes most frequently
COPY . .
```

## Combining RUN Instructions

Each `RUN` instruction creates a new layer. Separate `apt-get update` from `apt-get install` across layers is a known anti-pattern - the update layer gets cached and the actual package versions become stale.

```dockerfile
# Wrong - update is cached separately, leading to stale packages
RUN apt-get update
RUN apt-get install -y curl nginx

# Correct - update and install in one layer, and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      nginx \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*
```

The `rm -rf /var/lib/apt/lists/*` in the same `RUN` instruction removes the package index from the layer. If it were in a separate `RUN`, it would create a new layer that marks files for deletion but the original files still exist in the previous layer.

## Multi-Stage Builds

Multi-stage builds are the most impactful technique for reducing final image size. Build dependencies stay in the build stage and are not present in the runtime image:

```dockerfile
# Stage 1: Build
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . .
RUN cmake -DCMAKE_BUILD_TYPE=Release . && \
    make -j$(nproc) && \
    make install DESTDIR=/install

# Stage 2: Runtime - much smaller
FROM ubuntu:22.04

# Only install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy only the compiled binary and required files from builder
COPY --from=builder /install/usr/local/bin/myapp /usr/local/bin/myapp
COPY --from=builder /install/etc/myapp /etc/myapp

EXPOSE 8080
USER nobody
CMD ["/usr/local/bin/myapp"]
```

A Node.js example:

```dockerfile
# Build stage - has npm, node_modules, dev dependencies
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y nodejs npm && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - only runtime assets
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

## Using --no-install-recommends

Ubuntu's `apt-get install` pulls in recommended packages by default. This adds size without adding required functionality:

```dockerfile
# Without the flag - pulls in many recommended packages
RUN apt-get install -y curl

# With the flag - installs only the package and its strict dependencies
RUN apt-get install -y --no-install-recommends curl
```

For a minimal Ubuntu image, also suppress suggestions:

```bash
# In /etc/apt/apt.conf.d/01norecommends (can be added via RUN)
RUN echo 'APT::Install-Recommends "0";\nAPT::Install-Suggests "0";' \
    > /etc/apt/apt.conf.d/01norecommends
```

## Security Hardening

```dockerfile
FROM ubuntu:22.04

# Pin to specific package versions for reproducibility
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx=1.18.0-6ubuntu14.4 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser -s /sbin/nologin appuser

# Set proper ownership
COPY --chown=appuser:appuser . /app

# Run as non-root
USER appuser

# Use exec form for CMD (prevents shell injection)
CMD ["/usr/local/bin/myapp", "--config=/etc/myapp/config.yaml"]
```

Remove unnecessary setuid/setgid binaries:

```dockerfile
# Remove setuid bits from all binaries
RUN find / -xdev -perm +6000 -exec chmod a-s {} + 2>/dev/null || true
```

## Effective .dockerignore

`.dockerignore` prevents files from being sent to the Docker build context, speeding up builds and preventing accidental inclusion of sensitive files:

```dockerignore
# .dockerignore
.git
.gitignore
*.md
node_modules
*.log
.env
.env.*
coverage/
.nyc_output/
*.test.js
__tests__/
Dockerfile
docker-compose*.yml
.dockerignore
```

A tight `.dockerignore` reduces build context size from hundreds of MB to just the files the build actually needs.

## BuildKit Features

Enable BuildKit for faster builds with better caching:

```bash
export DOCKER_BUILDKIT=1
docker build .
```

With BuildKit, use cache mounts to persist package manager caches between builds:

```dockerfile
# syntax=docker/dockerfile:1

FROM ubuntu:22.04

# Mount the apt cache - speeds up repeated builds significantly
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*
```

The `--mount=type=cache` keeps the package cache on the build host. On repeated builds, `apt-get update` only downloads changed package lists.

## Handling Environment Variables Securely

```dockerfile
# Never hardcode secrets in Dockerfiles - they appear in image history
ENV DATABASE_PASSWORD=secret  # BAD - visible in docker history

# Instead, use build args only for non-secret build-time values
ARG BUILD_VERSION
ENV APP_VERSION=${BUILD_VERSION}

# Secrets should come from the runtime environment or mount
# docker run -e DATABASE_PASSWORD=secret myimage
# or: docker run --secret id=db_pass,env=DATABASE_PASSWORD myimage
```

## Reducing Final Image Size

After building, check what is taking up space:

```bash
# Analyze layer sizes
docker history myimage:latest

# Use dive for interactive layer analysis
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest myimage:latest
```

Common size reductions:

```dockerfile
# Remove locale files (saves 50+ MB)
RUN apt-get install -y locales && \
    rm -rf /usr/share/locale/* && \
    rm -rf /var/lib/locales/supported.d/*

# Remove documentation
RUN rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/info/*

# Remove temporary files
RUN rm -rf /tmp/* /var/tmp/*
```

## Example: Production-Ready Python API Image

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04 AS base

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only what's needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

FROM base AS production

# Create non-root user
RUN groupadd -r api && useradd -r -g api api

WORKDIR /app
# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --chown=api:api . .

USER api
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The difference between a naively built Ubuntu image and one built with these techniques is often 3-5x in final size and significantly faster build times after the first run.

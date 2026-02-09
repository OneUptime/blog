# How to Use the ARG Instruction for Build-Time Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, ARG, Build Arguments, DevOps, CI/CD

Description: Master the ARG instruction in Dockerfiles to parameterize builds with variables for versions, configurations, and environments.

---

The ARG instruction defines variables that users can pass to the Docker build process using the `--build-arg` flag. Unlike ENV, which sets environment variables that persist in the running container, ARG variables exist only during the build. They disappear from the final image.

ARG is essential for creating flexible Dockerfiles that can produce different image variants from the same file. You can use it to parameterize base image versions, toggle feature flags, pass in version numbers, and control build behavior without modifying the Dockerfile itself.

## Basic Syntax

```dockerfile
# Define a build argument with a default value
ARG VERSION=3.11

# Define a build argument without a default (must be provided at build time)
ARG API_KEY
```

Pass values when building:

```bash
# Override the default value
docker build --build-arg VERSION=3.12 -t myapp .

# Provide a required argument
docker build --build-arg API_KEY=abc123 -t myapp .
```

## ARG vs ENV

This is the most common point of confusion. Here is the difference:

| Feature | ARG | ENV |
|---------|-----|-----|
| Available during build | Yes | Yes |
| Available at runtime | No | Yes |
| Can be set from CLI | Yes (--build-arg) | No (only in Dockerfile) |
| Visible in image history | Yes | Yes |
| Persists in running container | No | Yes |

```dockerfile
# ARG - only available during build
ARG BUILD_VERSION=1.0
RUN echo "Building version: $BUILD_VERSION"
# At runtime, $BUILD_VERSION is empty

# ENV - available during build AND at runtime
ENV APP_VERSION=1.0
RUN echo "App version: $APP_VERSION"
# At runtime, $APP_VERSION is still "1.0"
```

A common pattern is to combine both, using ARG to receive a value at build time and ENV to persist it into the runtime:

```dockerfile
# Receive the version at build time
ARG VERSION=1.0

# Persist it as an environment variable for runtime
ENV APP_VERSION=$VERSION

# Now APP_VERSION is available both during build and at runtime
RUN echo "Building version $APP_VERSION"
CMD ["sh", "-c", "echo Running version $APP_VERSION"]
```

## ARG Before FROM

ARG is the only instruction that can appear before FROM. This lets you parameterize the base image:

```dockerfile
# Define the base image version as an argument
ARG PYTHON_VERSION=3.11
ARG BASE_VARIANT=slim

FROM python:${PYTHON_VERSION}-${BASE_VARIANT}

# Important: ARGs defined before FROM are NOT available after FROM
# You must re-declare them to use their values
ARG PYTHON_VERSION
RUN echo "Python version: $PYTHON_VERSION"
```

Build with different base images:

```bash
# Build with Python 3.12 on Alpine
docker build \
  --build-arg PYTHON_VERSION=3.12 \
  --build-arg BASE_VARIANT=alpine \
  -t myapp:py312-alpine .

# Build with Python 3.11 on slim
docker build \
  --build-arg PYTHON_VERSION=3.11 \
  --build-arg BASE_VARIANT=slim \
  -t myapp:py311-slim .
```

The key gotcha: ARG values defined before FROM are consumed by the FROM instruction and are not available in the build stages that follow. You need to re-declare the ARG (without a value) after FROM to use it in subsequent instructions.

## ARG Scope in Multi-Stage Builds

Each FROM instruction starts a new build stage, and ARGs have stage-level scope:

```dockerfile
# This ARG is only available before the first FROM
ARG GO_VERSION=1.22

# Stage 1: Build
FROM golang:${GO_VERSION} AS builder
# GO_VERSION is not available here unless re-declared
ARG GO_VERSION
RUN echo "Building with Go $GO_VERSION"
WORKDIR /app
COPY . .
RUN go build -o server .

# Stage 2: Runtime
FROM alpine:3.19
# GO_VERSION is also not available here unless re-declared
ARG GO_VERSION
LABEL go.version="${GO_VERSION}"
COPY --from=builder /app/server /usr/local/bin/
CMD ["server"]
```

Each stage needs its own ARG declaration to access the variable.

## Default Values and Overrides

ARG supports default values. If no `--build-arg` is provided, the default is used:

```dockerfile
# With default values
ARG NODE_ENV=production
ARG PORT=3000
ARG LOG_LEVEL=info

RUN echo "Environment: $NODE_ENV, Port: $PORT, Log Level: $LOG_LEVEL"
```

```bash
# Use all defaults
docker build -t myapp .

# Override specific values
docker build --build-arg NODE_ENV=development --build-arg LOG_LEVEL=debug -t myapp:dev .
```

If an ARG has no default and no `--build-arg` is provided, the variable is empty:

```dockerfile
ARG OPTIONAL_FLAG
RUN echo "Flag value: '${OPTIONAL_FLAG}'"
# Output: Flag value: ''
```

## Practical Use Cases

### Parameterizing Package Versions

```dockerfile
FROM python:3.11-slim

ARG FLASK_VERSION=3.0.0
ARG GUNICORN_VERSION=21.2.0

# Install specific versions of packages
RUN pip install --no-cache-dir \
    flask==${FLASK_VERSION} \
    gunicorn==${GUNICORN_VERSION}

WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

```bash
# Build with different Flask version
docker build --build-arg FLASK_VERSION=2.3.3 -t myapp .
```

### Injecting Build Metadata

```dockerfile
FROM python:3.11-slim

ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

# Store build metadata as labels
LABEL build.date="${BUILD_DATE}" \
      build.commit="${GIT_COMMIT}" \
      build.version="${VERSION}"

WORKDIR /app
COPY . .
CMD ["python", "main.py"]
```

```bash
# Pass build metadata from CI/CD pipeline
docker build \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  --build-arg VERSION=$(cat VERSION) \
  -t myapp:$(cat VERSION) .
```

### Conditional Installation

```dockerfile
FROM node:20-alpine

ARG INSTALL_DEV_DEPS=false

WORKDIR /app
COPY package*.json ./

# Install production or all dependencies based on the argument
RUN if [ "$INSTALL_DEV_DEPS" = "true" ]; then \
      npm ci; \
    else \
      npm ci --only=production; \
    fi

COPY . .
CMD ["node", "server.js"]
```

```bash
# Production build (no dev dependencies)
docker build -t myapp:prod .

# Development build (with dev dependencies)
docker build --build-arg INSTALL_DEV_DEPS=true -t myapp:dev .
```

### Selecting Build Targets

```dockerfile
FROM golang:1.22 AS builder

ARG TARGET_OS=linux
ARG TARGET_ARCH=amd64

WORKDIR /app
COPY . .

# Cross-compile for the specified platform
RUN GOOS=${TARGET_OS} GOARCH=${TARGET_ARCH} go build -o /app/server .

FROM alpine:3.19
COPY --from=builder /app/server /usr/local/bin/
CMD ["server"]
```

```bash
# Build for Linux ARM64
docker build --build-arg TARGET_OS=linux --build-arg TARGET_ARCH=arm64 -t myapp:arm64 .
```

## ARG and Build Cache

ARG values affect Docker's build cache. If a build argument changes, all instructions after the ARG declaration that reference it (directly or indirectly) have their cache invalidated.

```dockerfile
FROM python:3.11-slim

# Changing this ARG invalidates the cache for all subsequent layers
ARG APP_VERSION=1.0
RUN echo "Version: $APP_VERSION"

# These layers also get rebuilt because they come after the ARG
COPY . .
RUN pip install -r requirements.txt
```

To minimize cache invalidation, place ARG declarations as late as possible in your Dockerfile:

```dockerfile
FROM python:3.11-slim

# These layers are cached regardless of APP_VERSION
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Place the ARG near where it is needed
ARG APP_VERSION=1.0
LABEL version="${APP_VERSION}"
```

## Security Considerations

ARG values are visible in the image's build history. Do not use them for secrets:

```bash
# Anyone can see build arguments in the image history
docker history myapp
```

```dockerfile
# NEVER do this - the password is visible in image history
ARG DB_PASSWORD
RUN echo "DB_PASSWORD=$DB_PASSWORD" > /app/.env
```

For secrets during builds, use BuildKit's secret mounts instead:

```dockerfile
# syntax=docker/dockerfile:1

# Secure - the secret is not stored in any layer
RUN --mount=type=secret,id=db_password \
    cat /run/secrets/db_password > /tmp/setup_db && \
    ./setup_db.sh && \
    rm /tmp/setup_db
```

```bash
# Pass the secret securely
docker build --secret id=db_password,src=./db_password.txt -t myapp .
```

## Predefined ARGs

Docker provides several predefined ARGs that you can use without declaring them:

```dockerfile
# These are available automatically - no ARG declaration needed
RUN echo "HTTP Proxy: $HTTP_PROXY"
RUN echo "No Proxy: $NO_PROXY"
```

The predefined ARGs include:
- `HTTP_PROXY` / `http_proxy`
- `HTTPS_PROXY` / `https_proxy`
- `FTP_PROXY` / `ftp_proxy`
- `NO_PROXY` / `no_proxy`
- `ALL_PROXY` / `all_proxy`

These are excluded from the build cache by default, so changing proxy settings does not invalidate cached layers.

## Summary

The ARG instruction adds flexibility to Dockerfiles by allowing values to be passed at build time. Use it to parameterize base image versions, package versions, build metadata, and conditional logic. Remember that ARG values only exist during the build and are visible in image history, so never use them for secrets. Combine ARG with ENV when you need a build-time value to persist into the running container. Place ARG declarations late in your Dockerfile to minimize cache invalidation, and always re-declare ARGs after FROM instructions in multi-stage builds.

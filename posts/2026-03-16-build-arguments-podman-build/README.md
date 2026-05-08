# How to Use Build Arguments with podman build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Build Arguments, ARG

Description: Learn how to pass build-time variables to Podman builds using ARG instructions and the --build-arg flag for flexible, parameterized image builds.

---

> Build arguments make your Containerfiles flexible by accepting parameters at build time without changing the file itself.

Build arguments let you parameterize your container builds, passing in values like version numbers, environment names, and feature flags without modifying the Containerfile. Podman supports the `ARG` instruction in Containerfiles and the `--build-arg` flag on the command line. This guide covers all practical patterns for using build arguments.

---

## How Build Arguments Work

Build arguments are defined with `ARG` in the Containerfile and supplied with `--build-arg` at build time. They are only available during the build process and are not persisted in the final image.

```bash
# Containerfile with a build argument

cat > Containerfile << 'EOF'
ARG BASE_IMAGE=docker.io/library/python:3.12-slim
FROM ${BASE_IMAGE}

ARG APP_VERSION=1.0.0
RUN echo "Building version ${APP_VERSION}"

WORKDIR /app
COPY . .

CMD ["python", "app.py"]
EOF
```

## Passing Build Arguments

Use the `--build-arg` flag to supply values at build time.

```bash
# Use default values
podman build -t myapp:latest .

# Override the APP_VERSION argument
podman build --build-arg APP_VERSION=2.1.0 -t myapp:v2.1.0 .

# Override the base image
podman build --build-arg BASE_IMAGE=docker.io/library/python:3.11 -t myapp:py311 .

# Override multiple arguments
podman build \
  --build-arg BASE_IMAGE=docker.io/library/python:3.12 \
  --build-arg APP_VERSION=3.0.0 \
  -t myapp:v3.0.0 .
```

## Default Values

ARG instructions can have default values that are used when no `--build-arg` is provided.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/node:22-alpine

# With default value
ARG NODE_ENV=production

# Without default value (will be empty if not supplied)
ARG API_URL

ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY package*.json ./
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm ci --omit=dev; \
    else \
      npm ci; \
    fi

COPY . .
CMD ["node", "server.js"]
EOF

# Build with defaults
podman build -t myapp:latest .

# Build for development
podman build --build-arg NODE_ENV=development -t myapp:dev .
```

## ARG Scope and Placement

ARG has specific scoping rules in a Containerfile that are important to understand.

```bash
cat > Containerfile << 'EOF'
# ARG before FROM is only available in FROM
ARG BASE_TAG=latest
FROM docker.io/library/alpine:${BASE_TAG}

# ARG after FROM must be redeclared to use
ARG BASE_TAG
RUN echo "Base tag was: ${BASE_TAG}"

# New ARG available in subsequent instructions
ARG PACKAGES="curl vim"
RUN apk add --no-cache ${PACKAGES}

CMD ["sh"]
EOF

# Override the base tag
podman build --build-arg BASE_TAG=3.19 -t myalpine:3.19 .

# Override the packages
podman build --build-arg PACKAGES="curl git wget" -t myalpine:tools .
```

## Converting ARG to ENV

Build arguments are not available at runtime. To persist values, convert them to environment variables with ENV.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

# Build argument
ARG APP_VERSION=1.0.0
ARG BUILD_DATE

# Convert to environment variable for runtime access
ENV APP_VERSION=${APP_VERSION}
ENV BUILD_DATE=${BUILD_DATE}

WORKDIR /app
COPY . .

# Both ARG and ENV are available during build
RUN echo "Version: ${APP_VERSION}, Built: ${BUILD_DATE}" > /app/build-info.txt

CMD ["python", "app.py"]
EOF

# Build with version and date
podman build \
  --build-arg APP_VERSION=1.5.0 \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -t myapp:1.5.0 .

# Verify at runtime
podman run --rm myapp:1.5.0 cat /app/build-info.txt
podman run --rm myapp:1.5.0 printenv APP_VERSION
```

## Conditional Builds with ARG

Use build arguments to control what gets installed or configured.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/ubuntu:24.04

ARG INSTALL_DEBUG_TOOLS=false
ARG ENABLE_MONITORING=false

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    if [ "$INSTALL_DEBUG_TOOLS" = "true" ]; then \
      apt-get install -y --no-install-recommends strace tcpdump gdb; \
    fi && \
    if [ "$ENABLE_MONITORING" = "true" ]; then \
      apt-get install -y --no-install-recommends prometheus-node-exporter; \
    fi && \
    rm -rf /var/lib/apt/lists/*

CMD ["bash"]
EOF

# Production build: minimal
podman build -t myimage:prod .

# Debug build: with tools
podman build \
  --build-arg INSTALL_DEBUG_TOOLS=true \
  --build-arg ENABLE_MONITORING=true \
  -t myimage:debug .
```

## Version Pinning with ARG

Use build arguments to pin dependency versions for reproducible builds.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.26 AS builder

ARG APP_VERSION=0.0.0-dev
ARG COMMIT_SHA=unknown

WORKDIR /src
COPY . .

# Inject version at compile time
RUN CGO_ENABLED=0 go build \
    -ldflags "-X main.version=${APP_VERSION} -X main.commit=${COMMIT_SHA}" \
    -o /app .

FROM docker.io/library/alpine:3.23
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build with version information from git
podman build \
  --build-arg APP_VERSION=$(git describe --tags) \
  --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
  -t myapp:$(git describe --tags) .
```

## Using ARG from a File

For builds with many arguments, read them from a file.

```bash
# Create a build arguments file
cat > build-args.env << 'EOF'
APP_VERSION=2.0.0
BUILD_DATE=2026-03-16
NODE_ENV=production
API_URL=https://api.example.com
EOF

# Build using arguments from the file
podman build --build-arg-file build-args.env -t myapp:latest .
```

## Security Considerations

Build arguments are visible in the image history. Never use them for secrets.

```bash
# BAD: secrets in build args are visible in image history
# podman build --build-arg DB_PASSWORD=secret123 -t myapp .
# podman history myapp  # Shows DB_PASSWORD=secret123

# GOOD: use --secret for sensitive data instead
echo "mysecretvalue" > /tmp/db-password.txt
podman build --secret id=db_pass,src=/tmp/db-password.txt -t myapp .
rm /tmp/db-password.txt
```

## Summary

Build arguments provide a clean way to parameterize container builds. Use them for version numbers, environment selection, feature flags, and dependency pinning. Remember that ARG values are scoped to their build stage, are not available at runtime unless converted to ENV, and should never contain secrets since they appear in the image history. Combine with default values for flexible builds that work with or without explicit arguments.

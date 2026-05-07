# How to Use ARG Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, ARG, Build Arguments, Container Configuration

Description: Learn how to use the ARG instruction in Podman Containerfiles to parameterize builds, create flexible images, and manage build-time configuration effectively.

---

> The ARG instruction defines build-time variables that let you parameterize your Containerfile without hardcoding values. Master ARG to create flexible, reusable build configurations for Podman.

Build arguments are one of the most useful features in Containerfiles for creating flexible, reusable image definitions. The ARG instruction defines variables that users can pass at build time using the `--build-arg` flag, allowing a single Containerfile to produce different image variants without modification.

This guide explains how to use ARG effectively in Podman Containerfiles, covering syntax, scoping rules, the relationship with ENV, security implications, and real-world patterns.

---

## Basic Syntax

The ARG instruction declares a build-time variable with an optional default value:

```dockerfile
# ARG with a default value

ARG VERSION=1.0.0

# ARG without a default (empty unless provided at build time)
ARG API_ENDPOINT

# Using the ARG value
FROM node:20-alpine

ARG VERSION=1.0.0
RUN echo "Building version ${VERSION}"
```

Pass values at build time:

```bash
# Use the default value
podman build -t myapp .

# Override the default
podman build --build-arg VERSION=2.1.0 -t myapp:2.1.0 .

# Provide a value for an ARG without a default
podman build --build-arg API_ENDPOINT=https://api.example.com -t myapp .
```

## ARG Before FROM

ARG is the only instruction that can appear before FROM. This makes it possible to parameterize the base image itself:

```dockerfile
ARG NODE_VERSION=20
ARG BASE_VARIANT=alpine

FROM node:${NODE_VERSION}-${BASE_VARIANT}

WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]
```

Build with different base configurations:

```bash
# Default: node:20-alpine
podman build -t myapp .

# Use Node 18 on slim
podman build \
    --build-arg NODE_VERSION=18 \
    --build-arg BASE_VARIANT=slim \
    -t myapp:node18 .

# Use Node 22 on Alpine
podman build --build-arg NODE_VERSION=22 -t myapp:node22 .
```

Important: ARG values declared before FROM are only available in the FROM instruction itself. To use them after FROM, you must redeclare them:

```dockerfile
ARG VERSION=1.0.0

FROM alpine:3.19

# VERSION is not available here unless redeclared
ARG VERSION

RUN echo "Version: ${VERSION}"
```

## Scoping Rules

ARG has specific scoping rules that are important to understand:

```dockerfile
ARG GLOBAL_VAR=hello

FROM alpine:3.19 AS stage1

# Must redeclare to use after FROM
ARG GLOBAL_VAR
RUN echo "${GLOBAL_VAR}"  # "hello"

# Stage-specific ARG
ARG STAGE1_VAR=world
RUN echo "${STAGE1_VAR}"  # "world"

FROM alpine:3.19 AS stage2

# Must redeclare again - ARGs don't carry across stages
ARG GLOBAL_VAR
RUN echo "${GLOBAL_VAR}"  # "hello"

# STAGE1_VAR is not available here
# RUN echo "${STAGE1_VAR}"  # Would be empty
```

Each build stage starts with a clean scope. ARG values from previous stages or from before FROM must be redeclared if needed.

## ARG vs ENV

ARG and ENV serve different purposes and have different lifecycles:

```dockerfile
FROM python:3.12-slim

# ARG: Build-time only, not in the final image
ARG BUILD_DATE
ARG GIT_SHA

# ENV: Persists in the final image, available at runtime
ENV APP_ENV=production
ENV APP_PORT=8080

# ARG values exist during build
RUN echo "Built: ${BUILD_DATE}, SHA: ${GIT_SHA}"

# But NOT at runtime
# podman run myapp printenv BUILD_DATE -> empty

# To persist an ARG value, assign it to ENV
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_SHA=${GIT_SHA}

CMD ["python", "app.py"]
```

Key differences:

| Feature | ARG | ENV |
|---------|-----|-----|
| Available during build | Yes | Yes |
| Available at runtime | No | Yes |
| Stored in image config | No | Yes |
| Can appear before FROM | Yes | No |
| Overridable at build time | Yes (--build-arg) | No |
| Overridable at run time | No | Yes (-e flag) |

## Predefined Build Arguments

Podman provides several platform-related ARG values for multi-architecture builds. Declare them inside each build stage where you want to use them:

```dockerfile
FROM alpine:3.19

# Declare platform ARGs before using them in this stage
ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
ARG BUILDPLATFORM

RUN echo "Target platform: ${TARGETPLATFORM}"
RUN echo "Target OS: ${TARGETOS}"
RUN echo "Target architecture: ${TARGETARCH}"
RUN echo "Build platform: ${BUILDPLATFORM}"
```

Available predefined arguments:
- `TARGETPLATFORM` - platform of the build result (e.g., `linux/amd64`)
- `TARGETOS` - OS component of TARGETPLATFORM (e.g., `linux`)
- `TARGETARCH` - architecture component (e.g., `amd64`, `arm64`)
- `TARGETVARIANT` - variant component of TARGETPLATFORM when applicable
- `BUILDPLATFORM` - platform of the build host
- `BUILDOS` - OS of the build host
- `BUILDARCH` - architecture of the build host
- `BUILDVARIANT` - variant component of BUILDPLATFORM when applicable

## Practical Patterns

### Pattern 1: Version Parameterization

```dockerfile
ARG GO_VERSION=1.22
ARG ALPINE_VERSION=3.19

FROM golang:${GO_VERSION}-alpine${ALPINE_VERSION} AS builder

ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN go build \
    -ldflags="-X main.version=${APP_VERSION} -X main.commit=${GIT_COMMIT}" \
    -o server .

FROM alpine:${ALPINE_VERSION}
COPY --from=builder /app/server /usr/local/bin/
USER 1001
CMD ["server"]
```

```bash
podman build \
    --build-arg APP_VERSION=1.5.2 \
    --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
    -t myapp:1.5.2 .
```

### Pattern 2: Conditional Installation

```dockerfile
FROM python:3.12-slim

ARG INSTALL_DEV_DEPS=false

WORKDIR /app
COPY requirements.txt requirements-dev.txt ./

RUN if [ "${INSTALL_DEV_DEPS}" = "true" ]; then \
        pip install --no-cache-dir -r requirements-dev.txt; \
    else \
        pip install --no-cache-dir -r requirements.txt; \
    fi

COPY . .
CMD ["python", "app.py"]
```

```bash
# Production build
podman build -t myapp:prod .

# Development build with extra tools
podman build --build-arg INSTALL_DEV_DEPS=true -t myapp:dev .
```

### Pattern 3: Registry and Image Configuration

```dockerfile
ARG REGISTRY=docker.io
ARG BASE_IMAGE=python
ARG BASE_TAG=3.12-slim

FROM ${REGISTRY}/${BASE_IMAGE}:${BASE_TAG}

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
```

```bash
# Use default Docker Hub
podman build -t myapp .

# Use a private registry
podman build \
    --build-arg REGISTRY=registry.company.com \
    --build-arg BASE_IMAGE=custom-python \
    --build-arg BASE_TAG=3.12-hardened \
    -t myapp .
```

### Pattern 4: Multi-Architecture Builds

```dockerfile
ARG TARGETARCH

FROM golang:1.22-alpine AS builder

ARG TARGETARCH

WORKDIR /app
COPY . .

RUN GOARCH=${TARGETARCH} CGO_ENABLED=0 go build -o server .

FROM alpine:3.19
COPY --from=builder /app/server /usr/local/bin/
CMD ["server"]
```

```bash
# Build for a specific architecture
podman build --platform linux/arm64 -t myapp:arm64 .
```

### Pattern 5: Build Metadata Labels

```dockerfile
FROM node:20-alpine

ARG BUILD_DATE
ARG VERSION
ARG VCS_REF

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.title="My Application" \
      org.opencontainers.image.source="https://github.com/myorg/myapp"

WORKDIR /app
COPY . .
RUN npm ci --only=production

USER node
CMD ["node", "server.js"]
```

```bash
podman build \
    --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --build-arg VERSION=1.2.3 \
    --build-arg VCS_REF=$(git rev-parse --short HEAD) \
    -t myapp:1.2.3 .
```

## Security Considerations

ARG values are not stored in the final image layers, but they are visible in the build history. Do not use ARG for secrets.

```dockerfile
# BAD: Secret visible in build history
ARG DATABASE_PASSWORD
RUN configure-db --password=${DATABASE_PASSWORD}
```

```bash
# Anyone can see the build args
podman history myapp
# Reveals: RUN configure-db --password=my_secret
```

Use build secrets instead:

```dockerfile
# GOOD: Secret not stored in any layer
RUN --mount=type=secret,id=db_password \
    configure-db --password=$(cat /run/secrets/db_password)
```

```bash
podman build --secret id=db_password,src=./db_password.txt -t myapp .
```

## Cache Behavior

Changing an ARG value invalidates the cache from the first instruction that uses it, and all subsequent layers:

```dockerfile
FROM node:20-alpine

# Changing APP_VERSION can invalidate subsequent RUN instructions
ARG APP_VERSION=1.0.0

WORKDIR /app
COPY package.json .
RUN npm ci
COPY . .

RUN echo "Version: ${APP_VERSION}"
CMD ["node", "server.js"]
```

Place ARG instructions as late as possible to maximize cache reuse:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# These layers are cached regardless of ARG changes
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .

# Place the ARG right before where it's needed
ARG APP_VERSION=1.0.0
RUN echo "${APP_VERSION}" > version.txt

CMD ["node", "server.js"]
```

## Default Value Patterns

```dockerfile
# Simple default
ARG PORT=8080

# Empty default (treated as set but empty)
ARG EXTRA_FLAGS=

# No default (unset if not provided)
ARG REQUIRED_VALUE

# Default referencing another ARG
ARG BASE_VERSION=3.19
ARG BASE_IMAGE=alpine:${BASE_VERSION}
```

## Common Mistakes

```dockerfile
# Mistake 1: Using ARG before FROM without redeclaring
ARG MY_VAR=hello
FROM alpine:3.19
RUN echo "${MY_VAR}"  # Empty! MY_VAR not redeclared after FROM

# Mistake 2: Expecting ARG at runtime
ARG APP_PORT=3000
EXPOSE ${APP_PORT}
CMD ["sh", "-c", "echo ${APP_PORT}"]  # APP_PORT is empty at runtime!

# Mistake 3: Using ARG for secrets
ARG SECRET_KEY=abc123  # Visible in build history!

# Mistake 4: Not considering cache invalidation
ARG CACHE_BUST  # Placing this early invalidates ALL layers below
COPY package.json .
RUN npm ci  # Reinstalls on every build if CACHE_BUST changes
```

## Conclusion

The ARG instruction makes your Containerfiles flexible and reusable by parameterizing build-time values. Use it to configure base images, set version strings, control conditional logic, and add build metadata. Remember the scoping rules: ARG values declared before FROM only work in the FROM instruction, and each build stage requires its own ARG declarations. Keep ARG instructions close to where they are used for better cache behavior, never use ARG for secrets, and convert build-time values to ENV when they need to be available at runtime. These practices help you create Containerfiles that serve multiple environments and configurations from a single definition.

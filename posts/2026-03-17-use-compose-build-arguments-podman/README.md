# How to Use Compose Build Arguments with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Build, Argument

Description: Learn how to pass build arguments to Containerfiles through podman-compose for parameterized image builds.

---

> Build arguments let you parameterize your Containerfiles so the same file can produce different images based on the build context.

Build arguments (ARGs) in Compose files let you pass values to the Containerfile at build time. This is useful for selecting base image versions, setting build modes, injecting build-time variables, and customizing images without maintaining multiple Containerfiles.

---

## Defining Build Arguments

```yaml
# compose.yaml

name: project
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
      args:
        PYTHON_VERSION: "3.12"
        APP_ENV: production
        BUILD_DATE: "2026-03-17"
    ports:
      - "8080:8080"
```

```dockerfile
# Containerfile
ARG PYTHON_VERSION=3.12
FROM docker.io/library/python:${PYTHON_VERSION}-slim

ARG APP_ENV=development
ARG BUILD_DATE

ENV APP_ENV=${APP_ENV}

LABEL build_date=${BUILD_DATE}

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

```bash
# Build with the arguments defined in compose
podman-compose build

# Verify the build arguments were applied
podman inspect project_app --format '{{.Config.Labels.build_date}}'
# Output: 2026-03-17
```

## Arguments from Environment Variables

```yaml
# compose.yaml
services:
  app:
    build:
      context: .
      args:
        # Value comes from the host environment
        GIT_COMMIT: ${GIT_COMMIT}
        NODE_VERSION: ${NODE_VERSION:-20}
```

```bash
# Pass values at build time through the environment
GIT_COMMIT=$(git rev-parse --short HEAD) podman-compose build
```

## Arguments with .env File

```bash
# .env
NODE_VERSION=20
APP_VERSION=1.5.0
BUILD_ENV=staging
```

```yaml
# compose.yaml
services:
  app:
    build:
      context: .
      args:
        NODE_VERSION: ${NODE_VERSION}
        APP_VERSION: ${APP_VERSION}
        BUILD_ENV: ${BUILD_ENV}
```

## Multi-Stage Build Arguments

```dockerfile
# Containerfile with multi-stage build
ARG NODE_VERSION=20
FROM docker.io/library/node:${NODE_VERSION}-alpine AS builder
ARG NPM_OMIT=dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=${NPM_OMIT}
COPY . .
RUN npm run build

FROM docker.io/library/nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

```yaml
services:
  web:
    build:
      context: .
      args:
        NODE_VERSION: "20"
        NPM_OMIT: dev
```

## List Syntax for Arguments

```yaml
services:
  app:
    build:
      context: .
      args:
        # Map syntax
        PYTHON_VERSION: "3.12"
```

```yaml
services:
  app:
    build:
      context: .
      args:
        # List syntax
        - APP_ENV=production
        - DEBUG=false
```

## Build and Deploy

```bash
# Build with arguments and start services
podman-compose up -d --build

# Rebuild only the app service
podman-compose build app

# Force rebuild without cache
podman-compose build --no-cache app
```

## Summary

Build arguments in podman-compose let you parameterize Containerfiles at build time. Define args in the compose file, reference them in Containerfiles with `ARG`, and use `.env` files or host environment variables for dynamic values. This keeps your Containerfiles reusable across environments.

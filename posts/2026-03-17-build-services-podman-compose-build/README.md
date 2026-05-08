# How to Build Services with podman-compose build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Build, Image

Description: Learn how to build container images for your services using podman-compose build with Containerfiles and build arguments.

---

> podman-compose build builds images from your Containerfiles before starting services, keeping your local development workflow fast.

When your compose file includes services with a `build` section, `podman-compose build` builds local images from those Containerfiles. This is essential for custom applications where you need to package your code into a container image.

---

## Basic Build

```yaml
# docker-compose.yml

services:
  app:
    build:
      context: .
      dockerfile: Containerfile
    ports:
      - "8080:8080"
```

```bash
# Build all services that have a build section
podman-compose build

# The built image is tagged and ready for use
podman images | grep app
```

## The Containerfile

```dockerfile
# Containerfile
FROM docker.io/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
```

## Building Specific Services

```bash
# Build only the app service
podman-compose build app

# Build multiple specific services
podman-compose build app worker
```

## Build with No Cache

```bash
# Force a full rebuild without using cached layers
podman-compose build --no-cache

# Useful when dependencies have changed but the Containerfile has not
```

## Build Arguments

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Containerfile
      args:
        - PYTHON_VERSION=3.12
        - APP_ENV=production
    ports:
      - "8080:8080"
```

```dockerfile
# Containerfile with build arguments
ARG PYTHON_VERSION=3.12
FROM docker.io/library/python:${PYTHON_VERSION}-slim

ARG APP_ENV=development
ENV APP_ENV=${APP_ENV}

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

```bash
# Build with the arguments defined in the compose file
podman-compose build
```

## Multi-Stage Builds

```dockerfile
# Containerfile with multi-stage build
FROM docker.io/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM docker.io/library/nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
# Multi-stage builds work the same way
podman-compose build
```

## Build and Start

```bash
# Build images and immediately start services
podman-compose up -d --build

# This is the most common workflow during development
```

## Summary

Use `podman-compose build` to build images from Containerfiles for your services. Pass build arguments through the compose file, use `--no-cache` for clean rebuilds, and combine build and start with `podman-compose up -d --build` for a streamlined development workflow.

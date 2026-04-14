# How to Package Pluggable Components as Container Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Container, Docker, Distribution

Description: Build, tag, and distribute Dapr pluggable components as OCI container images following best practices for minimal size, security, and versioning.

---

## Containerizing Pluggable Components

Dapr pluggable components are standalone binaries or services that run alongside your application in the same pod. Packaging them as container images ensures consistent, reproducible deployments across environments and enables standard Kubernetes rolling updates and version management.

## Multi-Stage Dockerfile for Go Components

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

ARG TARGETARCH

WORKDIR /app

# Copy dependency files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} \
    go build -ldflags="-w -s" -o /bin/component .

# Runtime stage - minimal image
FROM scratch

# Copy CA certificates for HTTPS calls
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=builder /bin/component /component

# Component runs as non-root
USER 65534

ENTRYPOINT ["/component"]
```

## Building and Tagging

```bash
# Build the image
docker build -t myorg/dapr-custom-statestore:1.0.0 .

# Tag with multiple tags
docker tag myorg/dapr-custom-statestore:1.0.0 \
  myorg/dapr-custom-statestore:latest

# Scan for vulnerabilities before publishing
docker scout cves myorg/dapr-custom-statestore:1.0.0

# Push to registry
docker push myorg/dapr-custom-statestore:1.0.0
docker push myorg/dapr-custom-statestore:latest
```

## Multi-Architecture Builds

Support both amd64 and arm64 for Kubernetes clusters with mixed node types:

```bash
# Create a multi-arch builder
docker buildx create --use --name multiarch-builder

# Build and push multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myorg/dapr-custom-statestore:1.0.0 \
  --push .
```

## Python Component Dockerfile

For Python-based components:

```dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /install /usr/local
COPY component.py .

ENV DAPR_COMPONENT_SOCKET_FOLDER=/tmp/dapr-components

USER 65534:65534

CMD ["python", "component.py"]
```

## CI/CD Pipeline for Component Images

GitHub Actions workflow:

```yaml
name: Build and Push Component

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            myorg/dapr-custom-statestore:${{ github.ref_name }}
            myorg/dapr-custom-statestore:latest
```

## Image Security Best Practices

```dockerfile
# Use specific base image digests for reproducibility
FROM golang:1.22-alpine@sha256:abc123... AS builder

# Run as non-root user
RUN addgroup -S component && adduser -S component -G component
USER component

# Read-only filesystem (set in Kubernetes pod spec)
# securityContext:
#   readOnlyRootFilesystem: true
```

## Verifying the Container

```bash
# Run component locally for testing
docker run --rm \
  -e DAPR_COMPONENT_SOCKET_FOLDER=/tmp/sockets \
  -v /tmp/sockets:/tmp/sockets \
  myorg/dapr-custom-statestore:1.0.0

# Inspect image layers
docker history myorg/dapr-custom-statestore:1.0.0

# Check image size
docker images myorg/dapr-custom-statestore:1.0.0
```

## Summary

Packaging Dapr pluggable components as container images using multi-stage Dockerfiles produces minimal, secure binaries suitable for production Kubernetes deployments. Multi-architecture builds ensure components run on diverse node types, while CI/CD automation handles versioned publishing. Following non-root user and minimal base image practices reduces the attack surface of your Dapr component containers.

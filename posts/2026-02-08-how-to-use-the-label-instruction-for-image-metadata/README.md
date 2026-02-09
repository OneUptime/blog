# How to Use the LABEL Instruction for Image Metadata

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, LABEL, Metadata, Image Management, DevOps

Description: Learn how to use Docker's LABEL instruction to add metadata to images for better organization, filtering, and automation.

---

The LABEL instruction adds metadata to a Docker image as key-value pairs. Labels do not affect the image's runtime behavior. They attach information like the maintainer, version, description, or build details that tools and humans can query later. Labels are a simple feature, but when used consistently across your organization, they become a powerful tool for image management, filtering, and automation.

This guide covers the syntax, common label conventions, practical use cases, and how to query labels from your images.

## Basic Syntax

LABEL takes one or more key-value pairs:

```dockerfile
# Single label
LABEL maintainer="team@example.com"

# Multiple labels on separate lines
LABEL version="1.0"
LABEL description="My application image"

# Multiple labels on a single line (recommended to reduce layers)
LABEL version="1.0" description="My application image" maintainer="team@example.com"

# Multi-line format with backslash continuation
LABEL version="1.0" \
      description="My web application" \
      maintainer="team@example.com" \
      org.opencontainers.image.source="https://github.com/myorg/myapp"
```

Each separate LABEL instruction creates a new layer. Combining labels into a single instruction keeps your image lean.

## Label Key Naming Conventions

Docker does not enforce a specific naming convention, but the community has established standards to avoid collisions and improve consistency.

### Reverse DNS Notation

The Open Container Initiative (OCI) recommends reverse DNS notation for label keys, similar to Java package naming:

```dockerfile
# OCI standard labels using reverse DNS notation
LABEL org.opencontainers.image.title="My Application" \
      org.opencontainers.image.description="A web service for processing orders" \
      org.opencontainers.image.version="2.1.0" \
      org.opencontainers.image.authors="dev-team@example.com" \
      org.opencontainers.image.url="https://example.com/myapp" \
      org.opencontainers.image.source="https://github.com/myorg/myapp" \
      org.opencontainers.image.documentation="https://docs.example.com/myapp" \
      org.opencontainers.image.vendor="My Company" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.created="2025-01-15T10:30:00Z" \
      org.opencontainers.image.revision="abc123def"
```

### Custom Namespace Labels

For organization-specific metadata, use your domain as the namespace:

```dockerfile
# Custom labels with your organization's namespace
LABEL com.example.team="platform-engineering" \
      com.example.project="order-service" \
      com.example.environment="production" \
      com.example.cost-center="eng-123"
```

### Simple Labels

For personal projects or internal use, simple keys work fine:

```dockerfile
LABEL maintainer="jane@example.com" \
      version="1.5.2" \
      description="API gateway service"
```

## The Deprecated MAINTAINER Instruction

Older Dockerfiles used the MAINTAINER instruction to specify the image author:

```dockerfile
# Deprecated - do not use
MAINTAINER john@example.com
```

Use a LABEL instead:

```dockerfile
# Modern approach
LABEL maintainer="john@example.com"
# Or use the OCI standard
LABEL org.opencontainers.image.authors="john@example.com"
```

MAINTAINER still works but adds no functionality beyond what LABEL provides, and it creates an additional layer.

## Dynamic Labels with Build Arguments

Labels can include values from build arguments, which is useful for injecting build-time information like git commit hashes or build dates:

```dockerfile
# Accept build-time arguments
ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

FROM python:3.11-slim

# Use build arguments in labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.version="${VERSION}"

WORKDIR /app
COPY . .
CMD ["python", "main.py"]
```

Pass the values at build time:

```bash
# Inject dynamic values during the build
docker build \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg VERSION=$(cat VERSION) \
  -t myapp:latest .
```

This pattern is valuable for tracing a running container back to the exact source code and build that produced it.

## Querying Labels

### Inspecting Image Labels

Use `docker inspect` to view all labels on an image:

```bash
# View all labels on an image
docker inspect --format='{{json .Config.Labels}}' myapp:latest | python3 -m json.tool
```

Output:

```json
{
    "maintainer": "team@example.com",
    "org.opencontainers.image.version": "2.1.0",
    "org.opencontainers.image.revision": "abc123def"
}
```

### Filtering by Labels

Labels become truly useful when you use them for filtering. You can filter images, containers, and other Docker objects by label.

Filter images by label:

```bash
# List all images with a specific label
docker images --filter "label=com.example.team=platform-engineering"

# List images with any value for a label key
docker images --filter "label=maintainer"
```

Filter running containers by label:

```bash
# Find all containers with a specific label
docker ps --filter "label=com.example.environment=production"

# Count containers by team
docker ps --filter "label=com.example.team=backend" --format "{{.Names}}"
```

### Labels in Docker Compose

Labels can be set in Docker Compose files and are useful for service discovery and management:

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    labels:
      - "com.example.service=api"
      - "com.example.team=backend"
      - "com.example.tier=web"
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"

  worker:
    build: ./worker
    labels:
      com.example.service: worker
      com.example.team: backend
      com.example.tier: processing
```

Both list format (with `-`) and map format work in Compose files.

## Labels for Automation and Tooling

Many tools leverage Docker labels for configuration and automation.

### Traefik Reverse Proxy

Traefik reads labels to configure routing:

```dockerfile
LABEL traefik.enable="true" \
      traefik.http.routers.myapp.rule="Host(`myapp.example.com`)" \
      traefik.http.services.myapp.loadbalancer.server.port="8080"
```

### Watchtower Auto-Updates

Watchtower uses labels to control update behavior:

```dockerfile
# Enable automatic updates for this container
LABEL com.centurylinklabs.watchtower.enable="true"
```

### Prometheus Monitoring

Some monitoring setups use labels for service discovery:

```dockerfile
LABEL prometheus.io/scrape="true" \
      prometheus.io/port="9090" \
      prometheus.io/path="/metrics"
```

## Label Inheritance

Labels from base images are inherited by child images. If you build an image FROM another image that has labels, your image inherits those labels.

```dockerfile
# Base image with labels
FROM python:3.11-slim
# python:3.11-slim already has labels set by the Python maintainers

# Your labels are added alongside the inherited ones
LABEL com.example.app="myservice"
```

You can override inherited labels by setting the same key:

```dockerfile
# Override the base image's maintainer label
LABEL maintainer="your-team@example.com"
```

## Practical Label Strategy

Here is a recommended set of labels for a production image:

```dockerfile
ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

FROM python:3.11-slim

# Standard OCI labels for interoperability
LABEL org.opencontainers.image.title="Order Processing Service" \
      org.opencontainers.image.description="Handles order creation, validation, and fulfillment" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.source="https://github.com/myorg/order-service" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.authors="platform-team@example.com"

# Organization-specific labels
LABEL com.example.team="commerce" \
      com.example.slack-channel="#commerce-alerts" \
      com.example.pagerduty-service="order-processing"

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8080
CMD ["python", "main.py"]
```

This gives you OCI-standard labels for tool interoperability plus custom labels for your organization's needs.

## Viewing Labels Without Pulling an Image

You can inspect labels on a remote image without pulling it:

```bash
# View labels on a Docker Hub image without downloading it
docker buildx imagetools inspect python:3.11-slim --format '{{json .Manifest}}'

# Using skopeo (if installed)
skopeo inspect docker://python:3.11-slim | python3 -m json.tool
```

## Summary

The LABEL instruction adds key-value metadata to Docker images. Use OCI standard label keys for broad tool compatibility and add custom namespaced labels for organization-specific metadata. Combine multiple labels into a single instruction to minimize layers. Inject dynamic values like git commits and build dates through build arguments. Query labels with `docker inspect` and use them for filtering with `docker images --filter` and `docker ps --filter`. Labels cost nothing at runtime but provide significant value for image management, automation, and traceability.

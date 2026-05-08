# How to Build an Image with Labels with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Labels, Metadata

Description: Learn how to add metadata labels to container images during Podman builds using LABEL instructions and the --label flag for image organization and tracking.

---

> Labels provide structured metadata that makes container images discoverable, organized, and traceable across your infrastructure.

Container image labels are key-value metadata pairs embedded in the image configuration. They help you track build information, enforce organizational standards, and integrate with tooling that queries image metadata. Podman supports adding labels both in Containerfiles and at build time. This guide covers practical label strategies.

---

## Adding Labels in the Containerfile

Use the LABEL instruction to embed metadata directly in the Containerfile.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/nginx:latest

# Single label

LABEL maintainer="dev@example.com"

# Multiple labels on separate lines
LABEL version="1.0.0"
LABEL description="Custom Nginx web server"

# Multiple labels in one instruction
LABEL org.opencontainers.image.title="My Web App" \
      org.opencontainers.image.description="Production web server" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="My Company" \
      org.opencontainers.image.url="https://example.com"

COPY html/ /usr/share/nginx/html/
CMD ["nginx", "-g", "daemon off;"]
EOF

podman build -t labeled-app:v1.0.0 .
```

## Adding Labels at Build Time

Use the `--label` flag to add labels without modifying the Containerfile.

```bash
# Add a single label
podman build --label version=1.0.0 -t myapp:latest .

# Add multiple labels
podman build \
  --label "version=1.0.0" \
  --label "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "git-commit=$(git rev-parse HEAD)" \
  --label "built-by=$(whoami)" \
  -t myapp:latest .
```

Build-time labels override labels with the same key defined in the Containerfile.

## OCI Standard Labels

Use the OCI image specification label conventions for consistency.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

LABEL org.opencontainers.image.title="My Application"
LABEL org.opencontainers.image.description="A Python web application"
LABEL org.opencontainers.image.version="2.1.0"
LABEL org.opencontainers.image.created="2026-03-16T00:00:00Z"
LABEL org.opencontainers.image.authors="Dev Team <dev@example.com>"
LABEL org.opencontainers.image.url="https://github.com/myorg/myapp"
LABEL org.opencontainers.image.documentation="https://docs.example.com"
LABEL org.opencontainers.image.source="https://github.com/myorg/myapp"
LABEL org.opencontainers.image.vendor="My Organization"
LABEL org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
EOF
```

## Dynamic Labels with Build Arguments

Combine ARG and LABEL for dynamic metadata.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="My Node App"

WORKDIR /app
COPY . .
RUN npm ci --omit=dev
CMD ["node", "server.js"]
EOF

# Build with dynamic label values
podman build \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=$(cat package.json | grep version | head -1 | awk -F'"' '{print $4}') \
  -t myapp:latest .
```

## Inspecting Labels

Read labels from built images using `podman inspect`.

```bash
# View all labels
podman inspect myapp:latest --format '{{json .Config.Labels}}' | python3 -m json.tool

# View a specific label
podman inspect myapp:latest --format '{{index .Config.Labels "org.opencontainers.image.version"}}'

# List all labels as key=value pairs
podman inspect myapp:latest --format '{{range $key, $value := .Config.Labels}}{{$key}}={{$value}}{{"\n"}}{{end}}'
```

## Filtering Images by Label

Labels make it easy to find and manage images.

```bash
# List images with a specific label
podman images --filter "label=org.opencontainers.image.vendor=My Organization"

# List images with a label key (regardless of value)
podman images --filter "label=version"

# Find all images from a specific team
podman images --filter "label=team=backend" --format "{{.Repository}}:{{.Tag}}"

# Remove images by label
podman images --filter "label=environment=staging" --format "{{.ID}}" | xargs podman rmi
```

## Labels for Environment Tracking

Use labels to track where images should run.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

ARG ENVIRONMENT=development

LABEL environment="${ENVIRONMENT}" \
      team="platform" \
      cost-center="engineering" \
      data-classification="internal"

CMD ["sh"]
EOF

# Build for different environments
podman build --build-arg ENVIRONMENT=development -t myapp:dev .
podman build --build-arg ENVIRONMENT=staging -t myapp:staging .
podman build --build-arg ENVIRONMENT=production -t myapp:prod .
```

## Automated Label Script

Create a script that automatically applies standard labels.

```bash
#!/bin/bash
# labeled-build.sh

set -e

IMAGE_NAME="${1:?Usage: $0 IMAGE_NAME [TAG]}"
TAG="${2:-latest}"

podman build \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
  --label "org.opencontainers.image.version=${TAG}" \
  --label "org.opencontainers.image.title=${IMAGE_NAME}" \
  --label "org.opencontainers.image.source=$(git remote get-url origin 2>/dev/null || echo 'local')" \
  --label "build.host=$(hostname)" \
  --label "build.user=$(whoami)" \
  -t "${IMAGE_NAME}:${TAG}" \
  .

echo "Built ${IMAGE_NAME}:${TAG} with standard labels"
podman inspect "${IMAGE_NAME}:${TAG}" --format '{{json .Config.Labels}}' | python3 -m json.tool
```

## Summary

Image labels provide essential metadata for container management, compliance, and automation. Use OCI standard label prefixes for interoperability, combine ARG with LABEL for dynamic build metadata, and leverage label-based filtering to manage your image inventory. Standardize your labeling strategy across teams and automate label application in build scripts to ensure consistency.

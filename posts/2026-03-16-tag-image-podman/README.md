# How to Tag an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Tagging

Description: Learn how to tag container images with Podman, including creating version tags, registry-specific tags, and implementing tagging strategies for CI/CD pipelines.

---

> Tagging images properly is essential for version control, registry organization, and reliable deployments.

Image tags are human-readable labels that point to a specific image version. Podman's `tag` command lets you add one or more tags to an existing image without duplicating it. This guide covers how to tag images with Podman and implement effective tagging strategies.

---

## Basic Image Tagging

Add a new tag to an existing local image.

```bash
# Tag an image with a new name and tag

podman tag nginx:1.25 my-nginx:latest

# Tag using the image ID
podman tag a3ed95caeb02 my-nginx:v1.0

# Verify the tag was created
podman images my-nginx
```

## Tagging for a Specific Registry

Add registry-specific tags to prepare images for pushing.

```bash
# Tag for Docker Hub
podman tag myapp:latest docker.io/myuser/myapp:latest
podman tag myapp:latest docker.io/myuser/myapp:v1.0.0

# Tag for Quay.io
podman tag myapp:latest quay.io/myorg/myapp:latest
podman tag myapp:latest quay.io/myorg/myapp:v1.0.0

# Tag for GitHub Container Registry
podman tag myapp:latest ghcr.io/myorg/myapp:latest
podman tag myapp:latest ghcr.io/myorg/myapp:v1.0.0

# Tag for a private registry
podman tag myapp:latest registry.example.com:5000/myapp:latest
```

## Adding Multiple Tags to One Image

An image can have many tags simultaneously.

```bash
# Add several tags at once
podman tag myapp:latest \
  myapp:v1.0.0 \
  myapp:v1.0 \
  myapp:v1

# Verify all tags point to the same image ID
podman images myapp --format "table {{.Tag}}\t{{.ID}}"

# All tags share the same image ID and consume no extra disk space
```

## Semantic Version Tagging

Implement semantic versioning for your images.

```bash
#!/bin/bash
# Semantic version tagging script

IMAGE="myapp"
VERSION="2.3.1"

# Parse semantic version components
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)

# Create all semantic version tags
podman tag "${IMAGE}:latest" "${IMAGE}:${VERSION}"      # 2.3.1
podman tag "${IMAGE}:latest" "${IMAGE}:${MAJOR}.${MINOR}" # 2.3
podman tag "${IMAGE}:latest" "${IMAGE}:${MAJOR}"          # 2
podman tag "${IMAGE}:latest" "${IMAGE}:latest"            # latest

echo "Tags created:"
podman images "${IMAGE}" --format "  {{.Repository}}:{{.Tag}}"
```

## CI/CD Tagging Strategy

Tag images with build metadata in a CI/CD pipeline.

```bash
#!/bin/bash
# CI/CD tagging script

IMAGE="registry.example.com:5000/myapp"
GIT_SHA=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BRANCH_TAG=$(printf '%s' "$GIT_BRANCH" | tr -c 'A-Za-z0-9_.-' '-')
BUILD_DATE=$(date +%Y%m%d)
BUILD_NUMBER="${BUILD_NUMBER:-local}"

# Build the image
podman build -t myapp:build .

# Apply CI/CD tags
podman tag myapp:build "${IMAGE}:${GIT_SHA}"
podman tag myapp:build "${IMAGE}:${BRANCH_TAG}"
podman tag myapp:build "${IMAGE}:${BRANCH_TAG}-${BUILD_NUMBER}"
podman tag myapp:build "${IMAGE}:${BUILD_DATE}-${GIT_SHA}"

# If this is the main branch, also tag as latest
if [ "$GIT_BRANCH" = "main" ]; then
  podman tag myapp:build "${IMAGE}:latest"
fi

echo "Created tags:"
podman images --filter "reference=${IMAGE}*" \
  --format "  {{.Repository}}:{{.Tag}}"
```

## Retagging Images

Change the tag of an image by adding a new tag and optionally removing the old one.

```bash
# Rename an image by tagging and untagging
podman tag myapp:old-name myapp:new-name
podman untag myapp:new-name myapp:old-name

# Retag to move "latest" to a new version
podman tag myapp:v2.0.0 myapp:latest

# Verify the update
podman images myapp --format "table {{.Tag}}\t{{.ID}}"
```

## Tagging for Multi-Environment Deployments

Use tags to track which images are deployed where.

```bash
# Tag for different environments
podman tag myapp:v1.5.0 myapp:staging
podman tag myapp:v1.4.2 myapp:production

# Promote staging to production
podman tag myapp:staging myapp:production

# Verify environment tags
podman images myapp --format "table {{.Tag}}\t{{.ID}}" \
  | grep -E "staging|production|v[0-9]"
```

## Verifying Tags

Confirm that tags are correctly assigned.

```bash
# List all tags for an image name
podman images myapp --format "{{.Tag}}"

# Show which tags share the same image ID
podman images myapp --format "{{.ID}} {{.Tag}}" | sort

# Verify a specific tag exists
if podman image exists myapp:v1.0.0; then
  echo "Tag myapp:v1.0.0 exists"
else
  echo "Tag myapp:v1.0.0 not found"
fi
```

## Summary

Image tagging with Podman is a simple operation with powerful organizational implications. Use semantic version tags for release management, registry-qualified tags for pushing to different registries, and CI/CD metadata tags for build traceability. A consistent tagging strategy makes your container workflow predictable, auditable, and easy to manage across development, staging, and production environments.

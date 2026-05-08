# How to Build an Image with a Specific Tag with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Tagging

Description: Learn how to tag images during Podman builds using the -t flag, including versioning strategies, multiple tags, and automated tagging workflows.

---

> Consistent image tagging is essential for tracking deployments, rolling back changes, and managing container image lifecycles.

Every container image gets an image ID, and tags give it a human-readable name. While Podman assigns an ID to every build, meaningful tags make images discoverable and manageable. The `-t` flag in `podman build` assigns tags during the build process. This guide covers tagging strategies and practical workflows.

---

## Basic Tagging

Use the `-t` flag to assign a name and tag during build.

```bash
# Tag with name and version

podman build -t myapp:v1.0.0 .

# Tag with just a name (defaults to :latest)
podman build -t myapp .

# Tag with a registry prefix
podman build -t registry.example.com/myorg/myapp:v1.0.0 .
```

## Tag Format

Tags follow the format `[registry/][namespace/]name[:tag]`.

```bash
# Local image
podman build -t myapp:latest .

# With namespace
podman build -t myorg/myapp:latest .

# With full registry path
podman build -t docker.io/myorg/myapp:v2.1.0 .

# With private registry
podman build -t registry.internal.example.com:5000/myapp:latest .
```

## Multiple Tags

Assign multiple tags to a single build by repeating the `-t` flag.

```bash
# Build with multiple tags
podman build \
  -t myapp:latest \
  -t myapp:v1.2.3 \
  -t myapp:v1.2 \
  -t myapp:v1 \
  -t registry.example.com/myapp:v1.2.3 \
  .

# Verify all tags point to the same image
podman images myapp
```

## Semantic Versioning Tags

Follow semantic versioning to make rollbacks predictable.

```bash
VERSION="1.2.3"
MAJOR=$(echo $VERSION | cut -d. -f1)
MINOR=$(echo $VERSION | cut -d. -f1-2)

podman build \
  -t "myapp:${VERSION}" \
  -t "myapp:${MINOR}" \
  -t "myapp:${MAJOR}" \
  -t "myapp:latest" \
  .

# Result:
# myapp:1.2.3
# myapp:1.2
# myapp:1
# myapp:latest
```

## Git-Based Tagging

Use git metadata for automatic, traceable tags.

```bash
# Tag with git commit SHA
podman build -t "myapp:$(git rev-parse --short HEAD)" .

# Tag with git branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
podman build -t "myapp:${BRANCH}" .

# Tag with git tag if available, otherwise commit SHA
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD)
podman build -t "myapp:${GIT_TAG}" .

# Comprehensive tagging from git
podman build \
  -t "myapp:$(git rev-parse --short HEAD)" \
  -t "myapp:$(git rev-parse --abbrev-ref HEAD | tr '/' '-')" \
  -t "myapp:latest" \
  .
```

## Date-Based Tagging

Use timestamps for builds that happen on a schedule.

```bash
# Tag with date
podman build -t "myapp:$(date +%Y%m%d)" .

# Tag with date and time
podman build -t "myapp:$(date +%Y%m%d-%H%M%S)" .

# Tag with date and commit SHA
podman build -t "myapp:$(date +%Y%m%d)-$(git rev-parse --short HEAD)" .
```

## CI/CD Build Number Tags

In CI/CD environments, use build numbers for unique identification.

```bash
# Using CI/CD environment variables
# GitLab CI
podman build -t "myapp:build-${CI_PIPELINE_ID}" .

# GitHub Actions
podman build -t "myapp:build-${GITHUB_RUN_NUMBER}" .

# Jenkins
podman build -t "myapp:build-${BUILD_NUMBER}" .

# Generic CI script
BUILD_TAG="${CI_BUILD_NUMBER:-local-$(date +%s)}"
podman build -t "myapp:${BUILD_TAG}" .
```

## Tagging After Build

You can also tag images after they have been built.

```bash
# Build with an initial tag
podman build -t myapp:latest .

# Add additional tags after the build
podman tag myapp:latest myapp:v1.2.3
podman tag myapp:latest registry.example.com/myapp:v1.2.3
podman tag myapp:latest registry.example.com/myapp:latest

# List all tags for the image
podman images myapp
```

## Automated Tagging Script

Create a reusable build and tag script.

```bash
#!/bin/bash
# build-and-tag.sh

set -e

IMAGE_NAME="${1:-myapp}"
REGISTRY="${2:-registry.example.com}"

# Gather version information
GIT_SHA=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
BUILD_DATE=$(date +%Y%m%d)
VERSION=$(cat VERSION 2>/dev/null || echo "0.0.0")

# Build with all relevant tags
podman build \
  -t "${IMAGE_NAME}:${VERSION}" \
  -t "${IMAGE_NAME}:${GIT_SHA}" \
  -t "${IMAGE_NAME}:${GIT_BRANCH}" \
  -t "${IMAGE_NAME}:${BUILD_DATE}-${GIT_SHA}" \
  -t "${IMAGE_NAME}:latest" \
  -t "${REGISTRY}/${IMAGE_NAME}:${VERSION}" \
  -t "${REGISTRY}/${IMAGE_NAME}:latest" \
  .

echo "Built and tagged ${IMAGE_NAME} with:"
podman images "${IMAGE_NAME}" --format "  {{.Repository}}:{{.Tag}}"
```

```bash
# Usage
chmod +x build-and-tag.sh
./build-and-tag.sh myapp registry.example.com
```

## Cleaning Up Old Tags

Manage tag sprawl by removing old tags periodically.

```bash
# List all tags for an image
podman images myapp --format "{{.Repository}}:{{.Tag}} {{.CreatedAt}}"

# Remove specific old tags
podman rmi myapp:v1.0.0 myapp:v1.1.0

# Remove all tags except latest and current version
podman images myapp --format "{{.Repository}}:{{.Tag}}" | \
  grep -v -E ":latest$|:v2\.0\.0$" | \
  xargs -r podman rmi
```

## Summary

Image tagging is a fundamental practice for container image management. Use semantic versioning for release images, git-based tags for traceability, and build numbers for CI/CD uniqueness. Apply multiple tags to each build to serve different lookup needs, and automate your tagging strategy with scripts to ensure consistency. Good tagging practices make deployments, rollbacks, and debugging significantly easier.

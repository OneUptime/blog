# How to Tag Docker Images in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Tagging, DevOps

Description: Learn how to add and manage tags for Docker images in Portainer to organize versions and prepare images for registry deployment.

## Introduction

Docker image tags are labels that identify specific versions of an image. Proper tagging is fundamental to container lifecycle management - it distinguishes `v2.0.0` from `v2.1.0`, marks images as `latest`, `stable`, or `edge`, and enables rollbacks. Portainer also lets you add and remove tags through its image management interface.

## Prerequisites

- Portainer installed with a connected Docker environment
- One or more images on the host to tag

## Understanding Docker Image Tags

```bash
# Full image reference format:

[HOST[:PORT]/]NAMESPACE/REPOSITORY[:TAG]

# Examples:
nginx:latest                 # Equivalent to docker.io/library/nginx:latest
nginx:1.25-alpine            # Docker Hub official image, specific tag
myorg/myapp:v2.1.0           # Docker Hub namespace, semantic version
ghcr.io/myorg/myapp:latest   # GitHub Container Registry
registry.example.com/myorg/myapp:prod  # Private registry, environment tag
```

A single image can have multiple tags - they all point to the same image ID.

## Step 1: Tag an Image in Portainer

1. Navigate to **Images** in Portainer.
2. Click the image you want to tag to open its details.
3. Use the image tagging action in the details view.
4. Enter the target image reference, such as `myorg/myapp:stable`.
5. Save the new tag.

## Step 2: Tag Images via Docker CLI

```bash
# Add a new tag to an existing image:
docker tag myorg/myapp:v2.1.0 myorg/myapp:latest
docker tag myorg/myapp:v2.1.0 myorg/myapp:stable

# Tag with a full registry path (for pushing to private registry):
docker tag myorg/myapp:v2.1.0 registry.example.com/myorg/myapp:v2.1.0
docker tag myorg/myapp:v2.1.0 ghcr.io/myorg/myapp:v2.1.0

# Tag by image ID:
docker tag abc123def456 myorg/myapp:hotfix-1234

# Multiple tags at once (in a script):
IMAGE="myorg/myapp"
VERSION="v2.1.0"
SHORT_SHA="abc1234"

docker tag "${IMAGE}:${VERSION}" "${IMAGE}:latest"
docker tag "${IMAGE}:${VERSION}" "${IMAGE}:stable"
docker tag "${IMAGE}:${VERSION}" "${IMAGE}:sha-${SHORT_SHA}"
```

## Step 3: Docker Image Tagging Strategies

### Semantic Versioning (Recommended for Production)

```bash
# Tag with full semver and convenience tags
VERSION="2.1.0"
IMAGE="myorg/myapp"

docker tag "${IMAGE}:${VERSION}" "${IMAGE}:v${VERSION}"    # v2.1.0
docker tag "${IMAGE}:${VERSION}" "${IMAGE}:v2.1"           # Minor version
docker tag "${IMAGE}:${VERSION}" "${IMAGE}:v2"             # Major version
docker tag "${IMAGE}:${VERSION}" "${IMAGE}:latest"         # Latest stable
```

### Git-Based Tagging

```bash
# Use Git information for tags:
BUILD_NUMBER="${BUILD_NUMBER:-42}"
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")

docker tag myapp:build-${BUILD_NUMBER} myapp:sha-${GIT_COMMIT}

if [ -n "$GIT_TAG" ]; then
    docker tag myapp:build-${BUILD_NUMBER} myapp:${GIT_TAG}
fi
```

### Environment Tags

```bash
# Tags for deployment environments:
docker tag myapp:v2.1.0 myapp:staging
docker tag myapp:v2.1.0 myapp:production
docker tag myapp:v2.2.0-beta myapp:canary
```

### Date-Based Tags (for releases)

```bash
DATE=$(date +%Y%m%d)
docker tag myapp:latest myapp:${DATE}
docker tag myapp:latest myapp:2026-03-20
```

## Step 4: Tagging for Multiple Registries

When you need the same image in multiple registries:

```bash
#!/bin/bash
# tag-and-push.sh
# Tags an image for multiple registries and pushes

SOURCE_IMAGE="myorg/myapp:v2.1.0"
VERSION="v2.1.0"
IMAGE_NAME="myapp"

declare -a REGISTRIES=(
    "docker.io/myorg"
    "ghcr.io/myorg"
    "registry.example.com/myorg"
)

echo "Tagging ${SOURCE_IMAGE} for multiple registries..."

for registry in "${REGISTRIES[@]}"; do
    TARGET="${registry}/${IMAGE_NAME}:${VERSION}"
    LATEST="${registry}/${IMAGE_NAME}:latest"

    echo "  Tagging: ${TARGET}"
    docker tag "${SOURCE_IMAGE}" "${TARGET}"
    docker tag "${SOURCE_IMAGE}" "${LATEST}"

    echo "  Pushing: ${TARGET}"
    docker push "${TARGET}"
    docker push "${LATEST}"
done

echo "All registries updated."
```

## Step 5: Inspect Image Tags

```bash
# List all tags for a local image:
docker images myorg/myapp --format "{{.Tag}}"

# List all local images with all tags:
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}"

# Find images with a specific tag:
docker images --filter "reference=*:latest"

# Inspect image tags:
docker inspect myorg/myapp:v2.1.0 --format '{{.RepoTags}}'
# [myorg/myapp:v2.1.0 myorg/myapp:latest myorg/myapp:stable]
```

## Step 6: Tag Immutability

In production, treat version tags as immutable:

```text
✓ Correct:
  myapp:v2.1.0 → always the same image, never changes

✗ Incorrect:
  myapp:v2.1.0 → re-tagged to point to a different image
  (This is confusing and dangerous for rollbacks)

✓ Mutable tags are acceptable for:
  myapp:latest → always points to the most recent stable version
  myapp:staging → points to the current staging deployment
```

## Step 7: Remove a Tag

To remove a tag from a local image:

```bash
# Remove a specific tag (only removes the tag, not the image if other tags remain):
docker rmi myapp:old-tag

# In Portainer:
# Navigate to Images > open the image details view > Remove tag
```

## Conclusion

Image tagging in Portainer and Docker CLI is straightforward but strategically important. Use semantic versioning tags for releases, short SHA tags for CI builds, and environment tags (`staging`, `production`) for deployment tracking. Keep version tags immutable and use `latest`/environment tags as mutable pointers. Proper tagging makes deployments predictable, rollbacks easy, and image history traceable.

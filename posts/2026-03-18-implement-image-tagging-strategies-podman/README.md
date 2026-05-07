# How to Implement Image Tagging Strategies with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Image Tagging, Container Registry, CI/CD, Versioning

Description: Learn how to implement effective container image tagging strategies with Podman using semantic versioning, git-based tags, and environment-specific labels for reliable deployments.

---

> A well-designed image tagging strategy ensures you can always identify what code is running in a container, roll back to any previous version, and track deployments across environments.

Container image tags are the primary mechanism for identifying which version of your application is deployed. Poor tagging practices, like relying solely on the `latest` tag, lead to unpredictable deployments and difficult rollbacks. A structured tagging strategy brings predictability and traceability to your container workflow.

This guide covers practical tagging strategies for Podman, from simple version tags to comprehensive multi-tag approaches.

---

## The Problem with latest

The `latest` tag is the default when no tag is specified, but it causes several problems:

```bash
# What version is this actually running?

podman run -d --name api my-api:latest
# Nobody knows without inspecting the image

# Two different machines may have different "latest" versions
# Machine A pulled latest yesterday, Machine B pulled today
# They could be running different code
```

Always tag images explicitly and treat `latest` as a convenience for development only.

## Semantic Versioning Tags

Use semantic versioning (SemVer) for release images:

```bash
# Build with semantic version
podman build -t my-api:1.2.3 .

# Also tag with major and minor versions for flexibility
podman tag my-api:1.2.3 my-api:1.2
podman tag my-api:1.2.3 my-api:1

# Push all tags
podman push my-api:1.2.3
podman push my-api:1.2
podman push my-api:1
```

This allows consumers to pin at different precision levels:

```bash
# Pin to exact version (most stable)
podman run my-api:1.2.3

# Pin to minor version (gets patch updates)
podman run my-api:1.2

# Pin to major version (gets minor and patch updates)
podman run my-api:1
```

## Git-Based Tags

Tag images with git information for traceability:

```bash
# Tag with git commit SHA
GIT_SHA=$(git rev-parse --short HEAD)
podman build -t my-api:${GIT_SHA} .

# Tag with git branch name
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9]/-/g')
podman build -t my-api:${GIT_BRANCH} .

# Tag with git tag if available
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")
if [ -n "$GIT_TAG" ]; then
  podman tag my-api:${GIT_SHA} my-api:${GIT_TAG}
fi
```

## Date-Based Tags

Include build timestamps for chronological ordering:

```bash
# Date-based tag
BUILD_DATE=$(date +%Y%m%d)
podman build -t my-api:${BUILD_DATE} .

# Date + sequence number
podman build -t my-api:${BUILD_DATE}-1 .

# Date + git SHA
GIT_SHA=$(git rev-parse --short HEAD)
podman build -t my-api:${BUILD_DATE}-${GIT_SHA} .
```

## Environment-Specific Tags

Tag images to indicate their deployment target:

```bash
# Build once, tag for environments
podman build -t my-api:1.2.3 .

# Promote through environments by adding tags
podman tag my-api:1.2.3 my-api:staging
podman tag my-api:1.2.3 my-api:production

# The same image ID runs in all environments
podman inspect my-api:1.2.3 --format '{{.Id}}'
podman inspect my-api:production --format '{{.Id}}'
# Same ID = same code
```

## Comprehensive Tagging Script

Combine multiple strategies in a build script:

```bash
#!/bin/bash
# build-and-tag.sh

set -e

IMAGE_NAME="registry.example.com/myteam/my-api"

# Gather metadata
GIT_SHA=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9]/-/g')
BUILD_DATE=$(date +%Y%m%d)
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")

# Build the image
echo "Building ${IMAGE_NAME}..."
podman build \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "org.opencontainers.image.source=$(git remote get-url origin)" \
  -t "${IMAGE_NAME}:${GIT_SHA}" \
  .

# Always tag with SHA and branch
podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:${GIT_BRANCH}"
podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:${BUILD_DATE}-${GIT_SHA}"

# Tag with semver if this git tag is a SemVer release
if echo "$GIT_TAG" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+$'; then
  podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:${GIT_TAG}"

  # Parse semver components
  MAJOR=$(echo "$GIT_TAG" | sed 's/^v//' | cut -d. -f1)
  MINOR=$(echo "$GIT_TAG" | sed 's/^v//' | cut -d. -f2)

  podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:${MAJOR}.${MINOR}"
  podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:${MAJOR}"
fi

# Tag main branch as latest
if [ "$GIT_BRANCH" = "main" ] || [ "$GIT_BRANCH" = "master" ]; then
  podman tag "${IMAGE_NAME}:${GIT_SHA}" "${IMAGE_NAME}:latest"
fi

echo "Tags created:"
podman images "${IMAGE_NAME}" --format "table {{.Tag}}\t{{.ID}}\t{{.Created}}"
```

## OCI Image Labels

Embed metadata directly in the image using standard OCI annotation keys as labels:

```dockerfile
FROM docker.io/library/node:20-alpine

LABEL org.opencontainers.image.title="My API"
LABEL org.opencontainers.image.description="Backend API service"
LABEL org.opencontainers.image.version="1.2.3"
LABEL org.opencontainers.image.vendor="My Company"
LABEL org.opencontainers.image.url="https://example.com"
LABEL org.opencontainers.image.documentation="https://docs.example.com"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY . .
CMD ["node", "server.js"]
```

Or set labels at build time:

```bash
podman build \
  --label "org.opencontainers.image.version=1.2.3" \
  --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t my-api:1.2.3 .
```

Query labels from images:

```bash
podman inspect my-api:1.2.3 --format '{{index .Config.Labels "org.opencontainers.image.version"}}'
podman inspect my-api:1.2.3 --format '{{json .Config.Labels}}' | python3 -m json.tool
```

## Registry Tag Management

Manage tags in your container registry:

```bash
# Push to registry
podman push my-api:1.2.3 registry.example.com/myteam/my-api:1.2.3

# List tags in a registry
skopeo list-tags docker://registry.example.com/myteam/my-api

# Copy tags between registries
skopeo copy \
  docker://registry.example.com/myteam/my-api:1.2.3 \
  docker://backup-registry.example.com/myteam/my-api:1.2.3

# Delete an old image manifest from registry
skopeo delete docker://registry.example.com/myteam/my-api:1.0.0
```

## Tag Cleanup Strategy

Remove old local tags to free storage:

```bash
#!/bin/bash
# cleanup-tags.sh

IMAGE="my-api"
KEEP_RECENT=10

# List all tags sorted by creation date
TAGS=$(podman images "${IMAGE}" --sort created --format '{{.Tag}}' | \
  tail -n +$((KEEP_RECENT + 1)) | \
  grep -v '^<none>$')

for tag in $TAGS; do
  if [ "$tag" != "latest" ] && [ "$tag" != "production" ] && [ "$tag" != "staging" ]; then
    echo "Removing ${IMAGE}:${tag}"
    podman rmi "${IMAGE}:${tag}" 2>/dev/null
  fi
done
```

## Auto-Update with Tags

Use tags with Podman's auto-update feature for systemd-managed containers:

```bash
# Use a mutable tag for auto-update
podman run -d \
  --name api \
  --label io.containers.autoupdate=registry \
  registry.example.com/myteam/my-api:stable

# When you push a new image with the 'stable' tag,
# podman auto-update can pull it and restart the systemd unit
podman auto-update
```

## Conclusion

A comprehensive image tagging strategy combines semantic versioning for releases, git SHAs for traceability, and environment tags for deployment tracking. Always build with multiple tags, embed metadata through OCI labels, and automate your tagging process through build scripts. Avoid depending on `latest` for anything beyond local development, and maintain a cleanup strategy to keep your image storage manageable.

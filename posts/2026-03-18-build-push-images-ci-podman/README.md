# How to Build and Push Images in CI with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Container Registry, Image Building

Description: Learn how to build container images and push them to various registries using Podman in CI/CD pipelines with best practices for tagging and optimization.

---

> Building and pushing container images is the backbone of any container CI/CD pipeline, and Podman handles it without a daemon or root privileges.

Building container images and pushing them to a registry is the most fundamental CI/CD task for containerized applications. Podman provides a straightforward, Docker-compatible workflow for this. This guide covers building images with Podman in CI environments and pushing them to popular registries including Docker Hub, GitHub Container Registry, Quay.io, and private registries.

---

## Building Images with Podman in CI

Start with a Containerfile (or Dockerfile) and build your image with proper tagging.

```bash
#!/bin/bash
# Build a container image with multiple tags for CI

# Uses the commit SHA for traceability and 'latest' for convenience

# Set variables (these would come from your CI environment)
REGISTRY="docker.io"
NAMESPACE="myorg"
IMAGE_NAME="myapp"
COMMIT_SHA="${CI_COMMIT_SHA:-$(git rev-parse HEAD)}"
BRANCH="${CI_BRANCH:-$(git branch --show-current)}"

# Build the image with multiple tags
podman build \
  --tag "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${COMMIT_SHA}" \
  --tag "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest" \
  --label "org.opencontainers.image.revision=${COMMIT_SHA}" \
  --label "org.opencontainers.image.source=https://github.com/${NAMESPACE}/${IMAGE_NAME}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  .

# Verify the image was built successfully
podman images "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"
```

## Pushing to Docker Hub

Authenticate and push images to Docker Hub.

```bash
#!/bin/bash
# Push images to Docker Hub using Podman
# Requires DOCKERHUB_USERNAME and DOCKERHUB_TOKEN environment variables

# Log in to Docker Hub
echo "${DOCKERHUB_TOKEN}" | podman login docker.io \
  -u "${DOCKERHUB_USERNAME}" \
  --password-stdin

# Push the image with both tags
podman push "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${COMMIT_SHA}"
podman push "${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest"

# Verify the push was successful by inspecting the remote manifest
podman manifest inspect \
  "docker://${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${COMMIT_SHA}"
```

## Pushing to GitHub Container Registry

GHCR uses a personal access token or the built-in GITHUB_TOKEN.

```bash
#!/bin/bash
# Push images to GitHub Container Registry
# Requires GITHUB_TOKEN environment variable

GHCR_IMAGE="ghcr.io/${NAMESPACE}/${IMAGE_NAME}"

# Log in to GHCR
echo "${GITHUB_TOKEN}" | podman login ghcr.io \
  -u "${GITHUB_ACTOR}" \
  --password-stdin

# Build with GHCR-qualified name
podman build \
  -t "${GHCR_IMAGE}:${COMMIT_SHA}" \
  -t "${GHCR_IMAGE}:latest" \
  .

# Push to GHCR
podman push "${GHCR_IMAGE}:${COMMIT_SHA}"
podman push "${GHCR_IMAGE}:latest"
```

## Pushing to Quay.io

Quay.io is a popular registry from Red Hat that works well with Podman.

```bash
#!/bin/bash
# Push images to Quay.io
# Requires QUAY_USERNAME and QUAY_PASSWORD environment variables

QUAY_IMAGE="quay.io/${NAMESPACE}/${IMAGE_NAME}"

# Log in to Quay.io
echo "${QUAY_PASSWORD}" | podman login quay.io \
  -u "${QUAY_USERNAME}" \
  --password-stdin

# Build with Quay-qualified name
podman build \
  -t "${QUAY_IMAGE}:${COMMIT_SHA}" \
  -t "${QUAY_IMAGE}:latest" \
  .

# Push to Quay.io
podman push "${QUAY_IMAGE}:${COMMIT_SHA}"
podman push "${QUAY_IMAGE}:latest"
```

## Building Multi-Architecture Images

Build images for multiple CPU architectures using Podman manifests.

```bash
#!/bin/bash
# Build and push multi-architecture images with Podman
# Supports both amd64 and arm64 platforms

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"

# Build both architectures into a single manifest list
podman build \
  --platform linux/amd64,linux/arm64 \
  --manifest "${FULL_IMAGE}:${COMMIT_SHA}" \
  .

# Push the manifest list (includes both architectures)
podman manifest push "${FULL_IMAGE}:${COMMIT_SHA}" \
  "docker://${FULL_IMAGE}:${COMMIT_SHA}"
```

## Semantic Version Tagging in CI

Implement proper version tagging based on git tags or branch names.

```bash
#!/bin/bash
# Smart tagging strategy for CI builds
# Tags images based on git context: tags, branches, and commit SHAs

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"

# Determine the appropriate tags based on git context
TAGS=("${FULL_IMAGE}:${COMMIT_SHA}")

# If this is a tagged release, add semver tags
GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || true)
if [ -n "${GIT_TAG}" ]; then
  # Parse semver components (e.g., v1.2.3)
  VERSION="${GIT_TAG#v}"
  MAJOR=$(echo "$VERSION" | cut -d. -f1)
  MINOR=$(echo "$VERSION" | cut -d. -f2)

  TAGS+=("${FULL_IMAGE}:${VERSION}")
  TAGS+=("${FULL_IMAGE}:${MAJOR}.${MINOR}")
  TAGS+=("${FULL_IMAGE}:${MAJOR}")
fi

# If this is the main branch, also tag as latest
if [ "${BRANCH}" = "main" ]; then
  TAGS+=("${FULL_IMAGE}:latest")
fi

# Build with all determined tags
TAG_ARGS=""
for TAG in "${TAGS[@]}"; do
  TAG_ARGS="${TAG_ARGS} --tag ${TAG}"
done

podman build ${TAG_ARGS} .

# Push all tags
for TAG in "${TAGS[@]}"; do
  echo "Pushing ${TAG}"
  podman push "${TAG}"
done
```

## Summary

Podman provides a clean, daemonless workflow for building and pushing container images in CI/CD pipelines. It works with all major registries including Docker Hub, GHCR, Quay.io, and private registries. Multi-architecture builds are supported through manifest lists, and semantic version tagging ensures your images are properly organized. The OCI-standard labels add traceability back to your source code, making it easy to identify which commit produced a given image.

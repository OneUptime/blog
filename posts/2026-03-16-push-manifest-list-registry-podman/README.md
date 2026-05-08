# How to Push a Manifest List to a Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Registry, Multi-Architecture

Description: Learn how to push manifest lists to container registries with Podman, including authentication, pushing to multiple registries, and handling common issues.

---

> Pushing a manifest list to a registry makes your multi-architecture image available to users on any platform with a single pull command.

After creating a manifest list and adding platform-specific images, the final step is pushing it to a container registry. This guide covers authentication, the push command, and common workflows for publishing multi-arch images.

---

## Prerequisites

Before pushing, ensure you have:
1. A manifest list with at least one image entry
2. Authentication credentials for your target registry

```bash
# Verify your manifest list has entries

podman manifest inspect myapp:latest | jq '.manifests | length'

# Log in to your registry
podman login registry.example.com
```

## Basic Push

Use `podman manifest push` to send the manifest list and its images to a registry.

```bash
# Push the manifest list and all referenced images
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest
```

The `--all` flag ensures that all architecture-specific images referenced in the manifest are also pushed to the registry.

## Step-by-Step Complete Workflow

```bash
# Step 1: Build images for each architecture
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Step 2: Create the manifest list
podman manifest create registry.example.com/myapp:v1.0

# Step 3: Add images
podman manifest add registry.example.com/myapp:v1.0 myapp:amd64
podman manifest add registry.example.com/myapp:v1.0 myapp:arm64

# Step 4: Push to registry
podman manifest push --all \
  registry.example.com/myapp:v1.0 \
  docker://registry.example.com/myapp:v1.0
```

## Authentication

### Docker Hub

```bash
# Log in to Docker Hub
podman login docker.io

# Push to Docker Hub
podman manifest push --all \
  myapp:latest \
  docker://docker.io/username/myapp:latest
```

### GitHub Container Registry

```bash
# Log in to GitHub Container Registry
echo "${GITHUB_TOKEN}" | podman login ghcr.io -u "${GITHUB_USERNAME}" --password-stdin

# Push to GHCR
podman manifest push --all \
  myapp:latest \
  docker://ghcr.io/username/myapp:latest
```

### Amazon ECR

```bash
# Log in to ECR
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
podman manifest push --all \
  myapp:latest \
  docker://123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

### Google Artifact Registry

```bash
# Log in to Google Artifact Registry
gcloud auth print-access-token | \
  podman login -u oauth2accesstoken --password-stdin us-docker.pkg.dev

# Push
podman manifest push --all \
  myapp:latest \
  docker://us-docker.pkg.dev/project-id/repo/myapp:latest
```

## Pushing to Multiple Registries

Push the same manifest to several registries.

```bash
#!/bin/bash
# push-multi-registry.sh

MANIFEST="myapp:v1.0"
REGISTRIES=(
  "docker://docker.io/myorg/myapp:v1.0"
  "docker://ghcr.io/myorg/myapp:v1.0"
  "docker://registry.example.com/myapp:v1.0"
)

for REGISTRY in "${REGISTRIES[@]}"; do
  echo "Pushing to ${REGISTRY}..."
  podman manifest push --all "${MANIFEST}" "${REGISTRY}"
  echo "Done."
  echo ""
done
```

## Pushing with Specific Options

```bash
# Push with compression type
podman manifest push --all \
  --compression-format gzip \
  myapp:latest docker://registry.example.com/myapp:latest

# Push without TLS verification (for local registries only)
podman manifest push --all \
  --tls-verify=false \
  myapp:latest docker://localhost:5000/myapp:latest

# Push and remove the local manifest after (clean up)
podman manifest push --all --rm \
  myapp:latest docker://registry.example.com/myapp:latest
```

## Verifying the Push

Confirm the manifest list was pushed correctly.

```bash
# Inspect the manifest in the registry
podman manifest inspect docker://registry.example.com/myapp:latest

# Verify platform entries
podman manifest inspect docker://registry.example.com/myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os}'

# Pull and test on the current platform
podman pull registry.example.com/myapp:latest
podman run --rm registry.example.com/myapp:latest

# Verify with skopeo
skopeo inspect --raw docker://registry.example.com/myapp:latest | jq .
```

## Tagging and Pushing Multiple Tags

Push the same manifest under multiple tags.

```bash
IMAGE="registry.example.com/myapp"

# Build and create manifest for a specific version
podman manifest create "${IMAGE}:v1.2.3"
podman manifest add "${IMAGE}:v1.2.3" myapp:amd64
podman manifest add "${IMAGE}:v1.2.3" myapp:arm64

# Push with multiple tags
podman manifest push --all "${IMAGE}:v1.2.3" "docker://${IMAGE}:v1.2.3"
podman manifest push --all "${IMAGE}:v1.2.3" "docker://${IMAGE}:v1.2"
podman manifest push --all "${IMAGE}:v1.2.3" "docker://${IMAGE}:v1"
podman manifest push --all "${IMAGE}:v1.2.3" "docker://${IMAGE}:latest"
```

## CI/CD Pipeline Script

```bash
#!/bin/bash
# ci-push-manifest.sh - Full CI/CD manifest push workflow
set -euo pipefail

REGISTRY="${REGISTRY:-registry.example.com}"
IMAGE_NAME="${IMAGE_NAME:-myapp}"
VERSION="${CI_COMMIT_TAG:-$(git describe --tags --always)}"
PLATFORMS=("linux/amd64" "linux/arm64")

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"

echo "=== Building multi-arch images ==="
for PLATFORM in "${PLATFORMS[@]}"; do
  ARCH="${PLATFORM#*/}"
  echo "Building for ${PLATFORM}..."
  podman build --platform "${PLATFORM}" -t "${FULL_IMAGE}:${VERSION}-${ARCH}" .
done

echo ""
echo "=== Creating manifest list ==="
podman manifest create "${FULL_IMAGE}:${VERSION}"

for PLATFORM in "${PLATFORMS[@]}"; do
  ARCH="${PLATFORM#*/}"
  podman manifest add "${FULL_IMAGE}:${VERSION}" "${FULL_IMAGE}:${VERSION}-${ARCH}"
done

echo ""
echo "=== Manifest contents ==="
podman manifest inspect "${FULL_IMAGE}:${VERSION}" | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os}'

echo ""
echo "=== Pushing to registry ==="
podman manifest push --all "${FULL_IMAGE}:${VERSION}" "docker://${FULL_IMAGE}:${VERSION}"
podman manifest push --all "${FULL_IMAGE}:${VERSION}" "docker://${FULL_IMAGE}:latest"

echo ""
echo "Published:"
echo "  ${FULL_IMAGE}:${VERSION}"
echo "  ${FULL_IMAGE}:latest"
```

## Troubleshooting Common Push Issues

```bash
# Error: unauthorized
# Fix: Re-authenticate
podman login registry.example.com

# Error: manifest blob unknown
# Fix: Push with --all to include all blobs
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest

# Error: name unknown (repository doesn't exist)
# Fix: Create the repository in the registry first (ECR, GCR require this)
aws ecr create-repository --repository-name myapp

# Error: TLS certificate verification failed
# Fix: For local registries, disable TLS verification
podman manifest push --tls-verify=false --all myapp:latest docker://localhost:5000/myapp:latest
```

## Summary

Push manifest lists with `podman manifest push --all` to ensure all platform-specific images are uploaded alongside the manifest. Always verify the push by inspecting the remote manifest. For CI/CD pipelines, automate the entire flow from build to push, and push multiple tags (version, latest) for each release. Authenticate with your registry before pushing and use `--tls-verify=false` only for local development registries.

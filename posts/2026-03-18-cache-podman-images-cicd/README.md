# How to Cache Podman Images in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Caching, Build Optimization

Description: Learn how to cache Podman images and layers in CI/CD pipelines to dramatically reduce build times and speed up your deployments.

---

> Proper image caching can reduce Podman build times from minutes to seconds, making your CI/CD pipelines significantly faster.

Container image builds can be one of the slowest parts of a CI/CD pipeline. Without caching, every build pulls base images and reinstalls dependencies from scratch. Podman supports multiple caching strategies that can dramatically speed up your builds. This guide covers practical techniques for caching Podman images across CI/CD runs.

---

## Understanding Podman Layer Caching

Podman uses a layered filesystem, where each instruction in a Containerfile creates a new layer. If the instruction and its context have not changed, Podman can reuse the cached layer.

```dockerfile
# Containerfile optimized for layer caching

# Dependencies change less frequently than source code,
# so install them in earlier layers

FROM node:20-alpine

WORKDIR /app

# Layer 1: Copy only dependency files first (changes infrequently)
COPY package.json package-lock.json ./

# Layer 2: Install dependencies (cached when package files unchanged)
RUN npm ci

# Layer 3: Copy application source (changes frequently)
COPY . .

# Layer 4: Build the application
RUN npm run build

CMD ["node", "dist/index.js"]
```

## Caching with Registry-Based Cache

Use a container registry as a cache source for your builds.

```bash
#!/bin/bash
# Use the registry as a cache source for Podman builds
# This is the most portable caching strategy across CI platforms

REGISTRY="docker.io/myorg"
IMAGE="${REGISTRY}/myapp"
CACHE_IMAGE="${REGISTRY}/myapp-cache"

# Log in to the registry
echo "${REGISTRY_TOKEN}" | podman login docker.io \
  -u "${REGISTRY_USER}" --password-stdin

# Build using cached layers from the registry and update the cache
podman build \
  --layers \
  --cache-from "${CACHE_IMAGE}" \
  --cache-to "${CACHE_IMAGE}" \
  --tag "${IMAGE}:${COMMIT_SHA}" \
  --tag "${IMAGE}:latest" \
  .

# Push the new image tags
podman push "${IMAGE}:${COMMIT_SHA}"
podman push "${IMAGE}:latest"
```

## Caching with Save and Restore

Save and restore images as tar files using CI cache mechanisms.

```bash
#!/bin/bash
# Save and restore Podman images using tar files
# Works with any CI system that supports file-based caching

CACHE_DIR="/tmp/podman-cache"
CACHE_FILE="${CACHE_DIR}/image-cache.tar"

# Function to restore cached images
restore_cache() {
  if [ -f "${CACHE_FILE}" ]; then
    echo "Restoring cached images..."
    podman load -i "${CACHE_FILE}"
    echo "Cache restored successfully"
  else
    echo "No cache found, building from scratch"
  fi
}

# Function to save images to cache
save_cache() {
  mkdir -p "${CACHE_DIR}"
  echo "Saving images to cache..."
  # Save the built image and its base layers
  podman save -o "${CACHE_FILE}" "${IMAGE}:latest"
  echo "Cache saved ($(du -h ${CACHE_FILE} | cut -f1))"
}

# Restore, build, and save
restore_cache
podman build -t "${IMAGE}:latest" .
save_cache
```

## GitHub Actions Caching Example

Combine Podman with GitHub Actions cache for persistent caching.

```yaml
# .github/workflows/cached-build.yml
name: Cached Podman Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Restore cached Podman images
      - name: Restore image cache
        uses: actions/cache@v4
        with:
          path: /tmp/podman-cache
          # Cache key based on Containerfile and lock file
          key: podman-${{ hashFiles('Containerfile', 'package-lock.json') }}
          restore-keys: |
            podman-

      # Load cached images if available
      - name: Load cached images
        run: |
          if [ -f /tmp/podman-cache/image.tar ]; then
            podman load -i /tmp/podman-cache/image.tar
          fi

      # Build the image (will use cached layers)
      - name: Build image
        run: |
          podman build -t myapp:${{ github.sha }} -t myapp:latest .

      # Save images for future cache
      - name: Save image cache
        run: |
          mkdir -p /tmp/podman-cache
          podman save -o /tmp/podman-cache/image.tar myapp:latest
```

## GitLab CI Caching Example

Use GitLab CI cache to persist Podman images.

```yaml
# .gitlab-ci.yml with Podman image caching
image: quay.io/podman/stable:latest

variables:
  STORAGE_DRIVER: vfs

# Cache the tar file between pipeline runs
cache:
  key: podman-${CI_COMMIT_REF_SLUG}
  paths:
    - .podman-cache/

build:
  stage: build
  script:
    # Restore cached image
    - |
      if [ -f .podman-cache/image.tar ]; then
        podman load -i .podman-cache/image.tar
        echo "Cache loaded"
      fi

    # Build the image
    - podman build
        -t myapp:${CI_COMMIT_SHA}
        -t myapp:latest
        .

    # Save to cache
    - mkdir -p .podman-cache
    - podman save -o .podman-cache/image.tar myapp:latest
```

## Caching Base Images Separately

Cache base images independently from application images for better efficiency.

```bash
#!/bin/bash
# Cache base images separately from application images
# Base images change rarely and are large, so caching them saves time

BASE_CACHE="/tmp/podman-cache/base-images.tar"
APP_CACHE="/tmp/podman-cache/app-layers.tar"

# Extract base image name from Containerfile
BASE_IMAGE=$(grep '^FROM' Containerfile | head -1 | awk '{print $2}')

# Restore and pull base image
if [ -f "${BASE_CACHE}" ]; then
  echo "Loading cached base image..."
  podman load -i "${BASE_CACHE}"
else
  echo "Pulling base image ${BASE_IMAGE}..."
  podman pull "${BASE_IMAGE}"
  # Save base image for future runs
  mkdir -p /tmp/podman-cache
  podman save -o "${BASE_CACHE}" "${BASE_IMAGE}"
fi

# Build the application image (base layers are already cached)
podman build -t myapp:latest .

# Save the full application image
podman save -o "${APP_CACHE}" myapp:latest
```

## Summary

Caching Podman images in CI/CD can reduce build times dramatically. The key strategies are structuring your Containerfile for optimal layer caching, using registry-based caching for portability, and leveraging CI-platform-specific cache mechanisms for persistence. Separate caching of base images and application layers gives you fine-grained control over cache invalidation. Combine these techniques based on your CI platform to get the fastest possible builds while keeping your pipeline configuration maintainable.

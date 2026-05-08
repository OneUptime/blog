# How to Automate Multi-Arch Builds in CI/CD with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, CI/CD, Automation

Description: Learn how to set up automated multi-architecture container image builds in CI/CD pipelines using Podman, with examples for GitHub Actions, GitLab CI, and Jenkins.

---

> Automating multi-arch builds in CI/CD ensures every release ships images for all target platforms without manual intervention.

Manually building images for multiple architectures is tedious and error-prone. By integrating multi-arch builds into your CI/CD pipeline, you get consistent, reproducible image builds on every commit or release. This guide shows practical pipeline configurations using Podman.

---

## GitHub Actions Pipeline

```yaml
# .github/workflows/multiarch-build.yml

name: Multi-Arch Build

on:
  push:
    tags: ['v*']

jobs:
  build-multiarch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Podman and QEMU
        run: |
          sudo apt-get update
          sudo apt-get install -y podman qemu-user-static

      - name: Log in to registry
        run: |
          podman login -u ${{ secrets.REGISTRY_USER }} \
            -p ${{ secrets.REGISTRY_PASS }} \
            registry.example.com

      - name: Build and push multi-arch image
        run: |
          IMAGE="registry.example.com/myapp"
          TAG="${GITHUB_REF_NAME}"

          # Create manifest list
          podman manifest create "${IMAGE}:${TAG}"

          # Build for each architecture
          for ARCH in amd64 arm64; do
            podman build \
              --platform "linux/${ARCH}" \
              -t "${IMAGE}:${TAG}-${ARCH}" \
              .
            podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
          done

          # Push the manifest list with all images
          podman manifest push --all "${IMAGE}:${TAG}" \
            "docker://${IMAGE}:${TAG}"

          # Also tag as latest
          podman manifest push --all "${IMAGE}:${TAG}" \
            "docker://${IMAGE}:latest"
```

## GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build

multiarch-build:
  stage: build
  image: quay.io/podman/stable:latest
  variables:
    IMAGE: "registry.example.com/myapp"
  before_script:
    # Install QEMU for cross-platform builds
    - dnf install -y qemu-user-static
    # Log in to the container registry
    - podman login -u "${CI_REGISTRY_USER}" -p "${CI_REGISTRY_PASSWORD}" "${CI_REGISTRY}"
  script:
    - |
      TAG="${CI_COMMIT_TAG:-${CI_COMMIT_SHORT_SHA}}"

      # Remove stale manifest list if present
      podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null || true

      # Create manifest list
      podman manifest create "${IMAGE}:${TAG}"

      # Build for amd64 and arm64
      for ARCH in amd64 arm64; do
        podman build \
          --platform "linux/${ARCH}" \
          -t "${IMAGE}:${TAG}-${ARCH}" .
        podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
      done

      # Push manifest list
      podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
  rules:
    - if: $CI_COMMIT_TAG
    - if: $CI_COMMIT_BRANCH == "main"
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        IMAGE = 'registry.example.com/myapp'
        TAG = "${env.GIT_COMMIT[0..6]}"
        REGISTRY_CREDS = credentials('registry-credentials')
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    # Ensure QEMU is registered
                    sudo podman run --rm --privileged \
                        multiarch/qemu-user-static --reset -p yes
                '''
            }
        }

        stage('Build Multi-Arch') {
            steps {
                sh '''
                    # Login to registry
                    podman login -u ${REGISTRY_CREDS_USR} \
                        -p ${REGISTRY_CREDS_PSW} \
                        registry.example.com

                    # Create manifest list
                    podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null || true
                    podman manifest create "${IMAGE}:${TAG}"

                    # Build for each architecture
                    for ARCH in amd64 arm64; do
                        podman build \
                            --platform "linux/${ARCH}" \
                            -t "${IMAGE}:${TAG}-${ARCH}" .
                        podman manifest add \
                            "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
                    done

                    # Push manifest list
                    podman manifest push --all \
                        "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
                '''
            }
        }
    }

    post {
        always {
            sh 'podman system prune --all --force'
        }
    }
}
```

## Reusable Build Script

Create a standalone script that works with any CI system:

```bash
#!/bin/bash
# scripts/build-multiarch.sh
set -euo pipefail

# Configuration
IMAGE="${IMAGE:-registry.example.com/myapp}"
TAG="${TAG:-latest}"
ARCHITECTURES="${ARCHITECTURES:-amd64 arm64}"

echo "=== Multi-Arch Build ==="
echo "Image: ${IMAGE}:${TAG}"
echo "Architectures: ${ARCHITECTURES}"

# Clean up previous manifest
podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null || true

# Create manifest list
podman manifest create "${IMAGE}:${TAG}"

# Build for each architecture
for ARCH in ${ARCHITECTURES}; do
    echo "--- Building linux/${ARCH} ---"
    podman build \
        --platform "linux/${ARCH}" \
        --layers \
        -t "${IMAGE}:${TAG}-${ARCH}" \
        .

    podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
    echo "--- Added linux/${ARCH} to manifest ---"
done

# Push manifest list
echo "--- Pushing manifest list ---"
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

echo "=== Build complete: ${IMAGE}:${TAG} ==="
```

Call it from any CI system:

```bash
# In your CI configuration
IMAGE=registry.example.com/myapp TAG=v1.0 ./scripts/build-multiarch.sh
```

## Caching Strategies for Faster Builds

```bash
# Use --layers to enable layer caching between builds
podman build \
    --platform "linux/${ARCH}" \
    --layers \
    --cache-from "registry.example.com/myapp:build-cache-${ARCH}" \
    --cache-to "registry.example.com/myapp:build-cache-${ARCH}" \
    -t "${IMAGE}:${TAG}-${ARCH}" \
    .
```

## Parallel Builds for Speed

```bash
#!/bin/bash
# parallel-build.sh - Build architectures in parallel

IMAGE="registry.example.com/myapp"
TAG="v1.0"
ARCHITECTURES=("amd64" "arm64" "s390x")

podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null || true
podman manifest create "${IMAGE}:${TAG}"

# Build all architectures in parallel
PIDS=()
for ARCH in "${ARCHITECTURES[@]}"; do
    (
        podman build --platform "linux/${ARCH}" \
            -t "${IMAGE}:${TAG}-${ARCH}" .
    ) &
    PIDS+=($!)
done

# Wait for all builds to complete
for PID in "${PIDS[@]}"; do
    wait "${PID}" || { echo "Build failed"; exit 1; }
done

# Add all to manifest
for ARCH in "${ARCHITECTURES[@]}"; do
    podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
done

podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
```

## Summary

Automating multi-arch builds in CI/CD with Podman follows a consistent pattern: install QEMU, build per-platform images, assemble them into a manifest list, and push. The same script structure works across GitHub Actions, GitLab CI, Jenkins, and any other CI system. Parallel builds and layer caching help keep build times reasonable.

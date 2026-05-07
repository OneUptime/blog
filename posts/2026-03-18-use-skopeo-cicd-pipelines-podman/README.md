# How to Use Skopeo in CI/CD Pipelines with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, CI/CD, Automation, GitHub Action, GitLab CI

Description: Learn how to integrate Skopeo with Podman in CI/CD pipelines for building, testing, copying, and promoting container images automatically.

---

> Combining Skopeo and Podman in CI/CD pipelines gives you a daemonless container workflow that can run rootlessly while handling building, testing, and promoting images across registries.

Modern CI/CD pipelines frequently build and deploy container images. Using Podman for building and Skopeo for copying and promoting images between registries creates a secure, daemonless workflow. This guide covers practical CI/CD integration patterns for GitHub Actions, GitLab CI, and generic pipeline environments.

---

## Why Use Skopeo and Podman in CI/CD

Traditional Docker-based CI/CD requires a Docker daemon running inside the CI runner, which presents security and complexity challenges. Podman and Skopeo offer:

- No daemon required (no Docker-in-Docker complexity)
- Rootless operation for better security
- Direct registry-to-registry image copies without local storage
- Shared authentication across both tools

## GitHub Actions Integration

Use Podman and Skopeo in GitHub Actions workflows.

```yaml
# .github/workflows/build-and-push.yml

name: Build and Push Container Image

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Skopeo
        run: |
          sudo apt-get update
          sudo apt-get install -y skopeo

      - name: Log in to registry
        run: |
          # Podman login - credentials are shared with Skopeo
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
            podman login registry.example.com \
              --username "${{ secrets.REGISTRY_USERNAME }}" \
              --password-stdin

      - name: Build image with Podman
        run: |
          podman build \
            -t registry.example.com/myapp:${{ github.sha }} \
            -t registry.example.com/myapp:latest \
            .

      - name: Push image with Skopeo
        run: |
          # Push the SHA-tagged image
          skopeo copy \
            containers-storage:registry.example.com/myapp:${{ github.sha }} \
            docker://registry.example.com/myapp:${{ github.sha }}

          # Push the latest tag
          skopeo copy \
            containers-storage:registry.example.com/myapp:latest \
            docker://registry.example.com/myapp:latest
```

## GitLab CI Integration

Configure Skopeo and Podman in a GitLab CI pipeline on runners configured to use Podman as the container runtime.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - promote

variables:
  IMAGE_NAME: registry.gitlab.com/${CI_PROJECT_PATH}

build:
  stage: build
  image: quay.io/podman/stable
  script:
    - dnf -y install skopeo

    # Log in to the GitLab Container Registry
    - echo "${CI_REGISTRY_PASSWORD}" |
        podman login ${CI_REGISTRY}
          --username ${CI_REGISTRY_USER}
          --password-stdin

    # Build the image
    - podman build -t ${IMAGE_NAME}:${CI_COMMIT_SHA} .

    # Push using Skopeo for efficiency
    - skopeo copy
        containers-storage:${IMAGE_NAME}:${CI_COMMIT_SHA}
        docker://${IMAGE_NAME}:${CI_COMMIT_SHA}

promote-to-production:
  stage: promote
  image:
    name: quay.io/skopeo/stable
    entrypoint: [""]
  only:
    - tags
  script:
    # Promote the image directly between registries
    - skopeo copy
        --src-creds "${CI_REGISTRY_USER}:${CI_REGISTRY_PASSWORD}"
        --dest-creds "${PROD_REGISTRY_USER}:${PROD_REGISTRY_PASSWORD}"
        docker://${IMAGE_NAME}:${CI_COMMIT_SHA}
        docker://${PROD_REGISTRY}/myapp:${CI_COMMIT_TAG}
```

## Image Promotion Pipeline

A common CI/CD pattern promotes images through environments (dev, staging, production) without rebuilding.

```bash
#!/bin/bash
# promote-image.sh - Promote an image between environments

IMAGE="myapp"
SOURCE_TAG="$1"       # e.g., abc123 (commit SHA)
TARGET_ENV="$2"       # e.g., staging or production
TARGET_TAG="$3"       # e.g., v1.2.0

DEV_REGISTRY="dev-registry.example.com"
STAGING_REGISTRY="staging-registry.example.com"
PROD_REGISTRY="prod-registry.example.com"

# Determine the target registry based on environment
case "$TARGET_ENV" in
  staging)
    TARGET_REGISTRY="$STAGING_REGISTRY"
    ;;
  production)
    TARGET_REGISTRY="$PROD_REGISTRY"
    ;;
  *)
    echo "Unknown environment: $TARGET_ENV"
    exit 1
    ;;
esac

echo "Promoting ${IMAGE}:${SOURCE_TAG} -> ${TARGET_REGISTRY}/${IMAGE}:${TARGET_TAG}"

# Copy directly between registries - no local pull needed
skopeo copy \
  "docker://${DEV_REGISTRY}/${IMAGE}:${SOURCE_TAG}" \
  "docker://${TARGET_REGISTRY}/${IMAGE}:${TARGET_TAG}"

# Verify the promotion
DIGEST=$(skopeo inspect "docker://${TARGET_REGISTRY}/${IMAGE}:${TARGET_TAG}" | \
  jq -r '.Digest')
echo "Promoted successfully. Digest: ${DIGEST}"
```

## Vulnerability Scanning Before Promotion

Integrate image scanning into the pipeline using Skopeo to fetch images for scanning tools.

```bash
#!/bin/bash
# scan-and-promote.sh - Scan an image before promoting it

IMAGE="registry.example.com/myapp:${CI_COMMIT_SHA}"
SCAN_DIR="/tmp/scan-image"

# Export the image to a local OCI layout for scanning
mkdir -p "$SCAN_DIR"
skopeo copy \
  "docker://${IMAGE}" \
  "oci:${SCAN_DIR}"

# Run a vulnerability scanner (e.g., Trivy) on the exported image
trivy image --input "${SCAN_DIR}" --severity HIGH,CRITICAL --exit-code 1

# Only promote if the scan passes
if [ $? -eq 0 ]; then
  echo "Scan passed. Promoting image..."
  skopeo copy \
    "docker://${IMAGE}" \
    "docker://prod-registry.example.com/myapp:latest"
else
  echo "Scan failed. Image not promoted." >&2
  exit 1
fi

# Clean up
rm -rf "$SCAN_DIR"
```

## Multi-Architecture Build and Push

Build and push multi-arch images in CI/CD using Podman and Skopeo.

```bash
#!/bin/bash
# multiarch-build.sh - Build and push multi-arch images

IMAGE="registry.example.com/myapp"
TAG="${CI_COMMIT_TAG:-latest}"

# Build for multiple architectures
podman build --platform linux/amd64 -t "${IMAGE}:${TAG}-amd64" .
podman build --platform linux/arm64 -t "${IMAGE}:${TAG}-arm64" .

# Push each architecture
skopeo copy \
  "containers-storage:${IMAGE}:${TAG}-amd64" \
  "docker://${IMAGE}:${TAG}-amd64"

skopeo copy \
  "containers-storage:${IMAGE}:${TAG}-arm64" \
  "docker://${IMAGE}:${TAG}-arm64"

# Create and push a manifest list
podman manifest create "${IMAGE}:${TAG}"
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-amd64"
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-arm64"
podman manifest push "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
```

## Summary

Integrating Skopeo with Podman in CI/CD pipelines provides a secure, daemonless workflow for container image management. Skopeo excels at promoting images between registries without rebuilding, copying images for vulnerability scanning, and managing multi-architecture manifests. Whether you use GitHub Actions, GitLab CI, or custom scripts, the combination of Podman for building and Skopeo for registry operations gives you a production-grade container pipeline without the complexity of running a Docker daemon.

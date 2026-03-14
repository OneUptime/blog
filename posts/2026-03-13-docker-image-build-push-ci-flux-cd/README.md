# How to Configure Docker Image Build and Push in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Docker, CI/CD, Image Automation, GitOps, Container Registry

Description: Learn how to configure your CI system to build and push Docker images in a way that triggers Flux CD image automation for automated GitOps deployments.

---

## Introduction

The bridge between your CI system and Flux CD's image automation is the container registry. When CI pushes a new image tag, Flux CD's Image Reflector Controller polls the registry, detects the new tag, and—if the ImagePolicy matches—triggers the Image Update Automation to commit the new tag to Git and reconcile the cluster.

Getting this right requires that images are tagged consistently with a scheme that Flux ImagePolicy can interpret: semantic versioning, numeric build numbers, or timestamp-based tags. The CI configuration, image tagging strategy, and Flux ImagePolicy must all align for the automation to function reliably.

This guide covers CI-side configuration for building and pushing Docker images optimally for Flux CD, including multi-stage builds, build caching, and tag strategies for different environments.

## Prerequisites

- A Kubernetes cluster with Flux CD and the Image Automation controllers installed
- A container registry (GHCR, Docker Hub, ECR, GCR, or ACR)
- A CI system (GitHub Actions examples used here)
- Flux Image Automation installed: `flux install --components-extra=image-reflector-controller,image-automation-controller`

## Step 1: Enable Flux Image Automation Controllers

Ensure the image automation controllers are installed:

```bash
# Check if image controllers are running
kubectl get pods -n flux-system | grep image

# If not present, reinstall with extra components
flux install \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Step 2: Choose a Tag Strategy

Flux ImagePolicy supports three tag strategies:

```yaml
# Option 1: SemVer (for release tags like v1.2.3)
policy:
  semver:
    range: ">=1.0.0"

# Option 2: Numerical (for build numbers like 1234)
policy:
  numerical:
    order: asc

# Option 3: Alphabetical (for timestamp-based tags like 20240101T120000Z)
policy:
  alphabetical:
    order: asc
```

SemVer is recommended for production. Use timestamp-based tags for development/staging environments.

## Step 3: Configure GitHub Actions for SemVer Image Build

```yaml
# .github/workflows/build.yml
name: Build and Push

on:
  push:
    tags:
      - 'v*.*.*'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            # SemVer tag (strips the 'v' prefix, e.g. v1.2.3 -> 1.2.3)
            type=semver,pattern={{version}}
            # Major.minor tag (e.g. 1.2)
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # Enable layer caching
          cache-from: type=gha
          cache-to: type=gha,mode=max
          # Build args for traceability
          build-args: |
            GIT_COMMIT=${{ github.sha }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
```

## Step 4: Configure for Development Branch (Timestamp Tags)

For staging environments that track the latest main branch build:

```yaml
# .github/workflows/build-dev.yml
name: Build Dev Image

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate timestamp tag
        id: timestamp
        run: echo "tag=$(date -u +'%Y%m%dT%H%M%SZ')" >> $GITHUB_OUTPUT

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push with timestamp tag
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ steps.timestamp.outputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Step 5: Configure Flux ImageRepository and ImagePolicy

```yaml
# Production policy: tracks SemVer releases
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  image: ghcr.io/your-org/myapp
  interval: 1m
  secretRef:
    name: ghcr-auth
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp-production
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"
---
# Staging policy: tracks latest timestamp-tagged build
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp-production
  filterTags:
    # Only consider tags matching timestamp format
    pattern: '^[0-9]{8}T[0-9]{6}Z$'
  policy:
    alphabetical:
      order: asc
```

## Step 6: Create the Registry Authentication Secret

```bash
# For GHCR
kubectl create secret docker-registry ghcr-auth \
  --docker-server=ghcr.io \
  --docker-username=your-username \
  --docker-password=your-pat \
  --namespace=flux-system
```

## Best Practices

- Never tag production images with `latest`; always use SemVer or explicit build identifiers.
- Use Docker Buildx with GitHub Actions cache (`type=gha`) to significantly reduce build times.
- Include `GIT_COMMIT` and `BUILD_DATE` build args so running containers are traceable to their source commit.
- Use multi-architecture builds (`--platform linux/amd64,linux/arm64`) if your cluster has mixed node types.
- Set `filterTags.pattern` in ImagePolicy to narrow down tag candidates and improve polling efficiency.
- Rotate registry pull secrets stored in Kubernetes using a secret management solution like External Secrets Operator.

## Conclusion

The quality of your image tagging strategy directly determines how reliably Flux CD image automation functions. Consistent SemVer tags for production and timestamp tags for staging, combined with appropriate ImagePolicy ranges, give you a fully automated image promotion pipeline that is both predictable and auditable.

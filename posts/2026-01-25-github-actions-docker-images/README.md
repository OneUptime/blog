# How to Build Docker Images with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Docker, Container Registry, CI/CD, BuildKit, Multi-Architecture

Description: Learn how to build, tag, and push Docker images with GitHub Actions. This guide covers BuildKit, multi-architecture builds, layer caching, security scanning, and publishing to GitHub Container Registry.

---

Building Docker images in CI ensures every deployment uses the same artifact. GitHub Actions provides excellent Docker support through official actions and native integration with GitHub Container Registry. This guide shows you how to build production-ready container images with proper caching, security scanning, and multi-architecture support.

## Basic Docker Build Workflow

Start with a simple workflow that builds and pushes an image:

```yaml
# .github/workflows/docker.yml
name: Docker Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

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
      - uses: actions/checkout@v4

      # Login to GitHub Container Registry
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Build and push image
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

## Setting Up BuildKit with buildx

BuildKit provides faster builds, better caching, and advanced features:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Set up QEMU for multi-arch builds
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      # Set up Docker buildx
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Build with BuildKit features
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          # BuildKit cache
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Image Tagging Strategies

Use Docker metadata action for automatic tagging:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Generate tags based on git context
      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            # Branch name
            type=ref,event=branch
            # PR number
            type=ref,event=pr
            # Git short SHA
            type=sha,prefix=
            # Semantic version from tag
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            # Latest on default branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

This creates tags like:
- `main` for pushes to main branch
- `pr-42` for pull request 42
- `abc1234` for commit SHA
- `1.2.3`, `1.2`, `1` for git tag v1.2.3
- `latest` for default branch

## Multi-Architecture Builds

Build images for AMD64 and ARM64:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # QEMU enables cross-platform builds
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push multi-arch
        uses: docker/build-push-action@v5
        with:
          context: .
          # Build for both architectures
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

The registry stores a manifest list that points to architecture-specific images. Docker clients automatically pull the correct image for their platform.

## Layer Caching Strategies

Optimize build times with caching:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Option 1: GitHub Actions cache (simplest)
      - name: Build with GHA cache
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Option 2: Registry cache (shares across workflows)
      - name: Build with registry cache
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:cache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:cache,mode=max
```

## Security Scanning

Scan images for vulnerabilities before pushing:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      # Build locally first (don't push yet)
      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          load: true  # Load into local Docker
          tags: myapp:scan

      # Scan with Trivy
      - name: Scan for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:scan
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      # Upload results to GitHub Security tab
      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      # Fail if critical vulnerabilities found
      - name: Check for critical vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:scan
          exit-code: '1'
          severity: 'CRITICAL'

      # Push only if scan passes
      - name: Login and push
        if: success() && github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push image
        if: success() && github.event_name != 'pull_request'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

## Build Arguments and Secrets

Pass build-time arguments and secrets:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Build with arguments
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          # Build arguments (visible in image layers)
          build-args: |
            NODE_VERSION=20
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
            GIT_SHA=${{ github.sha }}
          # Build secrets (not stored in image)
          secrets: |
            npm_token=${{ secrets.NPM_TOKEN }}
```

In your Dockerfile:

```dockerfile
# Use build arguments
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

# Build arguments become labels
ARG BUILD_DATE
ARG GIT_SHA
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$GIT_SHA

# Use secrets (requires BuildKit)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) \
    npm ci
```

## Multiple Registries

Push to multiple registries simultaneously:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      # Login to GitHub Container Registry
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Login to Docker Hub
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # Login to AWS ECR
      - name: Login to ECR
        uses: docker/login-action@v3
        with:
          registry: 123456789.dkr.ecr.us-east-1.amazonaws.com
          username: ${{ secrets.AWS_ACCESS_KEY_ID }}
          password: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Push to all registries
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/myapp:latest
            123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

## Matrix Builds for Multiple Images

Build multiple images in parallel:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        include:
          - context: ./api
            image: myorg/api
          - context: ./web
            image: myorg/web
          - context: ./worker
            image: myorg/worker

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push ${{ matrix.image }}
        uses: docker/build-push-action@v5
        with:
          context: ${{ matrix.context }}
          push: true
          tags: ghcr.io/${{ matrix.image }}:${{ github.sha }}
          cache-from: type=gha,scope=${{ matrix.image }}
          cache-to: type=gha,scope=${{ matrix.image }},mode=max
```

## Provenance and SBOM

Generate supply chain attestations:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      packages: write
      id-token: write  # Required for provenance

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build with provenance
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          # Generate SLSA provenance
          provenance: true
          # Generate Software Bill of Materials
          sbom: true
```

Verify provenance after push:

```bash
# View attestations
docker buildx imagetools inspect ghcr.io/myorg/myapp:latest --format "{{json .Provenance}}"
```

## Optimized PR Workflow

Build without pushing for PRs, push only on merge:

```yaml
name: Docker

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          # Push only on main branch
          push: ${{ github.event_name != 'pull_request' }}
          # Load into local Docker for PRs (enables testing)
          load: ${{ github.event_name == 'pull_request' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Run tests against the image on PRs
      - name: Test image
        if: github.event_name == 'pull_request'
        run: |
          docker run --rm ghcr.io/${{ github.repository }}:${{ github.sha }} npm test
```

---

Building Docker images in GitHub Actions combines the reliability of containerization with the automation of CI/CD. Start with basic builds, add caching to speed up iterations, and include security scanning before pushing to production registries. Multi-architecture builds ensure your images work everywhere, from developer laptops to ARM-based cloud instances.

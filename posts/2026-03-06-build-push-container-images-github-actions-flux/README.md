# How to Build and Push Container Images with GitHub Actions for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, github actions, container images, docker, ghcr, multi-arch, ci/cd

Description: Learn how to build and push container images with GitHub Actions using multi-arch builds, tagging strategies, and GHCR integration for Flux CD deployments.

---

## Introduction

Building and pushing container images is a critical step in any CI/CD pipeline. When working with Flux CD, your container images need to be built, tagged properly, and pushed to a registry where Flux can scan for updates. GitHub Actions provides a powerful platform for automating this process, including support for multi-architecture builds, caching, and integration with GitHub Container Registry (GHCR).

This guide covers Docker image building with GitHub Actions, multi-arch support, tagging strategies, and how to configure Flux to pick up new images automatically.

## Prerequisites

- A GitHub repository with a Dockerfile
- A Kubernetes cluster with Flux CD bootstrapped
- Flux image automation controllers installed
- Basic understanding of Docker and container registries

## Step 1: Set Up a Basic Build Workflow

Start with a straightforward workflow that builds and pushes a Docker image to GHCR.

```yaml
# .github/workflows/build.yaml
name: Build and Push Container Image

on:
  push:
    branches:
      - main
    tags:
      # Trigger on semantic version tags
      - "v*.*.*"
  pull_request:
    branches:
      - main

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
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            # Tag with branch name
            type=ref,event=branch
            # Tag with PR number
            type=ref,event=pr
            # Tag with semver from git tag
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            # Tag with short SHA for every commit
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          # Only push on main branch and tags, not PRs
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # Enable build caching via registry
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Step 2: Add Multi-Architecture Builds

Support both AMD64 and ARM64 architectures for broader compatibility.

```yaml
# .github/workflows/build-multiarch.yaml
name: Multi-Arch Build and Push

on:
  push:
    branches:
      - main
    tags:
      - "v*.*.*"

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
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up QEMU for multi-arch builds
        uses: docker/setup-qemu-action@v3
        with:
          # Install QEMU emulators for cross-platform builds
          platforms: linux/amd64,linux/arm64

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
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v5
        with:
          context: .
          # Build for both AMD64 and ARM64
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Step 3: Implement Tagging Strategies

Define a clear tagging strategy that works well with Flux image automation.

### Semantic Versioning Tags

```yaml
# Extract semver tags for Flux to track
- name: Extract metadata with semver
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
    tags: |
      # Full version: v1.2.3 -> 1.2.3
      type=semver,pattern={{version}}
      # Major.minor: v1.2.3 -> 1.2
      type=semver,pattern={{major}}.{{minor}}
      # Major only: v1.2.3 -> 1
      type=semver,pattern={{major}}
```

### Timestamp-Based Tags

```yaml
# Use timestamp tags for branches without semver
- name: Generate timestamp tag
  id: timestamp
  run: |
    echo "tag=$(date +'%Y%m%d%H%M%S')-$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

- name: Extract metadata with timestamp
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
    tags: |
      # Custom timestamp-based tag
      type=raw,value=${{ steps.timestamp.outputs.tag }}
      # Also tag with branch name
      type=ref,event=branch
```

### Branch-Based Tags with Build Number

```yaml
- name: Extract metadata with build number
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
    tags: |
      # Branch name with run number: main-42
      type=raw,value=${{ github.ref_name }}-${{ github.run_number }}
      # Short SHA
      type=sha,prefix=
```

## Step 4: Configure Flux Image Automation

Set up Flux to scan GHCR and automatically update deployments when new images are available.

```yaml
# clusters/production/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
```

Match the image policy to your tagging strategy:

```yaml
# For semver tags
# clusters/production/image-policy-semver.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Track patch releases within the 1.x range
      range: ">=1.0.0 <2.0.0"
```

```yaml
# For timestamp-based tags
# clusters/production/image-policy-timestamp.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match timestamp tags like 20260306120000-abc1234
    pattern: "^(?P<ts>[0-9]{14})-[a-f0-9]+"
    extract: "$ts"
  policy:
    numerical:
      # Use the timestamp for ordering
      order: asc
```

## Step 5: Create GHCR Credentials for Flux

Create a Kubernetes secret so Flux can access GHCR:

```bash
# Create a GitHub personal access token with read:packages scope
# Then create the secret
kubectl create secret docker-registry ghcr-credentials \
  --namespace flux-system \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-pat> \
  --docker-email=<your-email>
```

## Step 6: Set Up Image Update Automation

Configure Flux to commit image tag updates back to your Git repository:

```yaml
# clusters/production/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        chore: update container images

        Automation: {{ range .Changed.Changes }}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

Mark your deployment manifests with image policy markers:

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # The comment marker tells Flux which policy to use for updating this tag
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Step 7: Add Security Scanning

Add vulnerability scanning to your build pipeline:

```yaml
  scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: "sarif"
          output: "trivy-results.sarif"
          # Fail the build on critical vulnerabilities
          severity: "CRITICAL,HIGH"
          exit-code: "1"

      - name: Upload scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "trivy-results.sarif"
```

## Step 8: Optimize Build Performance

Use build caching and layer optimization to speed up builds.

```dockerfile
# Dockerfile with optimized layer caching
# Stage 1: Install dependencies (cached unless package files change)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production image (minimal size)
FROM node:20-alpine AS runner
WORKDIR /app
# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER appuser
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

## Step 9: Verify the Pipeline

Test the complete build and deployment flow:

```bash
# Create a new tag to trigger the build
git tag v1.1.0
git push origin v1.1.0

# Watch the GitHub Actions run
gh run watch

# Check that Flux detected the new image
flux get image repository my-app

# Verify the image policy resolved the new tag
flux get image policy my-app

# Check the deployment was updated
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Troubleshooting

### Build Failures

```bash
# Check GitHub Actions logs
gh run view --log-failed

# Test the build locally
docker buildx build --platform linux/amd64,linux/arm64 -t test:latest .
```

### Image Not Appearing in Flux

```bash
# Check the image repository scan status
flux get image repository my-app

# Force a scan
flux reconcile image repository my-app

# Check source controller logs
kubectl logs -n flux-system deployment/source-controller
```

### GHCR Permission Issues

```bash
# Verify package visibility settings in GitHub
# Navigate to: github.com/orgs/<org>/packages

# Check the secret is correctly configured
kubectl get secret ghcr-credentials -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

## Conclusion

You now have a robust container image build pipeline with GitHub Actions that integrates seamlessly with Flux CD. Multi-architecture builds ensure your images run on any platform, proper tagging strategies help Flux track the right versions, and build caching keeps your pipelines fast. This foundation supports scaling to many services and environments while maintaining a consistent build and deployment workflow.

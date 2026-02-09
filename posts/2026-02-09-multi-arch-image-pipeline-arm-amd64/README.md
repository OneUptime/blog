# How to Build a Multi-Architecture Container Image Pipeline for Kubernetes ARM and AMD64 Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Docker, Multi-Architecture, ARM, CI/CD

Description: Build CI/CD pipelines that create multi-architecture container images supporting both ARM64 and AMD64 platforms for heterogeneous Kubernetes clusters with cost-effective ARM nodes.

---

Kubernetes clusters increasingly use ARM nodes for cost savings and efficiency. Multi-architecture images allow the same container to run on both ARM64 and AMD64 nodes seamlessly. This guide demonstrates building CI/CD pipelines that create multi-arch images using Docker Buildx and other tools, enabling flexible deployment across different processor architectures.

## Understanding Multi-Architecture Images

Multi-architecture images are container manifests that reference multiple platform-specific images. When you pull a multi-arch image, Docker automatically selects the correct architecture. This allows a single image tag to work on any platform, simplifying deployments to heterogeneous clusters.

## Setting Up Docker Buildx

Enable Buildx for multi-platform builds:

```bash
# Create builder instance
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

# Verify platforms
docker buildx ls

# Should show: linux/amd64, linux/arm64, linux/arm/v7, etc.
```

## Building Multi-Arch Images Locally

Build for multiple architectures:

```bash
# Build and push for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/myapp:v1.0.0 \
  --push \
  .

# Build and load (single platform only)
docker buildx build \
  --platform linux/amd64 \
  -t myapp:local \
  --load \
  .
```

Inspect the manifest:

```bash
# View manifest list
docker buildx imagetools inspect registry.example.com/myapp:v1.0.0

# Check specific architecture
docker manifest inspect registry.example.com/myapp:v1.0.0 | jq '.manifests[].platform'
```

## Creating Architecture-Aware Dockerfiles

Optimize Dockerfile for multiple architectures:

```dockerfile
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.21 AS builder

# Build arguments for cross-compilation
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Cross-compile for target platform
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -o /app/server .

# Runtime image
FROM alpine:latest

# Install architecture-specific dependencies if needed
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server /usr/local/bin/server

ENTRYPOINT ["server"]
```

Handle architecture-specific base images:

```dockerfile
# syntax=docker/dockerfile:1

# Use architecture-specific images
ARG TARGETARCH
FROM --platform=$TARGETPLATFORM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Architecture-specific optimizations
RUN if [ "$TARGETARCH" = "arm64" ]; then \
        npm rebuild --arch=arm64; \
    fi

CMD ["node", "server.js"]
```

## GitHub Actions Multi-Arch Pipeline

Create a workflow for multi-platform builds:

```yaml
name: Build Multi-Arch Image
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: registry.example.com/myapp
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=registry.example.com/myapp:buildcache
          cache-to: type=registry,ref=registry.example.com/myapp:buildcache,mode=max
```

## GitLab CI Multi-Arch Pipeline

Build with GitLab CI:

```yaml
variables:
  IMAGE_NAME: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

stages:
  - build

build-multiarch:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker buildx create --use --name multiarch
  script:
    - docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t $IMAGE_NAME \
        -t $CI_REGISTRY_IMAGE:latest \
        --push \
        .
    - docker buildx imagetools inspect $IMAGE_NAME
```

## Using Separate Build Jobs

Build architectures in parallel:

```yaml
name: Parallel Multi-Arch Build
on: [push]

jobs:
  build-amd64:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build AMD64
        run: |
          docker buildx build \
            --platform linux/amd64 \
            -t registry.example.com/myapp:amd64-${{ github.sha }} \
            --push \
            .

  build-arm64:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2

      - name: Build ARM64
        run: |
          docker buildx build \
            --platform linux/arm64 \
            -t registry.example.com/myapp:arm64-${{ github.sha }} \
            --push \
            .

  create-manifest:
    needs: [build-amd64, build-arm64]
    runs-on: ubuntu-latest
    steps:
      - name: Create and push manifest
        run: |
          docker manifest create \
            registry.example.com/myapp:${{ github.sha }} \
            registry.example.com/myapp:amd64-${{ github.sha }} \
            registry.example.com/myapp:arm64-${{ github.sha }}

          docker manifest push registry.example.com/myapp:${{ github.sha }}
```

## Native ARM Builders

Use native ARM runners for faster builds:

```yaml
name: Native ARM Build
on: [push]

jobs:
  build-amd64:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build AMD64
        run: docker build -t registry.example.com/myapp:amd64 .

  build-arm64:
    runs-on: [self-hosted, linux, arm64]
    steps:
      - uses: actions/checkout@v3
      - name: Build ARM64
        run: docker build -t registry.example.com/myapp:arm64 .

  combine:
    needs: [build-amd64, build-arm64]
    runs-on: ubuntu-latest
    steps:
      - name: Create manifest
        run: |
          docker manifest create registry.example.com/myapp:latest \
            registry.example.com/myapp:amd64 \
            registry.example.com/myapp:arm64
          docker manifest push registry.example.com/myapp:latest
```

## Tekton Multi-Arch Pipeline

Build with Tekton:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: multiarch-build
spec:
  params:
    - name: image-name
    - name: git-url
    - name: git-revision

  workspaces:
    - name: source

  tasks:
    - name: clone
      taskRef:
        name: git-clone
      params:
        - name: url
          value: $(params.git-url)
        - name: revision
          value: $(params.git-revision)
      workspaces:
        - name: output
          workspace: source

    - name: build-amd64
      runAfter: [clone]
      taskRef:
        name: buildah
      params:
        - name: IMAGE
          value: $(params.image-name):amd64
        - name: FORMAT
          value: docker
        - name: BUILD_EXTRA_ARGS
          value: "--platform linux/amd64"
      workspaces:
        - name: source
          workspace: source

    - name: build-arm64
      runAfter: [clone]
      taskRef:
        name: buildah
      params:
        - name: IMAGE
          value: $(params.image-name):arm64
        - name: FORMAT
          value: docker
        - name: BUILD_EXTRA_ARGS
          value: "--platform linux/arm64"
      workspaces:
        - name: source
          workspace: source

    - name: create-manifest
      runAfter: [build-amd64, build-arm64]
      taskRef:
        name: create-multiarch-manifest
      params:
        - name: base-image
          value: $(params.image-name)
        - name: architectures
          value: "amd64,arm64"
```

## Testing Multi-Arch Images

Verify images work on both architectures:

```bash
# Test AMD64
docker run --platform linux/amd64 registry.example.com/myapp:latest

# Test ARM64
docker run --platform linux/arm64 registry.example.com/myapp:latest

# Let Docker choose
docker run registry.example.com/myapp:latest
```

Create test Kubernetes deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multiarch-test
spec:
  replicas: 4
  selector:
    matchLabels:
      app: multiarch-test
  template:
    metadata:
      labels:
        app: multiarch-test
    spec:
      containers:
        - name: app
          image: registry.example.com/myapp:latest
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
      # No architecture selector - works on any node
```

Check pod distribution:

```bash
# Verify pods run on different architectures
kubectl get pods -o wide

# Check which architecture each pod is using
kubectl get pods -o json | jq '.items[] | {
  name: .metadata.name,
  node: .spec.nodeName,
  arch: .status.hostIP
}'
```

## Optimizing Build Times

Use layer caching effectively:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.21 AS builder

# Cache dependencies separately
COPY go.mod go.sum ./
RUN go mod download

# Then copy and build source
COPY . .
RUN CGO_ENABLED=0 go build -o app .
```

Enable build caching:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --cache-from type=registry,ref=registry.example.com/myapp:buildcache \
  --cache-to type=registry,ref=registry.example.com/myapp:buildcache,mode=max \
  -t registry.example.com/myapp:latest \
  --push \
  .
```

## Handling Architecture-Specific Dependencies

Manage platform-specific packages:

```dockerfile
FROM alpine:latest

ARG TARGETARCH

# Install architecture-specific packages
RUN if [ "$TARGETARCH" = "amd64" ]; then \
        apk add --no-cache some-amd64-package; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        apk add --no-cache some-arm64-package; \
    fi

COPY app /usr/local/bin/app
CMD ["app"]
```

## Conclusion

Multi-architecture container images enable flexible Kubernetes deployments across ARM and AMD64 nodes. By using Docker Buildx and CI/CD automation, you create images that work seamlessly on any architecture, allowing you to leverage cost-effective ARM nodes while maintaining compatibility with AMD64 infrastructure. This approach future-proofs your containerized applications, simplifies deployment processes, and reduces operational overhead when managing heterogeneous clusters.

# How to Build Multi-Architecture Container Images Using Docker Buildx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Kubernetes, ARM, Multi-Architecture, Buildx

Description: Learn how to use Docker Buildx to create multi-architecture container images that run on both x86_64 and ARM64 Kubernetes nodes for cost-effective and efficient deployments.

---

ARM-based nodes like AWS Graviton offer better price-performance ratios than traditional x86 instances. Running workloads on ARM requires multi-architecture images that work across processor types. Docker Buildx makes building these images straightforward using QEMU emulation and cross-compilation. This guide shows you how to build and deploy multi-arch images for Kubernetes.

## Understanding Multi-Architecture Images

A multi-architecture image is a manifest list that contains references to architecture-specific image layers. When you pull an image, Docker automatically selects the variant matching your platform. This enables a single image tag to work across x86_64, ARM64, and other architectures seamlessly.

The manifest list acts as an index, pointing to separate images for each architecture. Each variant is built specifically for its target platform, ensuring optimal performance without emulation overhead at runtime. Buildx automates creating these manifest lists and building all variants in one operation.

## Setting Up Docker Buildx

Enable and configure Buildx for multi-platform builds.

```bash
# Check if buildx is available

docker buildx version

# Create a new builder instance
docker buildx create --name multiarch --driver docker-container --use

# Bootstrap the builder
docker buildx inspect --bootstrap

# List available platforms
docker buildx ls

# Expected output shows multiple platforms:
# linux/amd64, linux/arm64, linux/arm/v7, etc.
```

Install QEMU manually if your BuildKit setup does not already provide emulation:

```bash
# Install QEMU static binaries
docker run --privileged --rm tonistiigi/binfmt --install all

# Verify QEMU registration
docker run --privileged --rm tonistiigi/binfmt

# Check available formats
cat /proc/sys/fs/binfmt_misc/qemu-*
```

## Building Multi-Arch Images

Create Dockerfiles optimized for multi-architecture builds.

```dockerfile
# Dockerfile with multi-arch support
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder

# Build arguments for target platform
ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

WORKDIR /src

# Copy dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build for target architecture
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-w -s" -o /app/server ./cmd/server

# Runtime stage
FROM alpine:3.23

# Install runtime dependencies if needed
RUN apk add --no-cache ca-certificates

# Copy binary from builder
COPY --from=builder /app/server /server

# Run as non-root user
RUN adduser -D -u 1000 appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["/server"]
```

Build the multi-arch image:

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --tag mycompany/app:v1.0.0 \
  --push \
  .

# Build with cache optimization
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag mycompany/app:latest \
  --cache-from type=registry,ref=mycompany/app:buildcache \
  --cache-to type=registry,ref=mycompany/app:buildcache,mode=max \
  --push \
  .
```

## Optimizing Cross-Compilation

Use cross-compilation instead of emulation for faster builds.

```dockerfile
# Dockerfile with optimized cross-compilation
FROM --platform=$BUILDPLATFORM rust:1.95-slim AS builder

ARG TARGETARCH

WORKDIR /app

# Install cross-compilation toolchains
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc-aarch64-linux-gnu \
    gcc-arm-linux-gnueabihf \
    libc6-dev-arm64-cross \
    libc6-dev-armhf-cross \
    && rm -rf /var/lib/apt/lists/*

# Copy source
COPY . .

# Build with cross-compilation
RUN case "$TARGETARCH" in \
      amd64) TARGET="x86_64-unknown-linux-gnu" ;; \
      arm64) TARGET="aarch64-unknown-linux-gnu"; \
        export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc ;; \
      arm) TARGET="armv7-unknown-linux-gnueabihf"; \
        export CARGO_TARGET_ARMV7_UNKNOWN_LINUX_GNUEABIHF_LINKER=arm-linux-gnueabihf-gcc ;; \
      *) echo "Unsupported arch: $TARGETARCH" && exit 1 ;; \
    esac && \
    rustup target add $TARGET && \
    cargo build --release --target $TARGET && \
    cp target/$TARGET/release/app /app/binary

FROM debian:bookworm-slim
COPY --from=builder /app/binary /app
ENTRYPOINT ["/app"]
```

For Node.js applications:

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build application
RUN npm run build

# Runtime stage with architecture-specific base
FROM node:24-alpine

WORKDIR /app

# Copy dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Setting Up CI/CD for Multi-Arch Builds

Automate multi-arch image builds in CI pipelines.

```yaml
# .github/workflows/build-multi-arch.yml
name: Build Multi-Arch Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v6

    - name: Set up QEMU
      uses: docker/setup-qemu-action@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v4

    - name: Login to Docker Hub
      uses: docker/login-action@v4
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v6
      with:
        images: mycompany/app
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=sha

    - name: Build and push
      uses: docker/build-push-action@v7
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

GitLab CI configuration:

```yaml
# .gitlab-ci.yml
build-multi-arch:
  stage: build
  image: docker:29
  services:
    - docker:29-dind
  before_script:
    - docker run --privileged --rm tonistiigi/binfmt --install all
    - docker buildx create --use --name multiarch
    - docker buildx inspect --bootstrap
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY
  script:
    - |
      docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA \
        --tag $CI_REGISTRY_IMAGE:latest \
        --push \
        .
```

## Deploying Multi-Arch Images in Kubernetes

Deploy workloads that automatically select the correct architecture.

```yaml
# multi-arch-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-arch-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: multi-arch-app
  template:
    metadata:
      labels:
        app: multi-arch-app
    spec:
      # The container runtime pulls the variant matching the node architecture
      containers:
      - name: app
        image: mycompany/app:v1.0.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 500m
            memory: 512Mi
      # Optional: Use affinity to spread across architectures
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: multi-arch-app
              topologyKey: kubernetes.io/arch
```

Target specific architectures when needed:

```yaml
# arm-only-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arm-optimized-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: arm-app
  template:
    metadata:
      labels:
        app: arm-app
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: app
        image: mycompany/app:v1.0.0
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
```

## Verifying Multi-Arch Image Manifests

Inspect image manifests to verify all architectures are present.

```bash
# Check image manifest
docker buildx imagetools inspect mycompany/app:v1.0.0

# Expected output:
# Name:      mycompany/app:v1.0.0
# MediaType: application/vnd.oci.image.index.v1+json
# or: application/vnd.docker.distribution.manifest.list.v2+json
# Digest:    sha256:abc123...
#
# Manifests:
#   Name:      mycompany/app:v1.0.0@sha256:def456...
#   MediaType: application/vnd.oci.image.manifest.v1+json
#   Platform:  linux/amd64
#
#   Name:      mycompany/app:v1.0.0@sha256:ghi789...
#   MediaType: application/vnd.oci.image.manifest.v1+json
#   Platform:  linux/arm64

# Verify specific platform
docker pull --platform linux/arm64 mycompany/app:v1.0.0
docker inspect mycompany/app:v1.0.0 | jq '.[].Architecture'
```

Use manifest-tool for detailed inspection:

```bash
# Install manifest-tool
go install github.com/estesp/manifest-tool/v2/cmd/manifest-tool@latest

# Inspect manifest
manifest-tool inspect mycompany/app:v1.0.0
```

## Handling Architecture-Specific Dependencies

Manage dependencies that vary by architecture.

```dockerfile
# Dockerfile with architecture-specific logic
FROM --platform=$BUILDPLATFORM node:24-alpine AS builder

ARG TARGETARCH

WORKDIR /app

COPY package*.json ./

# Install architecture-specific native modules
RUN case "$TARGETARCH" in \
      amd64) \
        npm ci --omit=dev --platform=linux --arch=x64 ;; \
      arm64) \
        npm ci --omit=dev --platform=linux --arch=arm64 ;; \
      *) \
        npm ci --omit=dev ;; \
    esac

COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

For Python with compiled extensions:

```dockerfile
FROM --platform=$BUILDPLATFORM python:3.11-slim AS builder

ARG TARGETARCH

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python packages with platform-specific wheels
RUN case "$TARGETARCH" in \
      amd64) PLATFORM="manylinux_2_17_x86_64" ;; \
      arm64) PLATFORM="manylinux_2_17_aarch64" ;; \
      *) echo "Unsupported arch: $TARGETARCH" && exit 1 ;; \
    esac && \
    pip install --platform $PLATFORM --only-binary=:all: \
      --target /deps -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /deps /usr/local/lib/python3.11/site-packages
COPY . .
CMD ["python", "app.py"]
```

## Benchmarking ARM vs x86 Performance

Compare performance across architectures to optimize resource allocation.

```yaml
# benchmark-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: benchmark-amd64
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
      - name: benchmark
        image: mycompany/benchmark:latest
        command: ["./run-benchmark.sh"]
        resources:
          limits:
            cpu: 2000m
            memory: 4Gi
      restartPolicy: Never
---
apiVersion: batch/v1
kind: Job
metadata:
  name: benchmark-arm64
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: benchmark
        image: mycompany/benchmark:latest
        command: ["./run-benchmark.sh"]
        resources:
          limits:
            cpu: 2000m
            memory: 4Gi
      restartPolicy: Never
```

Benchmark script:

```bash
#!/bin/bash
# run-benchmark.sh

echo "Architecture: $(uname -m)"
echo "CPU Info: $(cat /proc/cpuinfo | grep 'model name' | head -1)"

# CPU benchmark
echo "Running CPU benchmark..."
sysbench cpu --cpu-max-prime=20000 run

# Memory benchmark
echo "Running memory benchmark..."
sysbench memory --memory-block-size=1M --memory-total-size=10G run

# Application-specific benchmark
echo "Running application benchmark..."
./app-benchmark

# Report results
echo "Benchmark complete"
```

## Troubleshooting Multi-Arch Builds

Debug common issues with multi-architecture builds.

```bash
# Check QEMU registration
docker run --privileged --rm tonistiigi/binfmt --install all
ls -la /proc/sys/fs/binfmt_misc/

# Test cross-platform execution
docker run --rm --platform linux/arm64 alpine uname -m

# Debug build failures
docker buildx build \
  --platform linux/arm64 \
  --progress=plain \
  --no-cache \
  .

# Check builder instance
docker buildx inspect --bootstrap

# Remove and recreate builder if needed
docker buildx rm multiarch
docker buildx create --name multiarch --driver docker-container --use

# View build logs
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --progress=plain \
  . 2>&1 | tee build.log
```

Building multi-architecture container images with Docker Buildx enables running workloads efficiently across x86 and ARM Kubernetes nodes. This flexibility allows leveraging cost-effective ARM instances like AWS Graviton while maintaining compatibility with traditional x86 infrastructure. By automating multi-arch builds in CI/CD pipelines and testing images across architectures, you ensure seamless deployment to heterogeneous clusters. The performance and cost benefits of ARM make multi-arch support essential for modern Kubernetes deployments.

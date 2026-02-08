# How to Set Up Docker Build Cloud for Remote Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Build Cloud, Remote Builds, CI/CD, Buildx, DevOps, Cloud

Description: Set up Docker Build Cloud to offload image builds to remote cloud builders for faster CI/CD pipelines and local builds.

---

Docker Build Cloud lets you offload Docker image builds from your local machine or CI runner to Docker's managed cloud infrastructure. Instead of building images on your laptop or a resource-constrained CI worker, the build runs on dedicated remote builders with fast CPUs, lots of RAM, and a shared build cache. This is especially valuable for multi-platform builds, where building both amd64 and arm64 images locally requires slow emulation.

## Why Use Docker Build Cloud?

Local builds and CI builds have several pain points that remote builds solve:

- Multi-platform builds use QEMU emulation locally, which can be 5-10x slower than native builds
- CI runners often have limited CPU and memory, slowing down complex builds
- Build caches are lost between CI runs unless you set up registry caching manually
- Developer laptops slow down during large builds

Docker Build Cloud provides native arm64 and amd64 builders, persistent build cache across all team members, and faster builds through more powerful hardware.

## Prerequisites

You need:
- A Docker account with a Docker Build Cloud subscription (available on Team and Business plans)
- Docker Desktop 4.26+ or Docker Engine with buildx 0.12+
- An internet connection for communicating with the cloud builders

## Setting Up Docker Build Cloud

### Step 1: Log In to Docker

```bash
# Log in to your Docker account
docker login
```

### Step 2: Create a Cloud Builder

Create a cloud builder instance through the Docker Dashboard or CLI:

```bash
# Create a new cloud builder
docker buildx create --driver cloud myorg/mybuilder
```

Replace `myorg` with your Docker organization name. The builder name `mybuilder` can be anything you choose.

### Step 3: Verify the Builder

```bash
# List all available builders
docker buildx ls

# Inspect the cloud builder details
docker buildx inspect myorg/mybuilder
```

The output shows the available platforms (typically `linux/amd64` and `linux/arm64`) and the builder status.

### Step 4: Set It as the Default Builder

```bash
# Make the cloud builder the default for all builds
docker buildx use myorg/mybuilder
```

Now every `docker buildx build` and `docker buildx bake` command uses the cloud builder automatically.

## Building with Docker Build Cloud

Once the builder is configured, building works exactly the same as before. The only difference is where the build runs:

```bash
# Build an image using the cloud builder (same command as local)
docker buildx build -t myapp:latest .

# Build and push to a registry
docker buildx build -t ghcr.io/myorg/myapp:latest --push .

# Build for multiple platforms natively (no emulation needed)
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .
```

The multi-platform build runs on native hardware for each platform, so it finishes much faster than QEMU-emulated builds.

## Using with Docker Compose

Docker Compose can use the cloud builder when building images:

```bash
# Set the builder for compose builds
export BUILDX_BUILDER=myorg/mybuilder

# Build images defined in docker-compose.yml
docker compose build

# Or build and start services
docker compose up --build
```

## Using with Docker Bake

Docker Bake works seamlessly with cloud builders:

```hcl
# docker-bake.hcl - builds run on cloud infrastructure

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["api", "web", "worker"]
}

target "api" {
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["ghcr.io/myorg/api:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

target "web" {
  dockerfile = "web/Dockerfile"
  context    = "web"
  tags       = ["ghcr.io/myorg/web:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

target "worker" {
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags       = ["ghcr.io/myorg/worker:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
}
```

```bash
# Build all targets on cloud builders in parallel
docker buildx bake --push
```

Bake automatically parallelizes independent targets across cloud builders, which is often faster than building sequentially on a single CI runner.

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/build.yml
name: Build with Docker Build Cloud

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Set up Docker Build Cloud
        uses: docker/setup-buildx-action@v3
        with:
          version: "lab:latest"
          driver: cloud
          endpoint: "myorg/mybuilder"

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            myorg/myapp:${{ github.sha }}
            myorg/myapp:latest
          platforms: linux/amd64,linux/arm64
```

### GitLab CI

```yaml
# .gitlab-ci.yml
build:
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"
    - docker buildx create --driver cloud myorg/mybuilder --use
  script:
    - docker buildx build
        --platform linux/amd64,linux/arm64
        --push
        -t "myorg/myapp:${CI_COMMIT_SHA}"
        -t "myorg/myapp:latest"
        .
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
                sh 'docker buildx create --driver cloud myorg/mybuilder --use'
                sh '''
                    docker buildx build \
                      --platform linux/amd64,linux/arm64 \
                      --push \
                      -t myorg/myapp:${BUILD_NUMBER} \
                      -t myorg/myapp:latest \
                      .
                '''
            }
        }
    }
}
```

## Shared Build Cache

One of the biggest benefits of Docker Build Cloud is the shared cache. When one team member or CI run builds an image, the cache layers are stored in the cloud. The next build by any team member or CI run reuses those cached layers.

This means:
- Developer A builds the image locally. The cache is stored in the cloud.
- Developer B builds the same image. Cache hits make it nearly instant.
- CI pushes a new commit. Only the changed layers need rebuilding.

You do not need to configure cache-to or cache-from. The cloud builder manages the cache automatically.

```bash
# First build (full build, cache is populated)
time docker buildx build -t myapp:test .
# Build time: 3m 42s

# Second build with no changes (everything from cache)
time docker buildx build -t myapp:test .
# Build time: 8s
```

## Managing Build Cloud Resources

### View Build History

```bash
# List recent builds on the cloud builder
docker buildx history myorg/mybuilder
```

### Remove the Cloud Builder

```bash
# Remove the cloud builder when no longer needed
docker buildx rm myorg/mybuilder
```

### Switch Between Local and Cloud Builders

```bash
# Use cloud builder
docker buildx use myorg/mybuilder

# Switch back to local builder
docker buildx use default

# Use a specific builder for a single build without switching
docker buildx build --builder myorg/mybuilder -t myapp:latest .
```

## Cost and Performance Considerations

Docker Build Cloud build minutes are metered based on your subscription plan. Here are tips to optimize usage:

**Use .dockerignore aggressively:** A large build context takes time to upload to the cloud builder. Exclude unnecessary files:

```
# .dockerignore - reduce build context size
.git
node_modules
*.md
tests/
docs/
.env*
```

**Optimize Dockerfile layer ordering:** Put rarely-changing layers (dependency installation) before frequently-changing layers (source code) to maximize cache hits.

**Use build arguments for cache-busting selectively:** Only bust cache on layers that need it, not the entire build.

```dockerfile
# Dependencies rarely change - cached aggressively
COPY package.json package-lock.json ./
RUN npm ci

# Source changes frequently - only this layer rebuilds
COPY src/ ./src/
RUN npm run build
```

## Fallback to Local Builds

Set up a fallback so builds work even without cloud access:

```bash
#!/bin/bash
# build.sh - try cloud builder, fall back to local

CLOUD_BUILDER="myorg/mybuilder"

# Check if cloud builder is available
if docker buildx inspect "$CLOUD_BUILDER" > /dev/null 2>&1; then
  echo "Using cloud builder"
  docker buildx build --builder "$CLOUD_BUILDER" "$@"
else
  echo "Cloud builder unavailable, using local builder"
  docker buildx build "$@"
fi
```

## Summary

Docker Build Cloud removes build infrastructure from your to-do list. Point your buildx at the cloud builder, and your builds run on dedicated hardware with a persistent shared cache. Multi-platform builds run natively instead of through slow QEMU emulation. CI pipelines finish faster because they offload heavy computation. And the shared cache means redundant builds across your team become cache hits instead of full rebuilds. Set it up once, and every `docker buildx build` command benefits automatically.

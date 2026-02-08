# How to Write Docker Bake HCL Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Bake, Buildx, HCL, CI/CD, DevOps, Build Automation

Description: Learn how to write Docker Bake HCL files to define multi-image builds with targets, groups, and shared configurations.

---

Docker Bake is a high-level build tool built on top of `docker buildx`. It lets you define multiple build targets in a single file, share configuration between them, and build everything with one command. Think of it as a Makefile for Docker builds, but with proper syntax and built-in support for multi-platform images, build arguments, and cache management.

Bake supports three file formats: HCL (HashiCorp Configuration Language), JSON, and Docker Compose. HCL is the most expressive and the recommended choice for anything beyond trivial setups. This guide focuses on writing effective HCL bake files.

## Your First Bake File

Create a file named `docker-bake.hcl` in your project root:

```hcl
# docker-bake.hcl - simple single-target build

# Define a build target
target "app" {
  # Path to the Dockerfile
  dockerfile = "Dockerfile"

  # Build context directory
  context = "."

  # Tags for the resulting image
  tags = ["myapp:latest"]
}
```

Build it:

```bash
# Build the "app" target defined in docker-bake.hcl
docker buildx bake app
```

## Multiple Targets

Real projects have multiple images. Define each as a separate target:

```hcl
# docker-bake.hcl - multiple build targets

target "frontend" {
  dockerfile = "frontend/Dockerfile"
  context    = "frontend"
  tags       = ["myapp/frontend:latest"]
}

target "api" {
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["myapp/api:latest"]
}

target "worker" {
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags       = ["myapp/worker:latest"]
}

target "nginx" {
  dockerfile = "nginx/Dockerfile"
  context    = "nginx"
  tags       = ["myapp/nginx:latest"]
}
```

Build all targets at once:

```bash
# Build all targets in parallel
docker buildx bake

# Build specific targets
docker buildx bake frontend api
```

By default, `docker buildx bake` builds all targets in the file. Bake parallelizes builds automatically when targets are independent.

## Groups

Groups let you build subsets of targets together:

```hcl
# docker-bake.hcl - with groups

# Build all application images
group "app" {
  targets = ["frontend", "api", "worker"]
}

# Build all infrastructure images
group "infra" {
  targets = ["nginx", "redis-custom"]
}

# Build everything
group "default" {
  targets = ["app", "infra"]
}

target "frontend" {
  dockerfile = "frontend/Dockerfile"
  context    = "frontend"
  tags       = ["myapp/frontend:latest"]
}

target "api" {
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["myapp/api:latest"]
}

target "worker" {
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags       = ["myapp/worker:latest"]
}

target "nginx" {
  dockerfile = "nginx/Dockerfile"
  context    = "nginx"
  tags       = ["myapp/nginx:latest"]
}

target "redis-custom" {
  dockerfile = "redis/Dockerfile"
  context    = "redis"
  tags       = ["myapp/redis:latest"]
}
```

```bash
# Build only application images
docker buildx bake app

# Build only infrastructure images
docker buildx bake infra

# Build the "default" group (everything)
docker buildx bake
```

The `default` group is special. It is what runs when you call `docker buildx bake` with no arguments.

## Variables

Variables make your bake files configurable:

```hcl
# docker-bake.hcl - with variables

# Define variables with defaults
variable "REGISTRY" {
  default = "docker.io"
}

variable "IMAGE_PREFIX" {
  default = "myapp"
}

variable "TAG" {
  default = "latest"
}

variable "GO_VERSION" {
  default = "1.22"
}

group "default" {
  targets = ["api", "worker"]
}

target "api" {
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["${REGISTRY}/${IMAGE_PREFIX}/api:${TAG}"]
  args = {
    GO_VERSION = GO_VERSION
  }
}

target "worker" {
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags       = ["${REGISTRY}/${IMAGE_PREFIX}/worker:${TAG}"]
  args = {
    GO_VERSION = GO_VERSION
  }
}
```

Override variables at build time:

```bash
# Use default values
docker buildx bake

# Override the tag and registry
TAG=2.1.0 REGISTRY=ghcr.io docker buildx bake

# Override just one variable
TAG=dev docker buildx bake api
```

## Target Inheritance

Targets can inherit from other targets, which eliminates duplication:

```hcl
# docker-bake.hcl - target inheritance

variable "TAG" {
  default = "latest"
}

# Base target with shared settings (not built directly)
target "_base" {
  args = {
    NODE_VERSION = "20"
    PNPM_VERSION = "8"
  }
  labels = {
    "org.opencontainers.image.source" = "https://github.com/myorg/myapp"
    "org.opencontainers.image.vendor" = "MyOrg"
  }
}

# Production base adds production-specific settings
target "_production" {
  inherits = ["_base"]
  args = {
    NODE_ENV = "production"
  }
}

target "frontend" {
  inherits   = ["_production"]
  dockerfile = "frontend/Dockerfile"
  context    = "frontend"
  tags       = ["myapp/frontend:${TAG}"]
}

target "api" {
  inherits   = ["_production"]
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["myapp/api:${TAG}"]
}

target "dev-tools" {
  inherits   = ["_base"]    # Inherits base but not production
  dockerfile = "tools/Dockerfile"
  context    = "tools"
  tags       = ["myapp/dev-tools:${TAG}"]
  args = {
    NODE_ENV = "development"
  }
}
```

Targets starting with `_` (underscore) are conventionally used as abstract base targets that are not built directly.

## Multi-Platform Builds

Build images for multiple architectures:

```hcl
# docker-bake.hcl - multi-platform builds

variable "TAG" {
  default = "latest"
}

target "api" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["myapp/api:${TAG}"]

  # Build for both amd64 and arm64
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}

# Platform-specific target for local development (faster build)
target "api-local" {
  inherits  = ["api"]
  platforms = []    # Build for the current platform only
  tags      = ["myapp/api:dev"]
}
```

```bash
# Build multi-platform (requires push to registry or local store)
docker buildx bake api --push

# Build for local development (current platform only)
docker buildx bake api-local --load
```

## Cache Configuration

Configure build cache for faster subsequent builds:

```hcl
# docker-bake.hcl - with cache configuration

variable "CACHE_REPO" {
  default = "myapp/build-cache"
}

target "api" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["myapp/api:latest"]

  # Use registry-based cache
  cache-from = [
    "type=registry,ref=${CACHE_REPO}:api-cache"
  ]
  cache-to = [
    "type=registry,ref=${CACHE_REPO}:api-cache,mode=max"
  ]
}

# Local cache alternative
target "api-local-cache" {
  inherits = ["api"]
  cache-from = [
    "type=local,src=/tmp/docker-cache/api"
  ]
  cache-to = [
    "type=local,dest=/tmp/docker-cache/api,mode=max"
  ]
}
```

The `mode=max` option caches all build layers, not just the final ones. This maximizes cache hit rates but uses more storage.

## Build Arguments and Secrets

Pass build arguments and mount secrets:

```hcl
target "api" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["myapp/api:latest"]

  # Build arguments
  args = {
    NODE_VERSION   = "20"
    BUILD_DATE     = timestamp()
    GIT_SHA        = ""    # Override at build time
  }

  # Secret mounts for the build process
  secret = [
    "id=npm_token,env=NPM_TOKEN",
    "id=ssh_key,src=${HOME}/.ssh/id_rsa"
  ]
}
```

Use the secret in your Dockerfile:

```dockerfile
# Access the secret during build only (not stored in the image)
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm install
```

## Output Configuration

Control where build results go:

```hcl
target "api" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["myapp/api:latest"]

  # Output to local Docker image store
  output = ["type=docker"]
}

target "api-push" {
  inherits = ["api"]
  # Push directly to registry
  output = ["type=registry"]
}

target "api-tar" {
  inherits = ["api"]
  # Export as tar file
  output = ["type=tar,dest=./build/api.tar"]
}

target "api-local" {
  inherits = ["api"]
  # Export to a local directory (useful for inspecting the filesystem)
  output = ["type=local,dest=./build/api-fs"]
}
```

## Full Production Example

Here is a complete bake file for a typical multi-service application:

```hcl
# docker-bake.hcl - production-ready configuration

variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

variable "TAG" {
  default = "latest"
}

variable "NODE_VERSION" {
  default = "20"
}

variable "GO_VERSION" {
  default = "1.22"
}

# Default builds everything
group "default" {
  targets = ["frontend", "api", "worker", "migrations"]
}

# Shared labels for all images
target "_labels" {
  labels = {
    "org.opencontainers.image.source"   = "https://github.com/myorg/myapp"
    "org.opencontainers.image.revision" = TAG
    "org.opencontainers.image.created"  = timestamp()
  }
}

target "frontend" {
  inherits   = ["_labels"]
  dockerfile = "frontend/Dockerfile"
  context    = "frontend"
  tags = [
    "${REGISTRY}/frontend:${TAG}",
    "${REGISTRY}/frontend:latest"
  ]
  args = {
    NODE_VERSION = NODE_VERSION
    API_URL      = ""
  }
  platforms = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=registry,ref=${REGISTRY}/frontend:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/frontend:cache,mode=max"]
}

target "api" {
  inherits   = ["_labels"]
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags = [
    "${REGISTRY}/api:${TAG}",
    "${REGISTRY}/api:latest"
  ]
  args = {
    GO_VERSION = GO_VERSION
  }
  platforms = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=registry,ref=${REGISTRY}/api:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/api:cache,mode=max"]
}

target "worker" {
  inherits   = ["_labels"]
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags = [
    "${REGISTRY}/worker:${TAG}",
    "${REGISTRY}/worker:latest"
  ]
  args = {
    GO_VERSION = GO_VERSION
  }
  platforms = ["linux/amd64", "linux/arm64"]
}

target "migrations" {
  inherits   = ["_labels"]
  dockerfile = "migrations/Dockerfile"
  context    = "migrations"
  tags       = ["${REGISTRY}/migrations:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
}
```

Build and push all images:

```bash
# Build and push all images for a release
TAG=v2.1.0 docker buildx bake --push

# Build just the frontend for testing
TAG=test-123 docker buildx bake frontend --load

# Preview what would be built without building
docker buildx bake --print
```

The `--print` flag is invaluable for debugging. It shows the resolved build plan in JSON without building anything.

## Summary

Docker Bake HCL files bring structure and reusability to multi-image Docker builds. Define targets for each image, use groups to build subsets, share configuration through inheritance, and parameterize everything with variables. The HCL format is more readable and powerful than JSON or compose-based bake files, especially when you need inheritance, functions like `timestamp()`, and clean multi-platform configuration. Start with a simple bake file and grow it as your project adds more services.

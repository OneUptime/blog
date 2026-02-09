# How to Use Docker Bake with Variable Groups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Bake, Buildx, Variables, HCL, CI/CD, DevOps

Description: Organize and manage Docker Bake build variables using variable groups for cleaner multi-target build configurations.

---

As Docker Bake files grow, you end up with many variables scattered across targets. Variable groups help you organize related variables together, making your build configuration easier to read and maintain. Instead of a flat list of 20 variables at the top of your file, you group them by purpose: one group for version pinning, another for registry settings, another for feature flags.

This guide shows you how to structure variables in Docker Bake HCL files for projects of any size.

## Basic Variables Recap

Before diving into organization patterns, here is how standalone variables work in Bake:

```hcl
# docker-bake.hcl - standalone variables

variable "REGISTRY" {
  default = "docker.io/myorg"
}

variable "TAG" {
  default = "latest"
}

target "app" {
  tags = ["${REGISTRY}/app:${TAG}"]
}
```

Override at build time through environment variables:

```bash
# Environment variables override the defaults
REGISTRY=ghcr.io/myorg TAG=v2.0 docker buildx bake
```

## Organizing Variables by Purpose

Group related variables together with comments and consistent naming conventions:

```hcl
# docker-bake.hcl - organized variable layout

# ============================================================
# Registry and Image Settings
# ============================================================

variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

variable "IMAGE_PREFIX" {
  default = "myapp"
}

variable "TAG" {
  default = "latest"
}

# ============================================================
# Base Image Versions
# ============================================================

variable "NODE_VERSION" {
  default = "20"
}

variable "GO_VERSION" {
  default = "1.22"
}

variable "PYTHON_VERSION" {
  default = "3.12"
}

variable "ALPINE_VERSION" {
  default = "3.19"
}

# ============================================================
# Build Behavior
# ============================================================

variable "BUILD_CACHE_ENABLED" {
  default = "true"
}

variable "PUSH_IMAGES" {
  default = "false"
}

variable "TARGET_PLATFORMS" {
  default = "linux/amd64"
}
```

This is not a language-level "variable group" feature. HCL does not have a native grouping construct for variables. But the convention of organizing with comment headers and consistent prefixes works well in practice.

## Using Variables in Target Inheritance

Combine variables with target inheritance to create a layered configuration:

```hcl
# docker-bake.hcl - variables with target inheritance

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

variable "PLATFORMS" {
  default = ""
}

# Base target shared by all Node.js services
target "_node-base" {
  args = {
    NODE_VERSION = NODE_VERSION
  }
  labels = {
    "runtime" = "node"
    "node.version" = NODE_VERSION
  }
}

# Base target shared by all Go services
target "_go-base" {
  args = {
    GO_VERSION = GO_VERSION
  }
  labels = {
    "runtime" = "go"
    "go.version" = GO_VERSION
  }
}

# Base target for all images (registry, tags, platforms)
target "_registry" {
  platforms = PLATFORMS != "" ? split(",", PLATFORMS) : []
}

# Node.js services inherit both node-base and registry settings
target "frontend" {
  inherits   = ["_node-base", "_registry"]
  dockerfile = "frontend/Dockerfile"
  context    = "frontend"
  tags       = ["${REGISTRY}/frontend:${TAG}"]
}

target "bff" {
  inherits   = ["_node-base", "_registry"]
  dockerfile = "bff/Dockerfile"
  context    = "bff"
  tags       = ["${REGISTRY}/bff:${TAG}"]
}

# Go services inherit both go-base and registry settings
target "api" {
  inherits   = ["_go-base", "_registry"]
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["${REGISTRY}/api:${TAG}"]
}

target "worker" {
  inherits   = ["_go-base", "_registry"]
  dockerfile = "worker/Dockerfile"
  context    = "worker"
  tags       = ["${REGISTRY}/worker:${TAG}"]
}
```

Build with different configurations:

```bash
# Local development build (single platform, no push)
docker buildx bake --load

# CI build with multi-platform and push
PLATFORMS=linux/amd64,linux/arm64 TAG=v2.1.0 docker buildx bake --push
```

## Environment-Specific Variable Files

Split variables across multiple files for different environments. Bake loads all `docker-bake.hcl` and `docker-bake.override.hcl` files automatically:

```hcl
# docker-bake.hcl - base configuration with defaults

variable "REGISTRY" {
  default = "docker.io/myorg"
}

variable "TAG" {
  default = "latest"
}

variable "NODE_ENV" {
  default = "production"
}

group "default" {
  targets = ["app", "api"]
}

target "app" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/app:${TAG}"]
  args = {
    NODE_ENV = NODE_ENV
  }
}

target "api" {
  dockerfile = "api/Dockerfile"
  context    = "api"
  tags       = ["${REGISTRY}/api:${TAG}"]
}
```

```hcl
# docker-bake.override.hcl - local development overrides (auto-loaded)

variable "REGISTRY" {
  default = "local"
}

variable "TAG" {
  default = "dev"
}

variable "NODE_ENV" {
  default = "development"
}

# Override app target for development
target "app" {
  output = ["type=docker"]    # Load into local Docker
}
```

The override file is loaded automatically alongside the main file. Variables and targets in the override file take precedence.

For CI/CD, use a separate file:

```hcl
# docker-bake.ci.hcl - CI-specific configuration

variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

variable "GIT_SHA" {
  default = ""
}

target "app" {
  tags = [
    "${REGISTRY}/app:${TAG}",
    "${REGISTRY}/app:${GIT_SHA}",
    "${REGISTRY}/app:latest"
  ]
  cache-from = ["type=registry,ref=${REGISTRY}/app:cache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/app:cache,mode=max"]
  platforms  = ["linux/amd64", "linux/arm64"]
}
```

```bash
# CI build uses the CI-specific file
TAG=v2.1.0 GIT_SHA=$(git rev-parse --short HEAD) \
  docker buildx bake -f docker-bake.hcl -f docker-bake.ci.hcl --push
```

## Variable Validation Patterns

HCL does not have built-in variable validation, but you can use the `--print` flag to verify values:

```bash
# Print the resolved build plan to verify variable values
docker buildx bake --print 2>&1 | jq '.target.app.tags'
```

For scripted validation before building:

```bash
#!/bin/bash
# validate-and-build.sh - validate variables before building

# Check required variables
if [ -z "$TAG" ] || [ "$TAG" = "latest" ]; then
  echo "ERROR: TAG must be set to a specific version (got: '${TAG:-unset}')"
  exit 1
fi

if [ -z "$REGISTRY" ]; then
  echo "ERROR: REGISTRY must be set"
  exit 1
fi

# Print the build plan for review
echo "Build plan:"
docker buildx bake --print

# Build if validation passes
read -p "Proceed with build? [y/N] " confirm
if [ "$confirm" = "y" ]; then
  docker buildx bake --push
fi
```

## Dynamic Variables with Functions

HCL supports a few built-in functions you can use in variable expressions:

```hcl
variable "TAG" {
  default = "latest"
}

variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

target "app" {
  dockerfile = "Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/app:${TAG}"]
  labels = {
    # timestamp() generates the current time
    "org.opencontainers.image.created" = timestamp()

    # Use the TAG variable in labels too
    "org.opencontainers.image.version" = TAG
  }
}
```

## Sharing Variables Between Targets with Build Arguments

When multiple targets need the same build arguments, define them in a base target:

```hcl
# Shared dependency versions used across all services
variable "GRPC_VERSION" {
  default = "1.60.0"
}

variable "PROTOBUF_VERSION" {
  default = "25.2"
}

variable "OPENTELEMETRY_VERSION" {
  default = "1.32.0"
}

# Base target with shared dependency versions
target "_deps" {
  args = {
    GRPC_VERSION          = GRPC_VERSION
    PROTOBUF_VERSION      = PROTOBUF_VERSION
    OPENTELEMETRY_VERSION = OPENTELEMETRY_VERSION
  }
}

target "service-a" {
  inherits   = ["_deps"]
  dockerfile = "services/a/Dockerfile"
  context    = "."
  tags       = ["myapp/service-a:${TAG}"]
  # Can add service-specific args that merge with inherited ones
  args = {
    SERVICE_PORT = "8001"
  }
}

target "service-b" {
  inherits   = ["_deps"]
  dockerfile = "services/b/Dockerfile"
  context    = "."
  tags       = ["myapp/service-b:${TAG}"]
  args = {
    SERVICE_PORT = "8002"
  }
}

target "service-c" {
  inherits   = ["_deps"]
  dockerfile = "services/c/Dockerfile"
  context    = "."
  tags       = ["myapp/service-c:${TAG}"]
  args = {
    SERVICE_PORT = "8003"
  }
}
```

When a target inherits args and also defines its own, the args are merged. Service-specific args combine with the inherited dependency version args.

## Complete Multi-Environment Example

Here is a full example showing variable organization for a real project:

```hcl
# docker-bake.hcl - complete multi-environment build configuration

# --- Image Registry ---
variable "REGISTRY" {
  default = "ghcr.io/acme-corp"
}

variable "TAG" {
  default = "latest"
}

# --- Runtime Versions ---
variable "NODE_VERSION" {
  default = "20-alpine"
}

variable "GO_VERSION" {
  default = "1.22-alpine"
}

# --- Feature Flags ---
variable "ENABLE_PROFILING" {
  default = "false"
}

variable "ENABLE_TRACING" {
  default = "true"
}

# --- Build Settings ---
variable "PLATFORMS" {
  default = ""
}

variable "CACHE_TYPE" {
  default = "local"
}

# Groups
group "default" {
  targets = ["gateway", "auth", "orders", "notifications"]
}

group "core" {
  targets = ["gateway", "auth"]
}

# Shared configuration
target "_shared" {
  labels = {
    "org.opencontainers.image.vendor" = "Acme Corp"
    "org.opencontainers.image.version" = TAG
  }
  platforms = PLATFORMS != "" ? split(",", PLATFORMS) : []
}

# Targets
target "gateway" {
  inherits   = ["_shared"]
  context    = "services/gateway"
  tags       = ["${REGISTRY}/gateway:${TAG}"]
  args = {
    GO_VERSION       = GO_VERSION
    ENABLE_PROFILING = ENABLE_PROFILING
    ENABLE_TRACING   = ENABLE_TRACING
  }
}

target "auth" {
  inherits   = ["_shared"]
  context    = "services/auth"
  tags       = ["${REGISTRY}/auth:${TAG}"]
  args = {
    GO_VERSION     = GO_VERSION
    ENABLE_TRACING = ENABLE_TRACING
  }
}

target "orders" {
  inherits   = ["_shared"]
  context    = "services/orders"
  tags       = ["${REGISTRY}/orders:${TAG}"]
  args = {
    NODE_VERSION   = NODE_VERSION
    ENABLE_TRACING = ENABLE_TRACING
  }
}

target "notifications" {
  inherits   = ["_shared"]
  context    = "services/notifications"
  tags       = ["${REGISTRY}/notifications:${TAG}"]
  args = {
    NODE_VERSION = NODE_VERSION
  }
}
```

```bash
# Development
docker buildx bake --load

# Staging
TAG=rc-$(git rev-parse --short HEAD) ENABLE_PROFILING=true docker buildx bake --push

# Production release
TAG=v3.0.0 PLATFORMS=linux/amd64,linux/arm64 docker buildx bake --push
```

## Summary

Variable management in Docker Bake comes down to good organization rather than a special language feature. Use comment headers to group related variables, adopt consistent naming prefixes, and leverage target inheritance to share variable-derived build arguments across targets. Split environment-specific overrides into separate files, and always use `--print` to verify your variable resolution before building. Clean variable organization keeps your bake files maintainable as your project grows from one service to many.

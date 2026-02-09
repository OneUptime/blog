# How to Use Docker Bake with Matrix Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Bake, Buildx, Matrix Builds, CI/CD, DevOps, Multi-Platform

Description: Build multiple image variants from a single target definition using Docker Bake's matrix feature for version and platform combinations.

---

Docker Bake's matrix feature lets you generate multiple build targets from a single template. Instead of writing separate targets for each Go version, each platform, or each distribution variant, you define a matrix of values and Bake expands them automatically. This is similar to matrix strategies in GitHub Actions or GitLab CI, but applied to Docker image builds.

Matrix builds shine when you maintain libraries or tools that need to be built against multiple versions of a base image, or when you publish Alpine and Debian variants of the same application.

## Basic Matrix Syntax

The matrix block goes inside a target definition:

```hcl
# docker-bake.hcl - basic matrix build

target "app" {
  name       = "app-${item.variant}"
  dockerfile = "Dockerfile"
  context    = "."

  matrix = {
    item = [
      { variant = "alpine", base = "node:20-alpine" },
      { variant = "debian", base = "node:20-bookworm-slim" }
    ]
  }

  args = {
    BASE_IMAGE = item.base
  }

  tags = ["myapp:${item.variant}"]
}
```

This single target definition generates two build targets:
- `app-alpine` with `BASE_IMAGE=node:20-alpine`
- `app-debian` with `BASE_IMAGE=node:20-bookworm-slim`

Build both:

```bash
# Build all matrix variants
docker buildx bake

# Build a specific variant
docker buildx bake app-alpine

# Preview what targets the matrix generates
docker buildx bake --print
```

The `--print` flag is especially useful with matrix builds because it shows you exactly what targets were generated.

## Matrix with Version Combinations

Build your application against multiple versions of a runtime:

```hcl
# docker-bake.hcl - version matrix

variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

variable "APP_VERSION" {
  default = "latest"
}

target "app" {
  name       = "app-node${item.node_version}"
  dockerfile = "Dockerfile"
  context    = "."

  matrix = {
    item = [
      { node_version = "18", tag_suffix = "node18" },
      { node_version = "20", tag_suffix = "node20" },
      { node_version = "22", tag_suffix = "node22" }
    ]
  }

  args = {
    NODE_VERSION = item.node_version
  }

  tags = [
    "${REGISTRY}/app:${APP_VERSION}-${item.tag_suffix}",
    "${REGISTRY}/app:${item.tag_suffix}"
  ]
}
```

The Dockerfile uses the build argument to select the base image:

```dockerfile
# Dockerfile - uses NODE_VERSION from build args
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Multi-Dimensional Matrix

Combine multiple dimensions like runtime version and OS variant:

```hcl
# docker-bake.hcl - multi-dimensional matrix

variable "TAG" {
  default = "latest"
}

target "app" {
  name       = "app-py${replace(item.python, ".", "")}-${item.os}"
  dockerfile = "Dockerfile.${item.os}"
  context    = "."

  matrix = {
    item = [
      { python = "3.11", os = "alpine" },
      { python = "3.11", os = "debian" },
      { python = "3.12", os = "alpine" },
      { python = "3.12", os = "debian" }
    ]
  }

  args = {
    PYTHON_VERSION = item.python
  }

  tags = ["myapp:${TAG}-py${item.python}-${item.os}"]
}
```

This generates four targets:
- `app-py311-alpine`
- `app-py311-debian`
- `app-py312-alpine`
- `app-py312-debian`

## Matrix with Platform Variations

Build for different platforms with different optimization flags:

```hcl
target "app" {
  name       = "app-${item.arch}"
  dockerfile = "Dockerfile"
  context    = "."

  matrix = {
    item = [
      { arch = "amd64", platform = "linux/amd64", cflags = "-march=x86-64-v2" },
      { arch = "arm64", platform = "linux/arm64", cflags = "-march=armv8-a" }
    ]
  }

  platforms = [item.platform]

  args = {
    EXTRA_CFLAGS = item.cflags
  }

  tags = ["myapp:latest-${item.arch}"]
}
```

## Matrix for Database Driver Variants

A practical example where you build the same application with different database drivers:

```hcl
# docker-bake.hcl - database variant matrix

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["app"]
}

target "app" {
  name       = "app-${item.db}"
  dockerfile = "Dockerfile"
  context    = "."

  matrix = {
    item = [
      {
        db           = "postgres"
        db_package   = "libpq-dev"
        db_driver    = "pg"
        default_port = "5432"
      },
      {
        db           = "mysql"
        db_package   = "default-libmysqlclient-dev"
        db_driver    = "mysql2"
        default_port = "3306"
      },
      {
        db           = "sqlite"
        db_package   = "libsqlite3-dev"
        db_driver    = "sqlite3"
        default_port = ""
      }
    ]
  }

  args = {
    DB_PACKAGE   = item.db_package
    DB_DRIVER    = item.db_driver
    DEFAULT_PORT = item.default_port
  }

  tags = ["myapp:${TAG}-${item.db}"]
}
```

The Dockerfile installs only the needed database driver:

```dockerfile
FROM node:20-bookworm-slim

ARG DB_PACKAGE
ARG DB_DRIVER

# Install only the required database client library
RUN apt-get update && apt-get install -y --no-install-recommends ${DB_PACKAGE} && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./

# Install the specific database driver
RUN npm ci --production && npm install ${DB_DRIVER}

COPY . .
CMD ["node", "server.js"]
```

## Matrix with Inheritance

Combine matrix builds with target inheritance for shared settings:

```hcl
variable "REGISTRY" {
  default = "ghcr.io/myorg"
}

variable "TAG" {
  default = "latest"
}

# Shared settings for all builds
target "_base" {
  labels = {
    "org.opencontainers.image.source" = "https://github.com/myorg/tool"
    "org.opencontainers.image.version" = TAG
  }
  cache-from = ["type=registry,ref=${REGISTRY}/tool:cache"]
}

target "tool" {
  inherits = ["_base"]
  name     = "tool-${item.version}-${item.os}"

  matrix = {
    item = [
      { version = "1.0", os = "alpine", base = "alpine:3.19" },
      { version = "1.0", os = "ubuntu", base = "ubuntu:22.04" },
      { version = "1.1", os = "alpine", base = "alpine:3.19" },
      { version = "1.1", os = "ubuntu", base = "ubuntu:22.04" }
    ]
  }

  dockerfile = "Dockerfile.${item.os}"
  context    = "."

  args = {
    BASE_IMAGE   = item.base
    TOOL_VERSION = item.version
  }

  tags = [
    "${REGISTRY}/tool:${item.version}-${item.os}",
    "${REGISTRY}/tool:${item.version}-${item.os}-${TAG}"
  ]
}
```

## Grouping Matrix Targets

Create groups that reference specific matrix-generated targets:

```hcl
target "app" {
  name = "app-${item.variant}"

  matrix = {
    item = [
      { variant = "alpine" },
      { variant = "debian" },
      { variant = "distroless" }
    ]
  }

  dockerfile = "Dockerfile.${item.variant}"
  context    = "."
  tags       = ["myapp:${item.variant}"]
}

# Build only the lightweight variants
group "slim" {
  targets = ["app-alpine", "app-distroless"]
}

# Build all variants
group "default" {
  targets = ["app-alpine", "app-debian", "app-distroless"]
}
```

```bash
# Build only lightweight variants
docker buildx bake slim

# Build all variants
docker buildx bake
```

## CI/CD Integration Example

Use matrix builds in a GitHub Actions workflow:

```yaml
# .github/workflows/build.yml
name: Build Matrix

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push all matrix variants
        run: |
          TAG=${GITHUB_REF_NAME#v} \
          docker buildx bake --push
```

The bake file handles all the variant generation. The CI pipeline stays simple, just a single `docker buildx bake --push` command.

## Debugging Matrix Builds

When matrix builds produce unexpected results, use `--print` to see the expanded targets:

```bash
# Show all generated targets as JSON
docker buildx bake --print | jq '.target | keys'

# Show details for a specific generated target
docker buildx bake --print | jq '.target["app-alpine"]'

# Show all tags that would be produced
docker buildx bake --print | jq '[.target[].tags[]] | sort'
```

If a specific variant fails, build just that one:

```bash
# Build only the failing variant for debugging
docker buildx bake app-py312-debian --progress=plain
```

The `--progress=plain` flag shows full build output instead of the compact progress display, which helps identify build errors.

## Summary

Docker Bake matrix builds eliminate repetitive target definitions. Define the template once, specify the variations in a matrix block, and Bake generates all the combinations. This is particularly valuable for projects that publish multiple variants (Alpine vs Debian, different runtime versions, different database drivers). Use `--print` to verify your matrix expansion, group generated targets for convenient subset builds, and combine matrices with target inheritance for clean, DRY build configurations. The result is a bake file that scales to dozens of image variants without proportional growth in configuration complexity.

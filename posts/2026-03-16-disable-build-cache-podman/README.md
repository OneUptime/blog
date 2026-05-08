# How to Disable Build Cache with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Cache, No-Cache

Description: Learn how to disable the build cache in Podman for clean builds, troubleshooting stale layers, and ensuring reproducible image builds.

---

> Disabling the build cache ensures a completely fresh build when cached layers might be stale or causing issues.

While build caching speeds up development, there are situations where you need to bypass it entirely. Stale cached layers, debugging build issues, and producing reproducible CI builds all require building from scratch. Podman provides the `--no-cache` flag and related options for this purpose. This guide covers when and how to disable the build cache.

---

## When to Disable the Cache

There are several scenarios where disabling the cache is the right choice.

- Security updates: Ensure `apt-get update` or `apk upgrade` fetches the latest packages.
- Debugging build failures: Rule out cached layers as the source of problems.
- Reproducible builds: Guarantee the build result is not influenced by local cache state.
- CI/CD final builds: Produce clean release images.

## The --no-cache Flag

The simplest way to disable the cache is with `--no-cache`.

```bash
# Build with cache disabled

podman build --no-cache -t myapp:latest .

# Every step is executed fresh
# STEP 1: FROM docker.io/library/python:3.12-slim
# STEP 2: RUN apt-get update ...  (not using cache)
# STEP 3: COPY requirements.txt . (not using cache)
```

## Comparing Cached vs No-Cache Builds

```bash
# First, build with cache enabled (default)
time podman build -t myapp:cached .
# real    0m8.234s  (most steps use cache)

# Then build with cache disabled
time podman build --no-cache -t myapp:nocache .
# real    0m45.678s  (every step rebuilt)
```

## Forcing Fresh Package Updates

The most common reason to disable caching is to get fresh package updates.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/ubuntu:24.04

# Without --no-cache, this cached layer might have outdated package lists
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

CMD ["bash"]
EOF

# Build with fresh packages
podman build --no-cache -t secure-base:latest .
```

## Selective Cache Busting

Instead of disabling the entire cache, you can invalidate specific layers using a build argument.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

# This layer is cached normally
RUN apk add --no-cache curl

# This ARG busts the cache from this point forward when changed
ARG CACHE_BUST=1
RUN apk update && apk upgrade

COPY . /app
CMD ["sh"]
EOF

# Build with cache (uses cached layers)
podman build -t myapp:latest .

# Build with cache busted from the CACHE_BUST point
podman build --build-arg CACHE_BUST=$(date +%s) -t myapp:latest .
```

This approach lets expensive early layers (like dependency installation) remain cached while forcing later layers to rebuild.

## No-Cache in CI/CD Pipelines

Use `--no-cache` in CI/CD for clean release builds.

```bash
#!/bin/bash
# ci-build.sh

IMAGE_NAME="myapp"
TAG=$(git describe --tags --always)

# Clean build for releases
if [ "$CI_COMMIT_TAG" != "" ]; then
  echo "Release build: disabling cache"
  podman build --no-cache -t "${IMAGE_NAME}:${TAG}" .
else
  echo "Development build: using cache"
  podman build -t "${IMAGE_NAME}:${TAG}" .
fi
```

## Clearing the Build Cache Manually

You can clear unused build cache without using `--no-cache`.

```bash
# Remove unused resources, including all build cache
podman system prune -a -f

# Remove dangling images from local storage
podman image prune -f

# Check current cache usage
podman system df
```

## Using --pull to Force Base Image Updates

Sometimes the issue is a stale base image rather than the build cache itself.

```bash
# Pull the latest base image before building
podman build --pull=always -t myapp:latest .

# Combine with --no-cache for a completely fresh build
podman build --pull=always --no-cache -t myapp:latest .
```

The `--pull=always` option ensures the base image is pulled from the registry even if a local copy exists.

## No-Cache for Specific Package Managers

Some package managers have their own caching that persists in layers. Handle these explicitly.

```bash
cat > Containerfile.python << 'EOF'
FROM docker.io/library/python:3.12-slim

# pip --no-cache-dir prevents pip from caching within the layer
RUN pip install --no-cache-dir flask gunicorn
EOF

cat > Containerfile.node << 'EOF'
# npm cache clean ensures no npm cache in the layer
FROM docker.io/library/node:20-alpine
RUN npm install -g typescript && npm cache clean --force
EOF
```

## Combining --no-cache with Other Flags

```bash
# Fresh build with a specific tag and platform
podman build \
  --no-cache \
  --pull=always \
  --platform linux/amd64 \
  -t myapp:v1.0.0 \
  .

# Fresh build with build arguments
podman build \
  --no-cache \
  --build-arg APP_VERSION=2.0.0 \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -t myapp:v2.0.0 \
  .
```

## Scheduled Clean Builds

Automate periodic clean builds to catch stale dependency issues.

```bash
#!/bin/bash
# weekly-clean-build.sh
# Run weekly via cron to detect stale cache issues

set -e

IMAGE="myapp"
DATE=$(date +%Y%m%d)

echo "Starting clean build: ${DATE}"
podman build --no-cache --pull=always -t "${IMAGE}:clean-${DATE}" .

echo "Running tests against clean build"
podman run --rm "${IMAGE}:clean-${DATE}" /app/run-tests.sh

echo "Clean build and tests passed"
```

## Troubleshooting Cache Issues

When builds behave differently with and without cache, investigate these common causes.

```bash
# Compare cached vs uncached build output
podman build -t myapp:cached . > build-cached.log 2>&1
podman build --no-cache -t myapp:uncached . > build-uncached.log 2>&1

# Diff the outputs to find discrepancies
diff build-cached.log build-uncached.log

# Check image contents for differences
podman run --rm myapp:cached cat /etc/os-release
podman run --rm myapp:uncached cat /etc/os-release
```

## Summary

Disabling the build cache with `--no-cache` ensures clean, reproducible builds at the cost of longer build times. Use it for release builds, security updates, and debugging cache-related issues. For development, prefer selective cache busting with build arguments to get the best of both worlds: fast builds with fresh critical layers. Combine `--no-cache` with `--pull` for truly fresh builds that also update base images.

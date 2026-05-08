# How to Run a Container with Pull Policy in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Pull Policy

Description: Learn how to control when Podman pulls container images using pull policies like always, missing, never, and newer.

---

> Pull policies determine whether Podman fetches a fresh image from the registry or uses the local cache, giving you control over consistency and speed.

When you run a container, Podman needs to decide whether to pull the image from a registry or use a locally cached copy. The `--pull` flag gives you explicit control over this behavior. This guide covers all available pull policies and when to use each one.

---

## Understanding Pull Policies

Podman supports four pull policies:

- `always` - Always pull the image from the registry, even if a local copy exists
- `missing` - Only pull if the image is not available locally (default)
- `never` - Never pull from the registry; fail if the image is not local
- `newer` - Pull if the registry image digest differs from the local copy

## Using --pull=always

This policy ensures you always run the latest version of an image.

```bash
# Always pull the latest image before running

podman run --rm \
  --pull=always \
  docker.io/library/alpine:latest \
  cat /etc/os-release
```

This is useful in CI/CD pipelines where you need to guarantee the image is up to date.

```bash
# CI/CD example: always pull to ensure fresh images
podman run --rm \
  --pull=always \
  docker.io/library/node:20-alpine \
  node --version
```

## Using --pull=missing (Default)

This is the default behavior. Podman only pulls the image if it does not exist locally.

```bash
# Only pull if the image is not cached locally
podman run --rm \
  --pull=missing \
  docker.io/library/alpine:latest \
  echo "Using cached or freshly pulled image"
```

You can omit `--pull=missing` since it is the default:

```bash
# Equivalent to --pull=missing
podman run --rm \
  docker.io/library/alpine:latest \
  echo "Default pull behavior"
```

## Using --pull=never

This policy prevents Podman from contacting the registry. The container fails if the image is not available locally.

```bash
# First, make sure the image is available locally
podman pull docker.io/library/alpine:latest

# Run with --pull=never (uses only local image)
podman run --rm \
  --pull=never \
  docker.io/library/alpine:latest \
  echo "Running from local cache only"
```

If the image does not exist locally, the command fails:

```bash
# This will fail if the image is not cached
podman run --rm \
  --pull=never \
  docker.io/library/nonexistent-image:latest \
  echo "This will not run" || echo "Error: Image not found locally"
```

This is useful for air-gapped environments or when you want to ensure no network calls are made.

## Using --pull=newer

This policy checks the registry and only pulls if the remote image digest differs from the local copy.

```bash
# Pull only if the registry has a newer image
podman run --rm \
  --pull=newer \
  docker.io/library/alpine:latest \
  cat /etc/os-release
```

This balances freshness with speed since it avoids downloading the image if the local copy is already up to date.

## Checking Local Images Before Running

Before using `--pull=never`, verify what images are available locally.

```bash
# List local images
podman images

# Check if a specific image exists
podman image exists docker.io/library/alpine:latest && \
  echo "Image exists locally" || \
  echo "Image not found locally"
```

## Pull Policy in Scripts

Use pull policies strategically in automation scripts.

```bash
#!/bin/bash
# deploy.sh - Production deployment script

IMAGE="docker.io/mycompany/webapp:v2.1"

# In production, use a specific tag and pull=always for consistency
echo "Pulling latest image..."
podman run -d \
  --name webapp \
  --pull=always \
  -p 8080:8080 \
  "$IMAGE"

echo "Container started with fresh image"
```

```bash
#!/bin/bash
# dev.sh - Local development script

IMAGE="docker.io/library/node:20-alpine"

# In development, use missing to save bandwidth
podman run --rm -it \
  --pull=missing \
  -v ./src:/app:z \
  -w /app \
  "$IMAGE" \
  npm start
```

## Pull Policy with Podman Compose

In compose files, set the pull policy per service:

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:latest
    pull_policy: always
    ports:
      - "8080:80"

  db:
    image: docker.io/library/postgres:16
    pull_policy: missing
```

## Combining Pull Policy with Image Tags

```bash
# For mutable tags like 'latest', use always or newer
podman run --rm --pull=always docker.io/library/alpine:latest echo "Fresh"

# For immutable references with digests, missing is safe
podman run --rm --pull=missing \
  docker.io/library/alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc \
  echo "Immutable image"
```

## Summary

Pull policies control how Podman interacts with image registries. Use `always` in CI/CD for guaranteed freshness, `missing` (default) for general use, `never` for offline environments, and `newer` for digest-based update checks. Choose the right policy based on your environment's network access and consistency requirements.

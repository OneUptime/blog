# How to Use Docker Hub with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Docker Hub, Docker

Description: A complete guide to using Docker Hub with Podman for pulling, pushing, and managing container images.

---

> Docker Hub is the world's largest container registry, and Podman works with it seamlessly as a drop-in replacement for Docker.

Docker Hub remains the most popular public container registry, hosting millions of images. Podman can interact with Docker Hub just as Docker does, supporting image pulls, pushes, searches, and authentication. This guide covers everything you need to use Docker Hub effectively with Podman.

---

## Configuring Docker Hub in Podman

Docker Hub should already be in your default search registries.

```bash
# Check if docker.io is in the search list

podman info --format '{{index .Registries "search"}}'

# If not, add or update the search list in registries.conf
sudo tee /etc/containers/registries.conf.d/010-dockerhub.conf <<'EOF'
unqualified-search-registries = ["docker.io"]
EOF
```

## Pulling Images from Docker Hub

Pull images using either qualified or unqualified names.

```bash
# Pull with the fully qualified name
podman pull docker.io/library/nginx:latest

# Pull with a short name (if docker.io is in search registries)
podman pull nginx:latest

# Pull a specific version
podman pull docker.io/library/python:3.11-slim

# Pull from a user or organization namespace
podman pull docker.io/bitnami/redis:latest

# Pull by digest for reproducibility
podman pull docker.io/library/alpine@sha256:abcdef123456...
```

## Authenticating to Docker Hub

Log in to access private repositories and increase rate limits.

```bash
# Interactive login
podman login docker.io
# Enter your Docker Hub username and password

# Non-interactive login for CI/CD
echo "$DOCKERHUB_TOKEN" | podman login docker.io \
  --username myuser \
  --password-stdin

# Verify login
podman login docker.io --get-login
```

## Understanding Docker Hub Rate Limits

Docker Hub enforces pull rate limits for anonymous and free users.

```bash
# Check your current rate limit status
# First, get an auth token
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Check rate limit headers
curl -sI -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest 2>&1 | \
  grep -i "ratelimit"
```

## Pushing Images to Docker Hub

Tag and push your images to Docker Hub.

```bash
# Build a local image
podman build -t myapp:latest .

# Tag the image for Docker Hub
podman tag myapp:latest docker.io/myusername/myapp:latest
podman tag myapp:latest docker.io/myusername/myapp:v1.0

# Push the image
podman push docker.io/myusername/myapp:latest
podman push docker.io/myusername/myapp:v1.0

# Push each tag you want to publish
for tag in latest v1.0; do
  podman push "docker.io/myusername/myapp:${tag}"
done
```

## Searching Docker Hub

Search for images directly from the command line.

```bash
# Search for images on Docker Hub
podman search docker.io/nginx

# Search with filters
podman search --filter=is-official=true docker.io/python

# Limit search results
podman search --limit 5 docker.io/redis

# Search with a format
podman search --format "{{.Name}} - {{.Stars}} stars" docker.io/postgres
```

## Working with Docker Hub Organizations

Manage images within your Docker Hub organization.

```bash
# Pull from an organization
podman pull docker.io/myorg/backend-api:latest

# Push to an organization (requires write access)
podman tag myapp:latest docker.io/myorg/backend-api:v2.0
podman push docker.io/myorg/backend-api:v2.0

# List tags for an organization image using skopeo
skopeo list-tags docker://docker.io/myorg/backend-api
```

## Using Docker Hub Access Tokens

Use access tokens instead of passwords for better security.

```bash
# Create an access token at https://hub.docker.com/settings/security
# Then log in with the token as the password
podman login docker.io --username myuser
# When prompted for password, enter the access token

# Or non-interactively
echo "$DOCKERHUB_ACCESS_TOKEN" | podman login docker.io \
  --username myuser \
  --password-stdin
```

## Setting Up a Docker Hub Mirror

Improve pull speeds by using a mirror for Docker Hub.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "docker.io"
location = "docker.io"

# Use a local mirror for Docker Hub
[[registry.mirror]]
location = "docker-mirror.internal:5000"
insecure = false
```

## Docker Hub in CI/CD Pipelines

A complete CI/CD workflow using Docker Hub with Podman.

```bash
#!/bin/bash
# ci-docker-hub.sh - Build and push to Docker Hub

set -euo pipefail

REGISTRY="docker.io"
NAMESPACE="myorg"
IMAGE="myapp"
TAG="${CI_COMMIT_TAG:-${CI_COMMIT_SHA:0:8}}"

# Authenticate
echo "${DOCKERHUB_TOKEN}" | podman login "${REGISTRY}" \
  --username "${DOCKERHUB_USER}" \
  --password-stdin

# Build
podman build -t "${REGISTRY}/${NAMESPACE}/${IMAGE}:${TAG}" .
podman tag "${REGISTRY}/${NAMESPACE}/${IMAGE}:${TAG}" \
  "${REGISTRY}/${NAMESPACE}/${IMAGE}:latest"

# Push both tags
podman push "${REGISTRY}/${NAMESPACE}/${IMAGE}:${TAG}"
podman push "${REGISTRY}/${NAMESPACE}/${IMAGE}:latest"

# Clean up
podman logout "${REGISTRY}"
echo "Published: ${REGISTRY}/${NAMESPACE}/${IMAGE}:${TAG}"
```

## Summary

Podman works seamlessly with Docker Hub for pulling, pushing, and searching container images. Authenticate using access tokens rather than passwords for better security, and be aware of rate limits for anonymous and free-tier users. You can set up mirrors to improve pull performance and use the same CI/CD workflows you would with Docker. The transition from Docker to Podman for Docker Hub usage requires minimal changes since Podman supports the Docker registry API natively.

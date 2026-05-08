# How to Push an Image to Docker Hub with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Docker Hub, Registry

Description: Learn how to push container images to Docker Hub using Podman, including account setup, authentication, tagging, and managing repositories.

---

> Docker Hub remains the most widely used public container registry, and Podman makes pushing images to it just as easy as Docker does.

Docker Hub is the default public registry for container images, hosting millions of images. Podman can push images to Docker Hub seamlessly, using the same image naming conventions and authentication mechanisms. This guide walks through the complete process of pushing your images to Docker Hub with Podman.

---

## Prerequisites

You need a Docker Hub account and a local image to push.

```bash
# Create a Docker Hub account at https://hub.docker.com if you don't have one

# Verify Podman is installed

podman --version

# Have an image ready to push
podman build -t myapp:v1.0.0 .
# Or use any existing local image
```

## Authenticating with Docker Hub

Log in to Docker Hub before pushing.

```bash
# Interactive login
podman login docker.io
# Enter your Docker Hub username and password or access token

# Login with environment variables (for CI/CD)
echo "$DOCKERHUB_TOKEN" | podman login docker.io -u "$DOCKERHUB_USERNAME" --password-stdin

# Verify authentication
podman login --get-login docker.io

# On Linux, Podman stores credentials in ${XDG_RUNTIME_DIR}/containers/auth.json by default
# To persist credentials across reboots, specify an auth file:
podman login --authfile ~/.config/containers/auth.json docker.io
```

## Using Access Tokens

Docker Hub access tokens are recommended over passwords.

```bash
# Generate an access token in Docker Hub account settings
# Then login with the token
podman login docker.io -u myusername
# When prompted for password, enter your access token instead

# Or use it in a script
echo "$DOCKERHUB_ACCESS_TOKEN" | podman login docker.io -u myusername --password-stdin
```

## Tagging Images for Docker Hub

Docker Hub requires images to be tagged with your username namespace.

```bash
# Format: docker.io/<username>/<image>:<tag>

# Tag a local image for Docker Hub
podman tag myapp:v1.0.0 docker.io/myusername/myapp:v1.0.0

# Also tag as latest
podman tag myapp:v1.0.0 docker.io/myusername/myapp:latest

# Tag with multiple version levels
podman tag myapp:v1.0.0 docker.io/myusername/myapp:v1.0
podman tag myapp:v1.0.0 docker.io/myusername/myapp:v1

# Verify tags
podman images --filter reference='docker.io/myusername/myapp' \
  --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}"
```

## Pushing to Docker Hub

Push your tagged image.

```bash
# Push a specific version
podman push docker.io/myusername/myapp:v1.0.0

# Push the latest tag
podman push docker.io/myusername/myapp:latest

# Push all tags at once using a script
for TAG in v1.0.0 v1.0 v1 latest; do
  echo "Pushing docker.io/myusername/myapp:${TAG}..."
  podman push "docker.io/myusername/myapp:${TAG}"
done
```

## Pushing to an Organization

Push images to a Docker Hub organization repository.

```bash
# Tag for an organization
podman tag myapp:v1.0.0 docker.io/myorg/myapp:v1.0.0

# Push to the organization (requires write access)
podman push docker.io/myorg/myapp:v1.0.0
```

## Verifying the Push

Confirm your image is available on Docker Hub.

```bash
# Inspect the remote image
skopeo inspect docker://docker.io/myusername/myapp:v1.0.0

# Check available tags
podman search --list-tags docker.io/myusername/myapp

# Pull on a different machine to verify
podman pull docker.io/myusername/myapp:v1.0.0
```

## Complete Build and Push Workflow

End-to-end workflow for pushing to Docker Hub.

```bash
#!/bin/bash
# Build and push to Docker Hub

set -e

USERNAME="${DOCKERHUB_USERNAME:?Set DOCKERHUB_USERNAME}"
IMAGE="myapp"
VERSION="${1:?Usage: $0 <version>}"

echo "=== Building ${IMAGE}:${VERSION} ==="
podman build -t "${IMAGE}:${VERSION}" .

echo "=== Tagging for Docker Hub ==="
podman tag "${IMAGE}:${VERSION}" "docker.io/${USERNAME}/${IMAGE}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "docker.io/${USERNAME}/${IMAGE}:latest"

echo "=== Authenticating ==="
echo "$DOCKERHUB_TOKEN" | podman login docker.io -u "$USERNAME" --password-stdin

echo "=== Pushing ==="
podman push "docker.io/${USERNAME}/${IMAGE}:${VERSION}"
podman push "docker.io/${USERNAME}/${IMAGE}:latest"

echo "=== Done ==="
echo "Image available at: https://hub.docker.com/r/${USERNAME}/${IMAGE}"
echo "Pull with: podman pull docker.io/${USERNAME}/${IMAGE}:${VERSION}"
```

## Pushing Multi-Architecture Images

Push manifest lists for multi-platform support.

```bash
# Create a manifest list
podman manifest create docker.io/myusername/myapp:v1.0.0

# Add platform-specific images
podman manifest add docker.io/myusername/myapp:v1.0.0 \
  docker.io/myusername/myapp:v1.0.0-amd64

podman manifest add docker.io/myusername/myapp:v1.0.0 \
  docker.io/myusername/myapp:v1.0.0-arm64

# Push the manifest list
podman manifest push docker.io/myusername/myapp:v1.0.0 \
  docker://docker.io/myusername/myapp:v1.0.0
```

## Managing Docker Hub Rate Limits

Be aware of Docker Hub pull rate limits.

```bash
# Check your rate limit status
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  -I "https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest" 2>&1 \
  | grep -i ratelimit

# Personal authenticated users: 200 pulls per 6 hours
# Unauthenticated users: 100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet
# Pro, Team, and Business users: unlimited pulls, subject to fair use
```

## Summary

Pushing images to Docker Hub with Podman is straightforward once you understand the naming convention (docker.io/username/image:tag) and authentication flow. Use access tokens instead of passwords, tag images with semantic versions, and consider pushing multi-architecture manifests for broader compatibility. Docker Hub's widespread adoption makes it an excellent choice for sharing container images publicly or with your team.

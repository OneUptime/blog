# How to Push Images with Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Image Push, Registry

Description: Learn how to push container images to registries using Podman Desktop and the CLI for sharing and deployment.

---

> Pushing container images to a registry makes them available for deployment across environments, CI/CD pipelines, and team members.

After building or customizing a container image, you need to push it to a registry so others can use it. Podman Desktop provides both a graphical interface and CLI tools for pushing images to any OCI-compliant registry. This post covers the complete workflow from tagging to pushing, including authentication and multi-registry setups.

---

## Prerequisites

Ensure Podman Desktop is running and you have access to a container registry.

```bash
# Verify Podman is available

podman info

# Check that you have images to push
podman images
```

## Authenticating with a Registry

You must log in to a registry before pushing images.

```bash
# Log in to Docker Hub
podman login docker.io

# Log in to GitHub Container Registry
echo "$GITHUB_TOKEN" | podman login ghcr.io -u "$GITHUB_USER" --password-stdin

# Log in to a private registry
podman login registry.example.com

# Log in to Quay.io
podman login quay.io

# Verify login status
podman login --get-login docker.io
```

In Podman Desktop, configure registry credentials under Settings > Registries.

## Tagging Images for Push

Images must be tagged with the full registry reference before pushing.

```bash
# Build a local image
podman build -t my-app:v1.0 .

# Tag for Docker Hub
podman tag my-app:v1.0 docker.io/myusername/my-app:v1.0
podman tag my-app:v1.0 docker.io/myusername/my-app:latest

# Tag for GitHub Container Registry
podman tag my-app:v1.0 ghcr.io/myorg/my-app:v1.0

# Tag for a private registry
podman tag my-app:v1.0 registry.example.com/myorg/my-app:v1.0

# Verify the tags
podman images | grep my-app
```

## Pushing an Image with the CLI

Push the tagged image to the registry.

```bash
# Push to Docker Hub
podman push docker.io/myusername/my-app:v1.0

# Push the latest tag as well
podman push docker.io/myusername/my-app:latest

# Push to GitHub Container Registry
podman push ghcr.io/myorg/my-app:v1.0

# Push to a private registry
podman push registry.example.com/myorg/my-app:v1.0
```

## Pushing an Image with Podman Desktop

To push images through the graphical interface:

1. Click on "Images" in the left sidebar
2. Find the image you want to push in the list
3. Click the three-dot menu on the image row
4. Select "Push Image"
5. Confirm the selected image tag
6. Click "Push image" to start uploading

Podman Desktop shows upload progress as the layers are pushed to the registry.

## Pushing to a Local Registry

For development and testing, push to a local registry.

```bash
# Start a local OCI registry
podman run -d -p 5000:5000 --name local-registry docker.io/library/registry:2

# Tag an image for the local registry
podman tag my-app:v1.0 localhost:5000/my-app:v1.0

# Push to the local registry (disable TLS for local dev)
podman push --tls-verify=false localhost:5000/my-app:v1.0

# Verify the image is in the local registry
curl -s http://localhost:5000/v2/_catalog | python3 -m json.tool
```

## Pushing Multiple Tags

Push several tags of the same image efficiently.

```bash
#!/bin/bash
# Push all tags for a release

IMAGE="my-app"
VERSION="v2.0"
REGISTRY="registry.example.com/myorg"

# Tag with version and latest
podman tag "${IMAGE}:${VERSION}" "${REGISTRY}/${IMAGE}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "${REGISTRY}/${IMAGE}:latest"
podman tag "${IMAGE}:${VERSION}" "${REGISTRY}/${IMAGE}:stable"

# Push all tags
for tag in "${VERSION}" "latest" "stable"; do
    echo "Pushing ${REGISTRY}/${IMAGE}:${tag}..."
    podman push "${REGISTRY}/${IMAGE}:${tag}"
done

echo "All tags pushed successfully"
```

## Pushing Multi-Architecture Images

Create and push images for multiple platforms.

```bash
# Build and push a multi-architecture manifest
# Build for AMD64
podman build --platform linux/amd64 -t my-app:v1.0-amd64 .

# Build for ARM64
podman build --platform linux/arm64 -t my-app:v1.0-arm64 .

# Tag both for the registry
podman tag my-app:v1.0-amd64 registry.example.com/myorg/my-app:v1.0-amd64
podman tag my-app:v1.0-arm64 registry.example.com/myorg/my-app:v1.0-arm64

# Push both platform images
podman push registry.example.com/myorg/my-app:v1.0-amd64
podman push registry.example.com/myorg/my-app:v1.0-arm64

# Create and push a manifest list
podman manifest create registry.example.com/myorg/my-app:v1.0
podman manifest add registry.example.com/myorg/my-app:v1.0 \
    registry.example.com/myorg/my-app:v1.0-amd64
podman manifest add registry.example.com/myorg/my-app:v1.0 \
    registry.example.com/myorg/my-app:v1.0-arm64
podman manifest push registry.example.com/myorg/my-app:v1.0
```

## Verifying a Push

Confirm the image was pushed successfully.

```bash
# Pull the image back on another machine or after removing locally
podman rmi registry.example.com/myorg/my-app:v1.0
podman pull registry.example.com/myorg/my-app:v1.0

# Inspect the pulled image
podman inspect registry.example.com/myorg/my-app:v1.0 | \
    python3 -m json.tool | head -20

# Check the registry catalog (for private registries)
curl -s https://registry.example.com/v2/_catalog | python3 -m json.tool
```

## Handling Push Errors

Common errors and their solutions.

```bash
# Error: authentication required
# Solution: log in first
podman login registry.example.com

# Error: denied (no push permission)
# Solution: verify your account has write access to the repository

# Error: image not found
# Solution: check the image tag exists locally
podman images | grep my-app

# Error: TLS verification failed
# Solution: for development registries only
podman push --tls-verify=false localhost:5000/my-app:v1.0
```

## Summary

Pushing images with Podman Desktop involves tagging images with the full registry reference and then pushing them using either the GUI or the `podman push` CLI command. Authenticate with `podman login` or through Podman Desktop's registry settings before pushing. You can push to Docker Hub, GitHub Container Registry, Quay.io, private registries, or local development registries. For production releases, push multiple tags and consider multi-architecture manifests. Always verify your push by pulling the image back or checking the registry catalog.

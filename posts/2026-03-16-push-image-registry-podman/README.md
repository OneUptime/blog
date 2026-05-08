# How to Push an Image to a Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry

Description: Learn how to push container images to registries using Podman, including authentication, tagging for registries, and verifying pushed images.

---

> Pushing images to a registry makes them available for deployment across multiple hosts, CI/CD pipelines, and team members.

Building a container image is only the first step. To make it useful beyond your local machine, you need to push it to a container registry. Podman supports pushing to any OCI-compliant registry. This guide covers the complete workflow from tagging to pushing to verification.

---

## Prerequisites

Before pushing, you need an image to push and credentials for your target registry.

```bash
# Build or have an image ready

podman build -t myapp:v1.0.0 .

# Or pull an existing image to retag
podman pull alpine:3.19
```

## Authentication

Log in to your target registry before pushing.

```bash
# Login to a registry
podman login docker.io
# Enter username and password when prompted

# Login with credentials inline (for scripts)
podman login docker.io -u myuser -p mypassword

# Login using a token from stdin
echo "$REGISTRY_TOKEN" | podman login docker.io -u myuser --password-stdin

# Verify you are logged in
podman login --get-login docker.io
```

## Tagging for the Target Registry

Tag your image with the fully qualified registry name.

```bash
# Tag for Docker Hub
podman tag myapp:v1.0.0 docker.io/myuser/myapp:v1.0.0

# Tag for Quay.io
podman tag myapp:v1.0.0 quay.io/myorg/myapp:v1.0.0

# Tag for a private registry
podman tag myapp:v1.0.0 registry.example.com:5000/myapp:v1.0.0

# Create multiple tags for the same push
podman tag myapp:v1.0.0 docker.io/myuser/myapp:v1.0.0
podman tag myapp:v1.0.0 docker.io/myuser/myapp:latest
```

## Pushing an Image

Push the tagged image to the registry.

```bash
# Push to the registry
podman push docker.io/myuser/myapp:v1.0.0

# Push the latest tag too
podman push docker.io/myuser/myapp:latest

# Push with verbose output
podman --log-level=debug push docker.io/myuser/myapp:v1.0.0
```

## Verifying the Push

Confirm the image was pushed successfully.

```bash
# Inspect the remote image using skopeo
skopeo inspect docker://docker.io/myuser/myapp:v1.0.0

# Optionally search for the image if your registry supports search
podman search docker.io/myuser/myapp

# Pull the image on another machine to verify
podman pull docker.io/myuser/myapp:v1.0.0
```

## Pushing with Compression Options

Control how image layers are compressed during push.

```bash
# Push with specific compression format
podman push --compression-format gzip docker.io/myuser/myapp:v1.0.0

# Push with zstd compression (faster, better ratio)
podman push --compression-format zstd docker.io/myuser/myapp:v1.0.0
```

## Pushing to an Insecure Registry

Push to registries that use HTTP or self-signed certificates.

```bash
# Push to a registry without TLS verification
podman push --tls-verify=false myregistry.local:5000/myapp:v1.0.0

# Push to an HTTP registry
podman push --tls-verify=false localhost:5000/myapp:v1.0.0
```

## Complete Push Workflow

A full workflow from build to push.

```bash
#!/bin/bash
# Build, tag, and push workflow

REGISTRY="docker.io"
USERNAME="myuser"
IMAGE="myapp"
VERSION="1.0.0"
FULL_NAME="${REGISTRY}/${USERNAME}/${IMAGE}"

# Step 1: Build
echo "Building ${IMAGE}:${VERSION}..."
podman build -t "${IMAGE}:${VERSION}" .

# Step 2: Tag for registry
echo "Tagging for ${REGISTRY}..."
podman tag "${IMAGE}:${VERSION}" "${FULL_NAME}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "${FULL_NAME}:latest"

# Step 3: Login
echo "Logging in to ${REGISTRY}..."
podman login "${REGISTRY}"

# Step 4: Push
echo "Pushing ${FULL_NAME}:${VERSION}..."
podman push "${FULL_NAME}:${VERSION}"

echo "Pushing ${FULL_NAME}:latest..."
podman push "${FULL_NAME}:latest"

echo "Push complete!"
echo "Pull with: podman pull ${FULL_NAME}:${VERSION}"
```

## Handling Push Errors

Common push issues and solutions.

```bash
# Error: unauthorized
# Solution: Login first
podman login docker.io

# Error: repository does not exist
# Solution: Check the image name format
# Docker Hub format: docker.io/username/image:tag
# Not: docker.io/image:tag (unless it's an official image)

# Error: denied (quota exceeded)
# Solution: Check your registry plan and clean up old images

# Error: TLS handshake failure
# Solution: For self-signed certs
podman push --tls-verify=false registry.local:5000/myapp:latest

# Error: blob upload failed
# Solution: Retry or check network connectivity
podman push --retry 3 docker.io/myuser/myapp:v1.0.0
```

## Summary

Pushing images to a registry with Podman follows a straightforward workflow: build, tag with the registry name, authenticate, and push. Always verify your push by inspecting the remote image or pulling it from another machine. Implement this workflow in your CI/CD pipelines to automate image distribution across your infrastructure.

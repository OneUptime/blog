# How to Commit Buildah Containers as Podman Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Image Commit, OCI, Container Registry

Description: Learn how to commit Buildah working containers as finalized Podman images with proper formatting, compression, and registry pushing.

---

> Committing a Buildah container captures all your changes as a reusable, distributable container image.

The `buildah commit` command takes a working container with all its modifications and saves it as a container image. This is the final step in a Buildah build workflow, converting a mutable container into an immutable image. The committed image is immediately available to Podman and can be pushed to any OCI-compatible registry. This guide covers all the options and best practices for committing images.

---

## Prerequisites

```bash
# Ensure both tools are installed

buildah --version
podman --version

# Create a working container with some modifications
container=$(buildah from alpine:3.19)
buildah run $container -- apk add --no-cache python3 curl
buildah run $container -- sh -c "echo 'Hello World' > /app.txt"
buildah config --label version="1.0.0" $container
buildah config --entrypoint '["/usr/bin/python3"]' $container
```

## Basic Commit

```bash
# Commit the container as a new image
buildah commit $container my-app:1.0.0

# The image is now available in local storage
podman images my-app --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"

# The image can be run with Podman immediately
podman run --rm my-app:1.0.0 --version
```

## Commit Options

### Squash Layers

```bash
# Without squash, commit preserves the base image layers and adds the container's changes
# Squash merges all layers, including inherited base layers, into a single layer
buildah commit --squash $container my-app:squashed

# Compare layer counts
echo "Normal layers:"
podman inspect my-app:1.0.0 --format '{{len .RootFS.Layers}}'
echo "Squashed layers:"
podman inspect my-app:squashed --format '{{len .RootFS.Layers}}'
```

### Choose Image Format

```bash
# OCI format (default, recommended)
buildah commit --format oci $container my-app:oci

# Docker format (for compatibility with older registries)
buildah commit --format docker $container my-app:docker

# Check the manifest format
podman inspect my-app:oci --format '{{.ManifestType}}'
podman inspect my-app:docker --format '{{.ManifestType}}'
```

### Compression Options

```bash
# Local storage commits are uncompressed by default
buildah commit $container my-app:default

# Force compression when writing the image
buildah commit --disable-compression=false $container my-app:compressed

# Disable compression explicitly
buildah commit --disable-compression $container my-app:uncompressed

# Compare sizes
podman images --filter "reference=my-app" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Set Image Name and Tags

```bash
# Commit with a full registry path
buildah commit $container registry.example.com/team/my-app:1.0.0

# Commit with multiple tags by tagging afterward
buildah commit $container my-app:1.0.0
podman tag my-app:1.0.0 my-app:latest
podman tag my-app:1.0.0 registry.example.com/team/my-app:1.0.0

# Verify all tags
podman images --filter "reference=my-app" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}"
```

### Remove the Container After Commit

```bash
# Use --rm to automatically remove the working container after commit
buildah commit --rm $container my-app:auto-cleanup

# The container no longer exists
buildah containers --format "table {{.ContainerName}}\t{{.ImageName}}"
```

## Commit and Push Workflow

```bash
# Build, commit, and push in a single workflow
container=$(buildah from python:3.12-slim)
buildah run $container -- pip install --no-cache-dir flask
buildah config --port 5000 $container

# Commit with a registry path
buildah commit --squash $container registry.example.com/apps/flask-service:v2.0

# Login to the registry
podman login registry.example.com

# Push the image
podman push registry.example.com/apps/flask-service:v2.0

# Clean up the working container
buildah rm $container
```

## Inspecting Committed Images

```bash
# Create a fresh container and commit for inspection
container=$(buildah from alpine:3.19)
buildah run $container -- apk add --no-cache nginx
buildah config --port 80 $container
buildah config --label maintainer="ops@example.com" $container
buildah config --entrypoint '["nginx", "-g", "daemon off;"]' $container
buildah commit $container nginx-custom:latest

# Inspect the committed image with Podman
podman inspect nginx-custom:latest --format '
Image: {{.RepoTags}}
Created: {{.Created}}
Size: {{.Size}}
Entrypoint: {{.Config.Entrypoint}}
Cmd: {{.Config.Cmd}}
ExposedPorts: {{.Config.ExposedPorts}}
Labels: {{.Config.Labels}}'

# View the image layers
podman history nginx-custom:latest --format "table {{.ID}}\t{{.Size}}\t{{.Comment}}"

# Export the image manifest
podman inspect nginx-custom:latest --format '{{.ManifestType}}'

buildah rm $container
```

## Incremental Commits

```bash
# You can commit multiple times during a build to create checkpoints
container=$(buildah from ubuntu:22.04)

# Stage 1: Base system update
buildah run $container -- bash -c "apt-get update && apt-get upgrade -y"
buildah commit $container build-stage:base

# Stage 2: Install runtime dependencies
buildah run $container -- bash -c "apt-get install -y python3 python3-pip && apt-get clean"
buildah commit $container build-stage:runtime

# Stage 3: Install application
buildah run $container -- pip install --no-cache-dir flask gunicorn
buildah commit $container build-stage:app

# View the progression
podman images --filter "reference=build-stage" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.Created}}"

# Clean up intermediate images (keep only the final one)
podman rmi build-stage:base build-stage:runtime
buildah rm $container
```

## Committing with Timestamps

```bash
# Use a timestamp-based tagging strategy
container=$(buildah from alpine:3.19)
buildah run $container -- apk add --no-cache curl

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="my-service"

# Commit with timestamp tag
buildah commit $container "${IMAGE_NAME}:${TIMESTAMP}"

# Also tag as latest
podman tag "${IMAGE_NAME}:${TIMESTAMP}" "${IMAGE_NAME}:latest"

echo "Committed as: ${IMAGE_NAME}:${TIMESTAMP}"

# List all versions
podman images --filter "reference=${IMAGE_NAME}" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Created}}"

buildah rm $container
```

## Verifying Committed Images

```bash
# Run the committed image to verify it works
podman run --rm --entrypoint nginx nginx-custom:latest -t 2>&1 | head -5

# Check the image can be exported and re-imported
podman save nginx-custom:latest -o /tmp/nginx-custom.tar
podman rmi nginx-custom:latest
podman load -i /tmp/nginx-custom.tar

# Verify the re-imported image
podman images nginx-custom --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
rm -f /tmp/nginx-custom.tar
```

## Cleaning Up

```bash
buildah rm --all 2>/dev/null
podman rmi my-app:1.0.0 my-app:squashed my-app:oci my-app:docker \
  my-app:default my-app:compressed my-app:uncompressed my-app:auto-cleanup \
  nginx-custom:latest build-stage:app 2>/dev/null
```

## Summary

The `buildah commit` command is the bridge between a mutable working container and an immutable container image. Key options include squashing layers for smaller images, choosing between OCI and Docker formats for registry compatibility, and controlling layer compression. Committed images are instantly available to Podman and can be pushed to any container registry. Using consistent tagging strategies with timestamps or semantic versions makes image management predictable and auditable.

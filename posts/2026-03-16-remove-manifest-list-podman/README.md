# How to Remove a Manifest List with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Manifest List

Description: Learn how to remove manifest lists in Podman using the podman manifest rm command, including cleaning up unused manifests and managing multi-arch image references.

---

> Keeping your local manifest lists tidy prevents confusion and storage waste, especially when iterating on multi-architecture image builds.

Manifest lists (also called manifest indexes) group multiple architecture-specific images under a single tag. As you build and test multi-arch images, stale manifest lists accumulate. This guide shows you how to remove them cleanly with Podman.

---

## Understanding Manifest Lists

A manifest list is a pointer that references images for different platforms. When you create one with `podman manifest create`, it lives locally until you remove it.

```bash
# Check whether a specific manifest list exists

podman manifest exists myapp:latest && echo "Manifest exists" || echo "No manifest"

# List local manifest lists
podman images --filter manifest=true
```

## Removing a Manifest List with podman manifest rm

The primary command for removing a manifest list is `podman manifest rm`:

```bash
# Remove a single manifest list by name
podman manifest rm myapp:latest
```

This removes the manifest list reference but does not remove the individual architecture-specific images it pointed to.

```bash
# Remove a manifest list by its full name:tag
podman manifest rm registry.example.com/myapp:v1.0

# Remove a manifest list by its ID
podman manifest rm a1b2c3d4e5f6
```

## Removing Multiple Manifest Lists

You can remove several manifest lists in a single command:

```bash
# Remove multiple manifest lists at once
podman manifest rm myapp:latest myapp:v1.0 myapp:v0.9

# Remove all manifest lists matching a pattern
# First, list them
podman images --format '{{.Repository}}:{{.Tag}}' | grep myapp

# Then remove them
podman manifest rm myapp:latest myapp:v1.0
```

## Checking Before Removing

Before removing a manifest list, you may want to inspect it:

```bash
# Inspect the manifest list to see what architectures it includes
podman manifest inspect myapp:latest

# Example output shows the platforms included
# {
#   "schemaVersion": 2,
#   "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
#   "manifests": [
#     { "platform": { "architecture": "amd64", "os": "linux" } },
#     { "platform": { "architecture": "arm64", "os": "linux" } }
#   ]
# }
```

## Removing Manifest Lists and Their Images

If you want to remove both the manifest list and the images it references:

```bash
# First, note the image digests in the manifest
podman manifest inspect myapp:latest | jq -r '.manifests[].digest'

# Remove the manifest list
podman manifest rm myapp:latest

# Then remove the individual images by digest
podman rmi sha256:abc123...
podman rmi sha256:def456...
```

## Cleaning Up in a Build Script

In CI/CD pipelines, you often create and remove manifest lists as part of the build process:

```bash
#!/bin/bash
# build-and-push-multiarch.sh

IMAGE="registry.example.com/myapp"
TAG="v1.0"

# Clean up any existing manifest list from a previous run
podman manifest rm --ignore "${IMAGE}:${TAG}"

# Create a fresh manifest list
podman manifest create "${IMAGE}:${TAG}"

# Build and add images for each architecture
for ARCH in amd64 arm64 ppc64le; do
    podman build --platform "linux/${ARCH}" -t "${IMAGE}:${TAG}-${ARCH}" .
    podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
done

# Push the manifest list
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

# Clean up local manifest list after push
podman manifest rm "${IMAGE}:${TAG}"

echo "Multi-arch manifest pushed and local copy cleaned up."
```

## Handling Errors

If you try to remove a manifest list that does not exist, Podman returns an error:

```bash
# Attempting to remove a non-existent manifest
podman manifest rm nonexistent:latest
# Error: nonexistent:latest: image not known

# Use --ignore to avoid errors in scripts
podman manifest rm --ignore myapp:latest
```

## Removing All Local Manifest Lists

Podman does not have a dedicated command to remove all manifest lists at once, but you can script it:

```bash
# List all images that are manifest lists and remove them
# Podman can filter images to only manifest lists
podman images --filter manifest=true --format '{{.ID}}' | \
    xargs -r podman manifest rm 2>/dev/null

# Or remove all unused images, which can include manifest lists
podman system prune --all --force
```

## Summary

Use `podman manifest rm` to remove manifest lists by name, tag, or ID. This command only removes the manifest list itself, not the individual platform images. In CI/CD scripts, wrap removals in error-suppressing patterns to handle cases where the manifest may not exist. Regular cleanup of stale manifest lists keeps your local storage organized.

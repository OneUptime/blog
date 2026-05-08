# How to Add an Image to a Manifest List with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture

Description: Learn how to add architecture-specific container images to a Podman manifest list, including local images, remote images, and images with specific platform annotations.

---

> Adding images to a manifest list is how you build up a multi-architecture reference that lets users on any platform pull the right image automatically.

After creating a manifest list with `podman manifest create`, the next step is adding images to it. Each image you add represents a specific platform (OS and architecture combination). This guide covers all the ways to add images to a manifest list with Podman.

---

## Basic Usage

The `podman manifest add` command adds an image to an existing manifest list.

```bash
# Syntax

podman manifest add <manifest-list> [transport:]<image>

# Example: Add a local image
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:amd64
```

## Step-by-Step Example

Start by building images and adding them to a manifest list.

```bash
# Create a Containerfile
mkdir -p ~/manifest-add-demo && cd ~/manifest-add-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
CMD ["sh", "-c", "echo Platform: $(uname -m)"]
EOF

# Build images for different architectures
podman build --platform linux/amd64 -t localhost/myapp:amd64 .
podman build --platform linux/arm64 -t localhost/myapp:arm64 .
podman build --platform linux/arm/v7 -t localhost/myapp:armv7 .

# Create a manifest list
podman manifest create localhost/myapp:latest

# Add each image to the manifest list
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:amd64
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:arm64
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:armv7

# Inspect the result
podman manifest inspect localhost/myapp:latest
```

## Adding with Explicit Platform Override

Sometimes the image metadata does not have the correct platform information. You can specify it explicitly.

```bash
# Add an image with explicit platform information
podman manifest add \
  --arch amd64 \
  --os linux \
  localhost/myapp:latest containers-storage:localhost/myapp:amd64

# Add an ARM image with variant
podman manifest add \
  --arch arm \
  --os linux \
  --variant v7 \
  localhost/myapp:latest containers-storage:localhost/myapp:armv7

# Add an ARM64 image
podman manifest add \
  --arch arm64 \
  --os linux \
  localhost/myapp:latest containers-storage:localhost/myapp:arm64
```

## Adding Remote Images

You can add images directly from a registry without pulling them locally first.

```bash
# Add a remote image to the manifest list
podman manifest add localhost/myapp:latest docker://registry.example.com/myapp:amd64
podman manifest add localhost/myapp:latest docker://registry.example.com/myapp:arm64

# Add from Docker Hub
podman manifest add localhost/myapp:latest docker://docker.io/yourusername/myapp:amd64
```

## Adding All Architectures from a Multi-Arch Image

If you want to include all platforms from an existing multi-arch image, use the `--all` flag.

```bash
# Add all platform variants from a multi-arch source image
podman manifest add --all localhost/myapp:latest docker://alpine:3.19

# This adds every platform variant that alpine:3.19 supports
podman manifest inspect localhost/myapp:latest
```

## Adding with Features and OS Version

For specialized platforms, you can specify additional metadata.

```bash
# Add with OS version (useful for Windows containers)
podman manifest add \
  --os windows \
  --os-version "10.0.17763.0" \
  --arch amd64 \
  localhost/myapp:latest containers-storage:localhost/myapp:windows-ltsc2019

# Add with features
podman manifest add \
  --features "win32k" \
  localhost/myapp:latest containers-storage:localhost/myapp:windows-special
```

## Verifying Added Images

After adding images, verify the manifest list contents.

```bash
# Full inspection
podman manifest inspect localhost/myapp:latest

# Check specific platform entries
podman manifest inspect localhost/myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os, variant: .platform.variant}'
```

Expected output:

```json
{
  "arch": "amd64",
  "os": "linux",
  "variant": null
}
{
  "arch": "arm64",
  "os": "linux",
  "variant": null
}
{
  "arch": "arm",
  "os": "linux",
  "variant": "v7"
}
```

## Adding Images Incrementally

You can add images to a manifest list over time, which is useful in CI/CD pipelines after different architectures have been built on different machines.

```bash
#!/bin/bash
# add-to-manifest.sh - Add a platform-specific image to the manifest
# Usage: ./add-to-manifest.sh <arch>

REGISTRY="registry.example.com"
IMAGE="myapp"
TAG="v1.0"
ARCH="${1:?Usage: $0 <arch>}"

# Create manifest if it does not exist, or amend it if it already exists
podman manifest create --amend "${REGISTRY}/${IMAGE}:${TAG}"

# Add this architecture to the manifest
podman manifest add \
  "${REGISTRY}/${IMAGE}:${TAG}" \
  "docker://${REGISTRY}/${IMAGE}:${TAG}-${ARCH}"

echo "Added ${ARCH} to manifest ${REGISTRY}/${IMAGE}:${TAG}"
```

Run after each architecture-specific image has been pushed:

```bash
# After the AMD64 image is pushed
./add-to-manifest.sh amd64

# After the ARM64 image is pushed
./add-to-manifest.sh arm64
```

## Handling Duplicate Platform Entries

If you accidentally add two images for the same platform, the manifest list will have duplicate entries. This can cause issues.

```bash
# Check for duplicates
podman manifest inspect localhost/myapp:latest | \
  jq '[.manifests[].platform | {os, architecture, variant}] | group_by(.) | map(select(length > 1))'

# If duplicates exist, remove the old entry first
podman manifest remove localhost/myapp:latest sha256:<old-digest>

# Then add the correct one
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:amd64-fixed
```

## Complete CI/CD Workflow

```bash
#!/bin/bash
# ci-multiarch-build.sh

REGISTRY="registry.example.com"
IMAGE_NAME="myapp"
TAG="${CI_COMMIT_TAG:-latest}"
PLATFORMS=("amd64" "arm64" "s390x")

# Create the manifest list
MANIFEST="${REGISTRY}/${IMAGE_NAME}:${TAG}"
podman manifest create "${MANIFEST}"

# Build and add each platform
for ARCH in "${PLATFORMS[@]}"; do
  echo "Building for linux/${ARCH}..."

  PLATFORM_TAG="${MANIFEST}-${ARCH}"

  podman build \
    --platform "linux/${ARCH}" \
    -t "${PLATFORM_TAG}" \
    .

  podman manifest add "${MANIFEST}" "containers-storage:${PLATFORM_TAG}"

  echo "Added linux/${ARCH} to manifest"
done

# Show the final manifest
podman manifest inspect "${MANIFEST}"

# Push everything
podman manifest push --all "${MANIFEST}" "docker://${MANIFEST}"
echo "Published ${MANIFEST}"
```

## Summary

Use `podman manifest add` to append architecture-specific images to a manifest list. You can add local images, remote registry images, or all variants from a multi-arch source. Override platform metadata with `--arch`, `--os`, and `--variant` when needed. Always verify the manifest list with `podman manifest inspect` after adding images to ensure all platforms are correctly represented.

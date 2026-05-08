# How to Create a Manifest List with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture

Description: Learn how to create manifest lists with Podman to group multiple architecture-specific images under a single tag for seamless multi-platform deployments.

---

> A manifest list lets you publish one image tag that works across AMD64, ARM64, and other architectures, with the container runtime automatically pulling the right variant.

When you push a container image to a registry, it is typically built for a single architecture. A manifest list (also called a fat manifest or image index) groups multiple architecture-specific images under a single reference. When a user pulls the image, the container runtime automatically selects the correct variant for their platform.

---

## What Is a Manifest List

A manifest list is a pointer that maps a single image tag to multiple platform-specific images. For example, `myapp:latest` could contain entries for `linux/amd64`, `linux/arm64`, and `linux/s390x`.

## Creating a Manifest List

Use `podman manifest create` to start a new manifest list.

```bash
# Create an empty manifest list

podman manifest create myapp:latest

# Verify it was created
podman manifest inspect myapp:latest
```

The output shows an empty manifest list:

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "manifests": null
}
```

## Building and Adding Architecture-Specific Images

Build images for each target architecture, then add them to the manifest list. If you build for a non-native architecture and your Containerfile uses `RUN` instructions, make sure emulation such as `qemu-user-static` is configured first.

```bash
# Create a simple Containerfile
mkdir -p ~/manifest-demo && cd ~/manifest-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
RUN apk add --no-cache curl
CMD ["sh", "-c", "echo Running on $(uname -m)"]
EOF

# Build for AMD64
podman build --platform linux/amd64 -t myapp:amd64 .

# Build for ARM64
podman build --platform linux/arm64 -t myapp:arm64 .

# Create the manifest list
podman manifest create myapp:latest

# Add both images to the manifest list
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64
```

## Verifying the Manifest List

Inspect the manifest list to confirm it has the correct entries.

```bash
# Inspect the manifest list
podman manifest inspect myapp:latest
```

The output shows both platform entries:

```json
{
  "schemaVersion": 2,
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "digest": "sha256:abc123...",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      }
    },
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "digest": "sha256:def456...",
      "platform": {
        "architecture": "arm64",
        "os": "linux"
      }
    }
  ]
}
```

## Creating a Manifest List with Registry References

You can also create manifest lists from images that are already in a registry.

```bash
# Push individual images to the registry first
podman push myapp:amd64 registry.example.com/myapp:amd64
podman push myapp:arm64 registry.example.com/myapp:arm64

# Create a manifest list referencing registry images
podman manifest create registry.example.com/myapp:latest \
  docker://registry.example.com/myapp:amd64 \
  docker://registry.example.com/myapp:arm64
```

## One-Line Manifest Creation

You can create a manifest list and add images in a single command.

```bash
# Create and populate in one step
podman manifest create myapp:v1.0 \
  myapp:amd64 \
  myapp:arm64

# Verify
podman manifest inspect myapp:v1.0
```

## Pushing the Manifest List

Push the manifest list to a container registry so others can use it.

```bash
# Push the manifest list to a registry
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest

# The --all flag ensures all referenced images are also pushed
```

## Complete Workflow Example

Here is a full end-to-end workflow:

```bash
#!/bin/bash
# build-multiarch.sh - Build and publish multi-arch images

IMAGE="registry.example.com/myapp"
TAG="v1.0"

# Step 1: Build for each architecture
podman build --platform linux/amd64 -t "${IMAGE}:${TAG}-amd64" .
podman build --platform linux/arm64 -t "${IMAGE}:${TAG}-arm64" .

# Step 2: Create the manifest list
podman manifest create "${IMAGE}:${TAG}"

# Step 3: Add images to the manifest
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-amd64"
podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-arm64"

# Step 4: Verify
podman manifest inspect "${IMAGE}:${TAG}"

# Step 5: Push to registry
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

echo "Published ${IMAGE}:${TAG} for amd64 and arm64"
```

## Listing Local Manifests

View all manifest lists on your system.

```bash
# List all images including manifests
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}"

# Specifically inspect a manifest
podman manifest inspect myapp:latest | jq '.manifests[] | {digest: .digest, arch: .platform.architecture}'
```

## Removing a Manifest List

```bash
# Remove a manifest list
podman manifest rm myapp:latest

# Verify it is gone
podman manifest inspect myapp:latest  # Should return an error
```

## Summary

Manifest lists in Podman let you group architecture-specific images under a single tag. Use `podman manifest create` to initialize the list, `podman manifest add` to add platform-specific images, and `podman manifest push --all` to publish everything to a registry. This enables seamless multi-architecture deployments where users pull a single tag and automatically get the right image for their platform.

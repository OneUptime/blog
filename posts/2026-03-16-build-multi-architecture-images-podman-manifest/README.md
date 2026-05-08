# How to Build Multi-Architecture Images with podman manifest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture, Build

Description: Learn how to use the podman manifest workflow to build, assemble, and publish multi-architecture container images step by step with full control over each platform.

---

> The podman manifest workflow gives you explicit control over each platform build and assembly step, making it ideal for complex CI/CD pipelines and custom build processes.

While `podman build --platform` can build for multiple architectures in one command, the `podman manifest` workflow gives you more control. You build each architecture separately, create a manifest list, add each image, and push the result. This approach is especially useful in CI/CD where different architectures build on different machines.

---

## The Manifest Workflow Overview

The workflow has four steps:

1. Build images for each architecture
2. Create a manifest list
3. Add images to the manifest list
4. Push the manifest list to a registry

```bash
# Step 1: Build

podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Step 2: Create
podman manifest create myapp:latest

# Step 3: Add
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64

# Step 4: Push
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest
```

## When to Use Manifest Workflow vs Build --platform

Use the manifest workflow when:
- Different architectures build on different machines
- You need custom build arguments per architecture
- You want to add pre-built images from registries
- You need to annotate individual manifest entries
- Your CI/CD runs architecture builds in parallel jobs

Use `podman build --platform` when:
- You are building everything on one machine
- The Containerfile is the same for all architectures
- You want the simplest possible workflow

## Detailed Example

```bash
mkdir -p ~/manifest-workflow && cd ~/manifest-workflow

cat > Containerfile <<'EOF'
FROM alpine:3.19

ARG TARGETARCH

RUN apk add --no-cache curl && \
    echo "Built for ${TARGETARCH}" > /build-info.txt

CMD ["cat", "/build-info.txt"]
EOF

# Build each platform separately with full control
echo "=== Building AMD64 ==="
podman build \
  --platform linux/amd64 \
  --build-arg TARGETARCH=amd64 \
  -t myapp:amd64 \
  .

echo "=== Building ARM64 ==="
podman build \
  --platform linux/arm64 \
  --build-arg TARGETARCH=arm64 \
  -t myapp:arm64 \
  .

echo "=== Building s390x ==="
podman build \
  --platform linux/s390x \
  --build-arg TARGETARCH=s390x \
  -t myapp:s390x \
  .

# Create and assemble the manifest
podman manifest create myapp:v1.0

podman manifest add myapp:v1.0 myapp:amd64
podman manifest add myapp:v1.0 myapp:arm64
podman manifest add myapp:v1.0 myapp:s390x

# Verify
podman manifest inspect myapp:v1.0 | \
  jq '.manifests[] | {arch: .platform.architecture}'
```

## Per-Architecture Build Customization

The manifest workflow allows different build arguments or even different Containerfiles per architecture.

```bash
# AMD64 build with specific optimization flags
podman build \
  --platform linux/amd64 \
  --build-arg COMPILER_FLAGS="-march=x86-64-v3" \
  -t myapp:amd64 \
  .

# ARM64 build with different flags
podman build \
  --platform linux/arm64 \
  --build-arg COMPILER_FLAGS="-march=armv8-a" \
  -t myapp:arm64 \
  .

# Assemble into manifest
podman manifest create myapp:optimized
podman manifest add myapp:optimized myapp:amd64
podman manifest add myapp:optimized myapp:arm64
```

## Adding Annotations to Manifest Entries

Annotate individual entries with additional metadata.

```bash
# Create manifest and add images
podman manifest create myapp:v1.0
podman manifest add myapp:v1.0 myapp:amd64
podman manifest add myapp:v1.0 myapp:arm64

# Annotate the AMD64 entry
AMD64_DIGEST=$(podman manifest inspect myapp:v1.0 | \
  jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest')

podman manifest annotate myapp:v1.0 "${AMD64_DIGEST}" \
  --annotation "build.host=ci-amd64-01" \
  --annotation "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## CI/CD Pipeline with Separate Jobs

In CI/CD, each architecture can build in its own job, with a final assembly job.

```bash
#!/bin/bash
# job-build-amd64.sh - Runs on AMD64 build agent
REGISTRY="registry.example.com"
IMAGE="${REGISTRY}/myapp"
TAG="${CI_COMMIT_TAG}"

podman build --platform linux/amd64 -t "${IMAGE}:${TAG}-amd64" .
podman push "${IMAGE}:${TAG}-amd64"
```

```bash
#!/bin/bash
# job-build-arm64.sh - Runs on ARM64 build agent
REGISTRY="registry.example.com"
IMAGE="${REGISTRY}/myapp"
TAG="${CI_COMMIT_TAG}"

podman build --platform linux/arm64 -t "${IMAGE}:${TAG}-arm64" .
podman push "${IMAGE}:${TAG}-arm64"
```

```bash
#!/bin/bash
# job-assemble-manifest.sh - Runs after all builds complete
REGISTRY="registry.example.com"
IMAGE="${REGISTRY}/myapp"
TAG="${CI_COMMIT_TAG}"

# Create manifest from pushed images
podman manifest create "${IMAGE}:${TAG}" \
  "${IMAGE}:${TAG}-amd64" \
  "${IMAGE}:${TAG}-arm64"

# Push the manifest list
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:latest"

echo "Published: ${IMAGE}:${TAG}"
```

## Mixing Local and Remote Images

```bash
# Some images built locally, some pulled from a registry
podman manifest create myapp:combined

# Add a locally built image
podman manifest add myapp:combined myapp:amd64

# Add an image from a registry
podman manifest add myapp:combined docker://registry.example.com/myapp:arm64-prebuilt
```

## Updating a Published Manifest

Replace one architecture in an already-published manifest.

```bash
#!/bin/bash
IMAGE="registry.example.com/myapp:v1.0"

# Pull the existing manifest entries into a local manifest list
podman manifest create --all "${IMAGE}" "docker://${IMAGE}"

# Remove the old ARM64 entry
OLD_DIGEST=$(podman manifest inspect "${IMAGE}" | \
  jq -r '.manifests[] | select(.platform.architecture == "arm64") | .digest')

if [ -n "${OLD_DIGEST}" ] && [ "${OLD_DIGEST}" != "null" ]; then
  podman manifest remove "${IMAGE}" "${OLD_DIGEST}"
fi

# Build the new ARM64 image
podman build --platform linux/arm64 -t myapp:arm64-fixed .

# Add the new ARM64 entry
podman manifest add "${IMAGE}" myapp:arm64-fixed

# Push the updated manifest
podman manifest push --all "${IMAGE}" "docker://${IMAGE}"
```

## Cleanup After Building

```bash
# Remove the manifest list
podman manifest rm myapp:latest

# Remove architecture-specific images
podman rmi myapp:amd64 myapp:arm64 myapp:s390x

# Or clean up everything
podman system prune -f
```

## Summary

The `podman manifest` workflow provides explicit control over multi-architecture image assembly. Build each platform independently with custom settings, create a manifest list, add images one by one with optional annotations, and push the assembled manifest to a registry. This approach excels in CI/CD pipelines where builds run on separate machines and need to be combined in a final step. Use `podman manifest inspect` at each stage to verify your manifest list is correct before pushing.

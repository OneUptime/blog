# How to Annotate a Manifest List Entry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture

Description: Learn how to use podman manifest annotate to add metadata, platform details, and custom annotations to individual entries in a manifest list.

---

> Annotating manifest list entries lets you attach platform specifics, OS versions, and custom metadata to each architecture variant in your multi-arch image.

The `podman manifest annotate` command lets you modify the metadata of individual entries in a manifest list. You can set or correct the architecture, OS, variant, and add custom annotations. This is useful when images lack proper platform metadata or when you need to attach build information.

---

## Basic Annotation Syntax

```bash
# General syntax

podman manifest annotate [options] <manifest-list> <digest-or-image>
```

You need the digest of the specific entry you want to annotate. Get it from `podman manifest inspect`.

## Setting Up an Example

```bash
mkdir -p ~/annotate-demo && cd ~/annotate-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
CMD ["sh", "-c", "echo Platform: $(uname -m)"]
EOF

# Build images for different architectures
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .
podman build --platform linux/arm/v7 -t myapp:armv7 .

# Create a manifest list and add images
podman manifest create myapp:latest
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64
podman manifest add myapp:latest myapp:armv7
```

## Adding Custom Annotations

Annotations are key-value pairs that attach metadata to a manifest entry.

```bash
# Get the digest of the AMD64 entry
AMD64_DIGEST=$(podman manifest inspect myapp:latest | \
  jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest')

# Add custom annotations
podman manifest annotate myapp:latest "${AMD64_DIGEST}" \
  --annotation "org.opencontainers.image.authors=team@example.com" \
  --annotation "org.opencontainers.image.version=1.0.0" \
  --annotation "build.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotation "build.host=ci-runner-01"

# Verify annotations
podman manifest inspect myapp:latest | \
  jq '.manifests[] | select(.platform.architecture == "amd64") | .annotations'
```

## Correcting Platform Information

If an image has incorrect or missing platform metadata, annotate it with the correct values.

```bash
# Get the entry digest
ENTRY_DIGEST=$(podman manifest inspect myapp:latest | \
  jq -r '.manifests[0].digest')

# Set or correct architecture
podman manifest annotate myapp:latest "${ENTRY_DIGEST}" \
  --arch amd64

# Set OS
podman manifest annotate myapp:latest "${ENTRY_DIGEST}" \
  --os linux

# Set variant (important for ARM)
ARM_DIGEST=$(podman manifest inspect myapp:latest | \
  jq -r '.manifests[] | select(.platform.architecture == "arm") | .digest')

podman manifest annotate myapp:latest "${ARM_DIGEST}" \
  --variant v7
```

## Setting OS Version and Features

For Windows containers or specialized platforms, set OS version and features.

```bash
# Set OS version (commonly used for Windows containers)
podman manifest annotate myapp:latest "${ENTRY_DIGEST}" \
  --os-version "10.0.17763.0"

# Set OS features
podman manifest annotate myapp:latest "${ENTRY_DIGEST}" \
  --os-features "win32k"
```

## Annotating All Entries in a Script

```bash
#!/bin/bash
# annotate-all.sh - Add build metadata to all manifest entries

MANIFEST="myapp:latest"
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BUILD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Get all digests
DIGESTS=$(podman manifest inspect "${MANIFEST}" | \
  jq -r '.manifests[].digest')

for DIGEST in ${DIGESTS}; do
  ARCH=$(podman manifest inspect "${MANIFEST}" | \
    jq -r ".manifests[] | select(.digest == \"${DIGEST}\") | .platform.architecture")

  echo "Annotating ${ARCH} (${DIGEST})..."

  podman manifest annotate "${MANIFEST}" "${DIGEST}" \
    --annotation "build.date=${BUILD_DATE}" \
    --annotation "build.commit=${BUILD_COMMIT}" \
    --annotation "build.architecture=${ARCH}"
done

echo ""
echo "Annotations applied. Verifying:"
podman manifest inspect "${MANIFEST}" | \
  jq '.manifests[] | {arch: .platform.architecture, annotations}'
```

## OCI Standard Annotations

Use standard OCI annotation keys for interoperability.

```bash
DIGEST=$(podman manifest inspect myapp:latest | \
  jq -r '.manifests[0].digest')

podman manifest annotate myapp:latest "${DIGEST}" \
  --annotation "org.opencontainers.image.title=My Application" \
  --annotation "org.opencontainers.image.description=A multi-arch demo app" \
  --annotation "org.opencontainers.image.version=1.0.0" \
  --annotation "org.opencontainers.image.authors=dev@example.com" \
  --annotation "org.opencontainers.image.url=https://example.com/myapp" \
  --annotation "org.opencontainers.image.source=https://github.com/example/myapp" \
  --annotation "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotation "org.opencontainers.image.revision=$(git rev-parse HEAD)"
```

## Viewing Annotations After Push

Annotations are preserved when pushing to a registry.

```bash
# Push the annotated manifest
podman manifest push --all myapp:latest docker://registry.example.com/myapp:latest

# Inspect remotely to verify annotations
podman manifest inspect registry.example.com/myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, annotations}'

# Or use skopeo
skopeo inspect --raw docker://registry.example.com/myapp:latest | \
  jq '.manifests[] | .annotations'
```

## Removing Annotations

To remove an annotation, you cannot directly delete it. Instead, rebuild or re-add the image.

```bash
# Remove the entry and re-add it without annotations
DIGEST=$(podman manifest inspect myapp:latest | \
  jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest')

podman manifest remove myapp:latest "${DIGEST}"
podman manifest add myapp:latest myapp:amd64

# Verify annotations are gone
podman manifest inspect myapp:latest | \
  jq '.manifests[] | select(.platform.architecture == "amd64") | .annotations'
```

## CI/CD Integration

```bash
#!/bin/bash
# ci-annotate.sh - Annotate manifest entries in CI/CD

MANIFEST="${REGISTRY}/${IMAGE}:${TAG}"

# Build and create manifest (from previous steps)
# ...

# Annotate each entry with CI metadata
for DIGEST in $(podman manifest inspect "${MANIFEST}" | jq -r '.manifests[].digest'); do
  podman manifest annotate "${MANIFEST}" "${DIGEST}" \
    --annotation "ci.pipeline=${CI_PIPELINE_ID}" \
    --annotation "ci.job=${CI_JOB_ID}" \
    --annotation "ci.branch=${CI_COMMIT_BRANCH}" \
    --annotation "ci.commit=${CI_COMMIT_SHA}" \
    --annotation "ci.build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
done

# Push with annotations
podman manifest push --all "${MANIFEST}" "docker://${MANIFEST}"
```

## Summary

Use `podman manifest annotate` to add metadata to individual manifest list entries. You can set or correct platform information (architecture, OS, variant), add OCI standard annotations, and attach custom build metadata. Get the entry digest from `podman manifest inspect`, then apply annotations before pushing to a registry. Annotations are preserved when the manifest list or image index is pushed and inspected remotely, making them useful for tracking build provenance and platform details.

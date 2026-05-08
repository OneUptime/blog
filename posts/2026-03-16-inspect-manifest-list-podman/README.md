# How to Inspect a Manifest List with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture

Description: Learn how to inspect manifest lists with Podman to view platform entries, digests, sizes, and other metadata for multi-architecture container images.

---

> Inspecting a manifest list reveals all the platform-specific images it contains, their digests, and their metadata, giving you full visibility into your multi-arch image setup.

Manifest lists group multiple architecture-specific images under a single tag. Inspecting them is essential for verifying that all target platforms are included, checking digests for security, and debugging multi-arch image issues. Podman provides several tools for this purpose.

---

## Basic Manifest Inspection

The primary command is `podman manifest inspect`.

```bash
# Inspect a local manifest list

podman manifest inspect myapp:latest
```

This produces JSON output similar to:

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "size": 480,
      "digest": "sha256:a1b2c3d4...",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      }
    },
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "size": 480,
      "digest": "sha256:e5f6a7b8...",
      "platform": {
        "architecture": "arm64",
        "os": "linux"
      }
    }
  ]
}
```

## Inspecting Remote Manifest Lists

Inspect manifest lists directly from a registry without pulling them.

```bash
# Inspect a remote manifest list
podman manifest inspect docker://docker.io/library/alpine:3.19

# Inspect from a private registry
podman manifest inspect docker://registry.example.com/myapp:latest

# Inspect from a specific registry with authentication
podman login registry.example.com
podman manifest inspect docker://registry.example.com/myapp:v1.0
```

## Extracting Specific Information with jq

Use `jq` to filter the manifest inspection output.

```bash
# List all supported architectures
podman manifest inspect myapp:latest | \
  jq '.manifests[].platform.architecture'

# Get architecture and OS for each entry
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os}'

# Include variant information (important for ARM)
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os, variant: .platform.variant}'

# Get digests for each platform
podman manifest inspect myapp:latest | \
  jq '.manifests[] | "\(.platform.architecture): \(.digest)"'

# Count the number of platforms
podman manifest inspect myapp:latest | \
  jq '.manifests | length'
```

## Checking Image Sizes per Platform

```bash
# Show size of each platform entry
podman manifest inspect myapp:latest | \
  jq '.manifests[] | {arch: .platform.architecture, size_bytes: .size}'

# Human-readable sizes (approximate manifest size, not full image size)
podman manifest inspect myapp:latest | \
  jq '.manifests[] | "\(.platform.architecture): \(.size) bytes"'
```

## Comparing Local and Remote Manifests

Verify that your local manifest matches what is in the registry.

```bash
#!/bin/bash
# compare-manifests.sh - Compare local and remote manifests

MANIFEST="myapp:latest"
REMOTE="docker://registry.example.com/myapp:latest"

echo "=== Local Manifest ==="
podman manifest inspect "${MANIFEST}" | \
  jq '.manifests[] | {arch: .platform.architecture, digest: .digest}'

echo ""
echo "=== Remote Manifest ==="
podman manifest inspect "${REMOTE}" | \
  jq '.manifests[] | {arch: .platform.architecture, digest: .digest}'
```

## Inspecting Individual Platform Images

After identifying a digest from the manifest list, inspect the individual platform image.

```bash
IMAGE="registry.example.com/myapp"

# Get the digest for a specific architecture
AMD64_DIGEST=$(podman manifest inspect "docker://${IMAGE}:latest" | \
  jq -r '.manifests[] | select(.platform.architecture == "amd64") | .digest')

echo "AMD64 digest: ${AMD64_DIGEST}"

# Pull and inspect the platform-specific image by digest
podman pull "${IMAGE}@${AMD64_DIGEST}"
podman image inspect "${IMAGE}@${AMD64_DIGEST}"
```

## Verifying Platform Coverage

Check that your manifest list covers all required platforms.

```bash
#!/bin/bash
# verify-platforms.sh - Ensure required platforms are in the manifest

MANIFEST="${1:?Usage: $0 <manifest>}"
REQUIRED_ARCHS=("amd64" "arm64")

echo "Checking manifest: ${MANIFEST}"

AVAILABLE=$(podman manifest inspect "${MANIFEST}" | \
  jq -r '.manifests[].platform.architecture')

MISSING=()
for ARCH in "${REQUIRED_ARCHS[@]}"; do
  if echo "${AVAILABLE}" | grep -q "^${ARCH}$"; then
    echo "  [OK] ${ARCH}"
  else
    echo "  [MISSING] ${ARCH}"
    MISSING+=("${ARCH}")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: Missing architectures: ${MISSING[*]}"
  exit 1
else
  echo ""
  echo "All required platforms are present."
fi
```

Usage:

```bash
chmod +x verify-platforms.sh
./verify-platforms.sh myapp:latest
```

## Inspecting Well-Known Multi-Arch Images

Examine how popular images structure their manifest lists.

```bash
# Inspect Alpine's manifest list
podman manifest inspect docker://alpine:3.19 | \
  jq '.manifests[] | {arch: .platform.architecture, variant: .platform.variant, os: .platform.os}'

# Inspect Nginx's manifest list
podman manifest inspect docker://nginx:alpine | \
  jq '.manifests | length'

# Inspect Ubuntu's platform support
podman manifest inspect docker://ubuntu:22.04 | \
  jq '.manifests[] | "\(.platform.os)/\(.platform.architecture)"'
```

## Using skopeo for Advanced Inspection

The `skopeo` tool provides additional inspection capabilities.

```bash
# Install skopeo
# Fedora: sudo dnf install skopeo
# Ubuntu: sudo apt-get install skopeo

# Inspect a remote manifest list with skopeo
skopeo inspect --raw docker://docker.io/library/alpine:3.19 | jq .

# Get detailed image info for a specific platform
skopeo inspect --override-arch arm64 docker://docker.io/library/alpine:3.19
```

## Checking Manifest Schema Version

```bash
# Check the schema version and media type
podman manifest inspect myapp:latest | \
  jq '{schemaVersion: .schemaVersion, mediaType: .mediaType}'

# OCI manifests use:
# mediaType: "application/vnd.oci.image.index.v1+json"

# Docker manifests use:
# mediaType: "application/vnd.docker.distribution.manifest.list.v2+json"
```

## Formatting Inspection Output

Create formatted reports from manifest inspections.

```bash
#!/bin/bash
# manifest-report.sh - Generate a manifest report

MANIFEST="${1:?Usage: $0 <manifest>}"

echo "Manifest Report: ${MANIFEST}"
echo "================================"
echo ""

podman manifest inspect "${MANIFEST}" | jq -r '
  "Schema Version: \(.schemaVersion)",
  "Media Type: \(.mediaType)",
  "",
  "Platforms (\(.manifests | length) total):",
  (.manifests[] | "  - \(.platform.os)/\(.platform.architecture)\(.platform.variant // "" | if . != "" then "/\(.)" else "" end)  digest: \(.digest[:20])...")
'
```

## Summary

Use `podman manifest inspect` to examine manifest lists, both local and remote. Combine it with `jq` to extract platform details, digests, and sizes. Verify platform coverage before pushing to registries and compare local and remote manifests to ensure consistency. For advanced inspection of remote registries, `skopeo` complements Podman's built-in tools.

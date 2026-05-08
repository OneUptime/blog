# How to Remove an Image from a Manifest List with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Manifest, Multi-Architecture

Description: Learn how to remove specific architecture entries from a Podman manifest list using digest references, and how to manage manifest list updates.

---

> Removing an image from a manifest list lets you update or correct multi-architecture references without rebuilding the entire manifest from scratch.

When managing manifest lists, you may need to remove an image entry, for example when replacing a broken build for a specific architecture or dropping support for a platform. Podman provides the `podman manifest remove` command for this purpose.

---

## Understanding Manifest Entries

Each image in a manifest list is identified by its digest (a SHA256 hash). To remove an image, you need to know its digest.

```bash
# Inspect the manifest list to see all entries and their digests

podman manifest inspect myapp:latest
```

The output includes digests for each entry:

```json
{
  "manifests": [
    {
      "digest": "sha256:cb8a924afdf0229ef7515d9e5b3024e23b3eb03ddbba287f4a19c6ac90b8d221",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      }
    },
    {
      "digest": "sha256:8e834c96f733b0a9e689c9e605d945c89bd60f2f3c7f9400ab8bd0ee0b2d44f9",
      "platform": {
        "architecture": "arm64",
        "os": "linux"
      }
    }
  ]
}
```

## Removing an Image by Digest

Use `podman manifest remove` with the manifest list name and the digest of the entry to remove.

```bash
# First, find the digest of the image you want to remove
podman manifest inspect myapp:latest | jq '.manifests[] | {digest, arch: .platform.architecture}'

# Remove the specific entry by digest
podman manifest remove myapp:latest sha256:cb8a924afdf0229ef7515d9e5b3024e23b3eb03ddbba287f4a19c6ac90b8d221

# Verify the entry was removed
podman manifest inspect myapp:latest
```

## Step-by-Step Example

Create a manifest list, add images, then remove one.

```bash
mkdir -p ~/manifest-remove-demo && cd ~/manifest-remove-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
CMD ["sh", "-c", "echo Architecture: $(uname -m)"]
EOF

# Build for three architectures
podman build --platform linux/amd64 -t localhost/myapp:amd64 .
podman build --platform linux/arm64 -t localhost/myapp:arm64 .
podman build --platform linux/arm/v7 -t localhost/myapp:armv7 .

# Create manifest and add all three
podman manifest create localhost/myapp:latest
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:amd64
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:arm64
podman manifest add localhost/myapp:latest containers-storage:localhost/myapp:armv7

# Verify all three are present
echo "Before removal:"
podman manifest inspect localhost/myapp:latest | \
  jq '.manifests[] | "\(.platform.architecture)/\(.platform.variant // "") - \(.digest)"'

# Get the digest of the armv7 entry
ARMV7_DIGEST=$(podman manifest inspect localhost/myapp:latest | \
  jq -r '.manifests[] | select(.platform.architecture == "arm" and .platform.variant == "v7") | .digest')

echo "Removing ARM v7 entry: ${ARMV7_DIGEST}"

# Remove the armv7 entry
podman manifest remove localhost/myapp:latest "${ARMV7_DIGEST}"

# Verify it was removed
echo "After removal:"
podman manifest inspect localhost/myapp:latest | \
  jq '.manifests[] | "\(.platform.architecture)/\(.platform.variant // "") - \(.digest)"'
```

## Scripting Removal by Architecture

Write a helper script to remove entries by architecture name instead of digest.

```bash
#!/bin/bash
# remove-arch.sh - Remove a platform from a manifest list
# Usage: ./remove-arch.sh <manifest> <architecture>

MANIFEST="${1:?Usage: $0 <manifest> <architecture>}"
ARCH="${2:?Usage: $0 <manifest> <architecture>}"

# Find the digest for the specified architecture
DIGEST=$(podman manifest inspect "${MANIFEST}" | \
  jq -r ".manifests[] | select(.platform.architecture == \"${ARCH}\") | .digest")

if [ -z "${DIGEST}" ] || [ "${DIGEST}" = "null" ]; then
  echo "Error: No entry found for architecture '${ARCH}' in '${MANIFEST}'"
  exit 1
fi

echo "Removing ${ARCH} (${DIGEST}) from ${MANIFEST}"
podman manifest remove "${MANIFEST}" "${DIGEST}"

echo "Done. Remaining entries:"
podman manifest inspect "${MANIFEST}" | \
  jq '.manifests[] | {arch: .platform.architecture, os: .platform.os}'
```

Usage:

```bash
chmod +x remove-arch.sh

# Remove ARM64 from the manifest
./remove-arch.sh myapp:latest arm64

# Remove AMD64 from the manifest
./remove-arch.sh myapp:latest amd64
```

## Replacing an Image in a Manifest List

A common workflow is to remove an old entry and add an updated one for the same architecture.

```bash
#!/bin/bash
# replace-arch.sh - Replace an architecture in a manifest list
# Usage: ./replace-arch.sh <manifest> <architecture> <new-image>

MANIFEST="${1}"
ARCH="${2}"
NEW_IMAGE="${3}"

# Remove the existing entry for this architecture
DIGEST=$(podman manifest inspect "${MANIFEST}" | \
  jq -r ".manifests[] | select(.platform.architecture == \"${ARCH}\") | .digest")

if [ -n "${DIGEST}" ] && [ "${DIGEST}" != "null" ]; then
  echo "Removing old ${ARCH} entry..."
  podman manifest remove "${MANIFEST}" "${DIGEST}"
fi

# Add the new image. Use containers-storage: for a locally built image, or docker:// for a registry image.
echo "Adding new ${ARCH} image..."
podman manifest add "${MANIFEST}" "${NEW_IMAGE}"

echo "Updated manifest:"
podman manifest inspect "${MANIFEST}" | \
  jq '.manifests[] | {arch: .platform.architecture, digest: .digest}'
```

Usage:

```bash
# Rebuild the ARM64 image
podman build --platform linux/arm64 -t localhost/myapp:arm64-v2 .

# Replace in the manifest
./replace-arch.sh localhost/myapp:latest arm64 containers-storage:localhost/myapp:arm64-v2
```

## Removing All Entries

To clear a manifest list entirely, remove each entry or delete and recreate the manifest.

```bash
# Method 1: Remove each entry
for DIGEST in $(podman manifest inspect myapp:latest | jq -r '.manifests[].digest'); do
  podman manifest remove myapp:latest "${DIGEST}"
done

# Method 2: Delete and recreate
podman manifest rm myapp:latest
podman manifest create myapp:latest
```

## Handling Errors

Common errors and their solutions:

```bash
# Error: manifest list not found
# Solution: Check the manifest list name
podman manifest inspect myapp:latest

# Error: digest not found in manifest
# Solution: Verify the digest exists
podman manifest inspect myapp:latest | jq '.manifests[].digest'

# Error: cannot remove from a non-manifest
# Solution: Ensure you are operating on a manifest list, not a regular image
podman inspect myapp:latest --format '{{.ManifestType}}'
```

## Deleting the Entire Manifest List

If you no longer need the manifest list at all:

```bash
# Remove the manifest list
podman manifest rm myapp:latest

# This does NOT remove the individual architecture-specific images
# Those still exist as separate images
podman images | grep myapp
```

## Summary

Use `podman manifest remove` with a digest to remove specific platform entries from a manifest list. Find digests with `podman manifest inspect` and use `jq` to filter by architecture. For common operations, script the removal and replacement workflow to avoid manual digest lookups. Remember that removing an entry from a manifest list does not delete the underlying image itself.

# How to Delete Images from a Registry with Skopeo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Registry, Image Cleanup

Description: Learn how to use Skopeo to delete container images and tags from remote registries to manage storage and maintain clean repositories.

---

> Skopeo delete removes images directly from remote registries, enabling you to clean up old tags and free storage without any graphical interface.

Container registries accumulate images over time, consuming storage and making it harder to find the versions that matter. Skopeo provides a `delete` command that removes images from remote registries directly from the command line. This is especially useful for automating cleanup of old, unused, or vulnerable images. This guide shows you how to delete images from registries safely and efficiently using Skopeo.

---

## Prerequisites

Before deleting images, ensure you have the right tools and permissions.

```bash
# Install Skopeo

sudo dnf install -y skopeo    # Fedora/RHEL
sudo apt-get install -y skopeo # Ubuntu/Debian

# Verify the installation
skopeo --version

# Log in to the target registry with Podman
podman login registry.example.com
```

Your registry must have the delete API enabled. For Docker Distribution registries, ensure the `REGISTRY_STORAGE_DELETE_ENABLED=true` environment variable is set.

## Deleting a Single Image Reference

The basic `skopeo delete` command deletes the manifest referenced by a tag or digest. In current Skopeo versions, deleting by tag resolves that tag to a digest first, so other tags that point to the same manifest may be affected too.

```bash
# Delete a specific tag from a private registry
skopeo delete docker://registry.example.com/myapp:v1.0

# Delete a tag from a local development registry
skopeo delete \
  --tls-verify=false \
  docker://localhost:5000/myapp:old-tag

# Delete using explicit credentials
skopeo delete \
  --creds "admin:secretpassword" \
  docker://registry.example.com/myapp:deprecated
```

## Deleting by Digest

Deleting by digest makes the exact manifest being deleted explicit. The registry removes the manifest reference, and unreferenced layers are reclaimed later by garbage collection.

```bash
# First, get the digest of the image
DIGEST=$(skopeo inspect docker://registry.example.com/myapp:v1.0 | \
  jq -r '.Digest')

echo "Image digest: $DIGEST"

# Delete the image by its digest
skopeo delete "docker://registry.example.com/myapp@${DIGEST}"
```

## Bulk Deletion of Old Tags

Automate the cleanup of old tags using a script that lists and filters tags before deleting them.

```bash
#!/bin/bash
# cleanup-old-tags.sh - Delete tags older than a specified pattern

REGISTRY="registry.example.com"
IMAGE="myapp"
KEEP_PATTERN="^v[0-9]+\.[0-9]+$"  # Keep only major.minor tags

# Get all tags
ALL_TAGS=$(skopeo list-tags "docker://${REGISTRY}/${IMAGE}" | \
  jq -r '.Tags[]')

for TAG in $ALL_TAGS; do
  # Skip tags matching the keep pattern
  if echo "$TAG" | grep -qE "$KEEP_PATTERN"; then
    echo "Keeping: ${TAG}"
    continue
  fi

  echo "Deleting: ${IMAGE}:${TAG}"
  skopeo delete "docker://${REGISTRY}/${IMAGE}:${TAG}"
done
```

## Deleting Images Based on Age

Use Skopeo inspect to check image creation dates before deleting.

```bash
#!/bin/bash
# delete-old-images.sh - Delete images older than N days

REGISTRY="registry.example.com"
IMAGE="myapp"
MAX_AGE_DAYS=90
CUTOFF_DATE=$(date -d "-${MAX_AGE_DAYS} days" +%s)

# Get all tags
TAGS=$(skopeo list-tags "docker://${REGISTRY}/${IMAGE}" | jq -r '.Tags[]')

for TAG in $TAGS; do
  # Get the image creation date
  CREATED=$(skopeo inspect "docker://${REGISTRY}/${IMAGE}:${TAG}" | \
    jq -r '.Created')

  # Convert to epoch for comparison
  CREATED_EPOCH=$(date -d "$CREATED" +%s 2>/dev/null)

  if [ -n "$CREATED_EPOCH" ] && [ "$CREATED_EPOCH" -lt "$CUTOFF_DATE" ]; then
    echo "Deleting old image: ${IMAGE}:${TAG} (created: ${CREATED})"
    skopeo delete "docker://${REGISTRY}/${IMAGE}:${TAG}"
  else
    echo "Keeping: ${IMAGE}:${TAG}"
  fi
done
```

## Running Garbage Collection After Deletion

Deleting tags and manifests does not immediately free disk space. You need to run garbage collection on the registry.

```bash
# For Docker Distribution (registry:2), run garbage collection
# Stop the registry temporarily for safe garbage collection
podman stop registry

# Run garbage collection
podman run --rm \
  -v registry-data:/var/lib/registry \
  registry:2 \
  bin/registry garbage-collect /etc/docker/registry/config.yml

# Restart the registry
podman start registry
```

## Safety Practices for Image Deletion

Always verify before deleting to avoid removing images that are in use.

```bash
#!/bin/bash
# safe-delete.sh - Delete with confirmation and logging

REGISTRY="registry.example.com"
IMAGE="$1"
TAG="$2"
LOG_FILE="/var/log/image-deletions.log"

# Inspect the image first
echo "Inspecting ${IMAGE}:${TAG}..."
skopeo inspect "docker://${REGISTRY}/${IMAGE}:${TAG}" | \
  jq '{Digest, Created, Architecture}'

# Prompt for confirmation
read -p "Delete ${IMAGE}:${TAG}? (y/N): " CONFIRM
if [ "$CONFIRM" = "y" ]; then
  skopeo delete "docker://${REGISTRY}/${IMAGE}:${TAG}"
  echo "$(date) DELETED ${IMAGE}:${TAG}" >> "$LOG_FILE"
  echo "Image deleted and logged."
else
  echo "Skipping deletion."
fi
```

## Summary

Skopeo delete provides a command-line method for removing container image manifests from registries. You can delete by tag or by digest, script bulk cleanups based on naming patterns or age, and integrate deletion into automated maintenance workflows. Always remember to run garbage collection on your registry after deletions to reclaim disk space. Combine Skopeo delete with Podman authentication for seamless access to private registries, and always implement safety checks to avoid accidentally removing images that are still in use.

# How to Untag an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Tagging

Description: Learn how to remove tags from container images using Podman without deleting the underlying image data.

---

> Untagging an image removes the name reference but preserves the image data as long as other tags still reference it.

Over time, local image stores accumulate tags that are no longer needed. Podman's `untag` command lets you remove specific tags from images without deleting the underlying image layers. This is useful for cleaning up old version tags, correcting naming mistakes, and managing your image inventory.

---

## Understanding Untag vs Remove

It is important to understand the difference between untagging and removing.

```bash
# Untag: removes name/tag references; specify a name to remove only that tag

podman untag myapp:old-tag

# Remove (rmi): removes the image entirely if no containers reference it
podman rmi myapp:old-tag

# Key difference:
# - An image with multiple tags: untag can remove one name when you specify it
# - An image with only one tag: untag leaves a dangling (untagged) image
# - rmi removes the image data when the last reference is gone
```

## Basic Untagging

Remove a specific tag from an image.

```bash
# First, see current tags
podman images myapp --format "table {{.Tag}}\t{{.ID}}"

# Get the image ID for the tag, then untag that specific version
IMAGE_ID=$(podman images myapp:v1.0.0 -q | head -1)
podman untag "$IMAGE_ID" myapp:v1.0.0

# Verify the tag was removed
podman images myapp --format "table {{.Tag}}\t{{.ID}}"
```

## Untagging One of Multiple Tags

When an image has multiple tags, untagging one leaves the others intact.

```bash
# Create an image with multiple tags
podman tag nginx:1.25 my-nginx:latest
podman tag nginx:1.25 my-nginx:v1
podman tag nginx:1.25 my-nginx:production

# List all tags (they share the same image ID)
podman images my-nginx --format "table {{.Tag}}\t{{.ID}}"

# Remove just the "production" tag
podman untag my-nginx:latest my-nginx:production

# The other tags still exist
podman images my-nginx --format "table {{.Tag}}\t{{.ID}}"
```

## Removing All Tags from an Image

Remove every tag from an image by its ID.

```bash
# Get the image ID
IMAGE_ID=$(podman images myapp -q | head -1)

# Remove all tags from this image
podman untag "$IMAGE_ID"

# The image still exists but is now dangling (untagged)
podman images --filter dangling=true

# You can re-tag it if needed
podman tag "$IMAGE_ID" myapp:restored
```

## Untagging Registry-Qualified Names

Remove registry-specific tags that were added for pushing.

```bash
# You may have tagged an image for multiple registries
podman images myapp --format "{{.Repository}}:{{.Tag}}" --no-trunc

# Remove the Docker Hub tag
podman untag myapp:v1.0.0 docker.io/myuser/myapp:v1.0.0

# Remove the Quay.io tag
podman untag myapp:v1.0.0 quay.io/myorg/myapp:v1.0.0

# Keep only the local tag
podman images --filter reference='.*myapp.*' \
  --format "{{.Repository}}:{{.Tag}}"
```

## Cleaning Up Old Version Tags

Remove outdated version tags in bulk.

```bash
#!/bin/bash
# Remove all version tags older than a specific version

IMAGE="myapp"
KEEP_VERSION="2.0.0"

echo "Removing tags older than ${KEEP_VERSION} for ${IMAGE}..."

podman images "${IMAGE}" --format "{{.ID}}\t{{.Tag}}" | while read -r IMAGE_ID TAG; do
  # Skip non-version tags
  if ! echo "$TAG" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    continue
  fi

  # Compare numeric version tags
  if [ "$(printf '%s\n' "$KEEP_VERSION" "$TAG" | sort -V | head -1)" = "$TAG" ] && \
     [ "$TAG" != "$KEEP_VERSION" ]; then
    echo "Untagging ${IMAGE}:${TAG}"
    podman untag "$IMAGE_ID" "${IMAGE}:${TAG}"
  fi
done

echo "Remaining tags:"
podman images "${IMAGE}" --format "  {{.Repository}}:{{.Tag}}"
```

## Handling Dangling Images After Untagging

When you untag the last tag on an image, it becomes a dangling image.

```bash
# Untag the last remaining tag
podman untag myapp:latest

# The image is now dangling
podman images --filter dangling=true

# Clean up dangling images
podman image prune
# This will prompt for confirmation

# Force prune without confirmation
podman image prune -f
```

## Untagging in a CI/CD Cleanup Script

Automate tag cleanup after deployments.

```bash
#!/bin/bash
# Clean up old CI/CD tags, keep only the latest N builds

IMAGE="myapp"
KEEP_COUNT=5

echo "Cleaning up old build tags for ${IMAGE}..."

# Get all tags sorted by creation time, skip the newest N
OLD_TAGS=$(podman images "${IMAGE}" \
  --format "{{.CreatedAt}}\t{{.ID}}\t{{.Tag}}" \
  | sort -r \
  | tail -n +$((KEEP_COUNT + 1)) \
  | awk '{print $(NF-1) "\t" $NF}')

if [ -z "$OLD_TAGS" ]; then
  echo "No old tags to remove."
  exit 0
fi

echo "Removing old tags:"
while read -r IMAGE_ID TAG; do
  [ -z "$IMAGE_ID" ] && continue
  echo "  Untagging ${IMAGE}:${TAG}"
  podman untag "$IMAGE_ID" "${IMAGE}:${TAG}"
done <<< "$OLD_TAGS"

# Clean up any resulting dangling images
podman image prune -f

echo "Done. Remaining tags:"
podman images "${IMAGE}" --format "  {{.Repository}}:{{.Tag}}"
```

## Verifying After Untagging

Confirm that the untag operation worked as expected.

```bash
# List remaining tags for the image
podman images myapp --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}"

# Check for any new dangling images
podman images --filter dangling=true

# Verify specific tag is gone
if podman image exists myapp:v1.0.0; then
  echo "Tag still exists"
else
  echo "Tag successfully removed"
fi
```

## Summary

The `podman untag` command is a safe way to remove image name references without deleting image data. Use it to clean up old version tags, remove registry-specific tags after pushing, and manage your image naming. Remember that untagging the last tag on an image creates a dangling image that should be cleaned up with `podman image prune`. Integrate untagging into your CI/CD cleanup scripts to keep your local image store organized.

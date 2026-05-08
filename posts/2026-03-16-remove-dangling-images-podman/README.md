# How to Remove Dangling Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Cleanup, Storage

Description: Learn how to identify and remove dangling container images with Podman to reclaim wasted disk space from untagged image layers.

---

> Dangling images are the hidden storage consumers that accumulate silently with every image rebuild and tag update.

Dangling images are untagged images or filesystem layers that are no longer referenced by any image. They typically result from rebuilding images without removing the old version first, or from pulling updated tags that replace previous builds. This guide shows you how to find and remove dangling images with Podman.

---

## What Are Dangling Images

A dangling image is an image that has lost all its tag references. It shows as `<none>` in the repository and tag columns.

```bash
# List all images including dangling ones

podman images -a

# Dangling images appear as:
# <none>  <none>  abc123def456  3 days ago  150 MB

# They are created when:
# 1. You rebuild an image with the same tag
# 2. You pull an updated image that replaces the old one
# 3. You untag the last reference to an image
```

## Identifying Dangling Images

Filter specifically for dangling images.

```bash
# List only dangling images
podman images --filter dangling=true

# Count dangling images
podman images --filter dangling=true -q | wc -l

# Show dangling images with their sizes
podman images --filter dangling=true \
  --format "table {{.ID}}\t{{.Size}}\t{{.Created}}"

# List the reported sizes of dangling images
podman images --filter dangling=true \
  --format "{{.Size}}"
```

## Removing Dangling Images

Use `podman image prune` to remove all dangling images.

```bash
# Remove dangling images (prompts for confirmation)
podman image prune

# Remove dangling images without prompting
podman image prune -f

# Verify dangling images were removed
podman images --filter dangling=true
```

## Removing Dangling Images by ID

Remove specific dangling images individually.

```bash
# List dangling image IDs
podman images --filter dangling=true -q

# Remove a specific dangling image by ID
podman rmi abc123def456

# Remove all dangling images by ID
podman images --filter dangling=true -q | while read -r image_id; do
  podman rmi "$image_id"
done
```

## Understanding How Dangling Images Are Created

Here is a practical demonstration.

```bash
# Build an image
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:3.19
RUN echo "version 1" > /version.txt
CMD ["cat", "/version.txt"]
EOF

podman build -t myapp:latest .

# Note the image ID
podman images myapp --format "{{.ID}}"

# Rebuild with changes (this creates a dangling image)
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:3.19
RUN echo "version 2" > /version.txt
CMD ["cat", "/version.txt"]
EOF

podman build -t myapp:latest .

# The old image is now dangling
podman images --filter dangling=true

# Clean up the Containerfile
rm -f Containerfile
```

## Filtering Dangling Images by Age

Remove only dangling images older than a certain period.

```bash
# Remove dangling images older than 24 hours
podman image prune --filter "until=24h"

# Remove dangling images older than 7 days
podman image prune --filter "until=168h"

# Remove dangling images older than 1 hour
podman image prune --filter "until=1h"
```

## Preventing Dangling Images

Strategies to minimize the creation of dangling images.

```bash
# Strategy 1: Remove old image before rebuilding
podman rmi myapp:latest 2>/dev/null
podman build -t myapp:latest .

# Strategy 2: Use --squash to reduce layers
podman build --squash -t myapp:latest .

# Strategy 3: Prune after every build in CI/CD
podman build -t myapp:latest .
podman image prune -f

# Strategy 4: Use a build script that auto-cleans
#!/bin/bash
podman build -t myapp:latest . && podman image prune -f
```

## Monitoring Dangling Image Accumulation

Track dangling images over time to understand your cleanup needs.

```bash
#!/bin/bash
# Monitor dangling image accumulation

COUNT=$(podman images --filter dangling=true -q | wc -l)
TOTAL_SIZE=$(podman system df --format '{{.Reclaimable}}' | head -1)

echo "$(date '+%Y-%m-%d %H:%M'): Dangling images: ${COUNT}, Reclaimable: ${TOTAL_SIZE}"

# Alert if too many dangling images
if [ "$COUNT" -gt 20 ]; then
  echo "WARNING: ${COUNT} dangling images detected. Consider running: podman image prune -f"
fi
```

## Including Dangling Images in System Cleanup

Combine dangling image removal with broader cleanup.

```bash
# Step 1: Remove dangling images
echo "Removing dangling images..."
podman image prune -f

# Step 2: Remove stopped containers
echo "Removing stopped containers..."
podman container prune -f

# Step 3: Check results
echo "=== Cleanup Summary ==="
podman system df
```

## Summary

Dangling images are an inevitable byproduct of container development and image rebuilding. Use `podman image prune` regularly to keep them from accumulating. In CI/CD pipelines, add a prune step after every build to prevent dangling images from consuming disk space. Understanding how dangling images are created helps you adopt build practices that minimize their occurrence in the first place.

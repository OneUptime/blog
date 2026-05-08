# How to Remove an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Cleanup

Description: Learn how to safely remove container images with Podman, including removing by name, ID, and handling images referenced by containers.

---

> Removing unused images regularly keeps your local storage clean and prevents disk space issues on build servers and development machines.

As you work with containers, your local image store grows with base images, build artifacts, and old versions. Podman's `rmi` command lets you remove images you no longer need. This guide covers safe image removal, handling dependencies, and cleaning up effectively.

---

## Basic Image Removal

Remove an image by its name and tag.

```bash
# Remove an image by name and tag

podman rmi nginx:1.25

# Remove an image using the full qualified name
podman rmi docker.io/library/nginx:1.25

# Remove an image using the "image rm" alias
podman image rm alpine:3.18

# Remove an image by its ID
podman rmi a3ed95caeb02
```

## Removing Multiple Images

Remove several images in a single command.

```bash
# Remove multiple images by name
podman rmi nginx:1.24 nginx:1.25 alpine:3.18

# Remove multiple images by ID
podman rmi a3ed95caeb02 05455a08881e b5d58f6c8a2d

# Remove all images matching a reference pattern
podman images --filter reference='myapp.*' -q | xargs podman rmi
```

## Handling Images with Multiple Tags

When an image has multiple tags, removing one tag only removes that specific reference.

```bash
# Check tags for an image
podman images myapp --format "table {{.Tag}}\t{{.ID}}"

# Remove just one tag (image data stays if other tags exist)
podman rmi myapp:v1.0.0

# The image is still accessible via other tags
podman images myapp

# To remove the image completely, remove all tags or use the ID
IMAGE_ID=$(podman images myapp -q | head -1)
podman rmi "$IMAGE_ID"
```

## Handling Images Used by Containers

Podman will not remove an image that is being used by a container.

```bash
# Try to remove an image with a running container
podman rmi nginx:1.25
# Error: image used by container abc123

# Check which containers use the image
podman ps -a --filter ancestor=nginx:1.25 \
  --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

# Stop and remove the container first
podman stop my-nginx
podman rm my-nginx

# Now remove the image
podman rmi nginx:1.25
```

## Removing Images by Digest

Remove images using their digest.

```bash
# List images with digests
podman images --digests

# Remove by digest
podman rmi docker.io/library/nginx@sha256:6db391d1c0cfb30588ba0bf72ea999404f2764deaf1c7ecf0ce05364afc0597e
```

## Dry Run Before Removal

Check what would be removed before actually removing.

```bash
# List images that match your removal criteria
podman images --filter reference='myapp.*' \
  --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.Created}}"

# Count images to be removed
podman images --filter reference='myapp.*' -q | wc -l

# Check if any containers depend on these images
for IMG in $(podman images --filter reference='myapp.*' -q); do
  CONTAINERS=$(podman ps -a --filter ancestor="$IMG" -q | wc -l)
  if [ "$CONTAINERS" -gt 0 ]; then
    echo "Image $IMG has $CONTAINERS container(s)"
  fi
done
```

## Scripting Image Removal

Automate image cleanup with scripts.

```bash
#!/bin/bash
# Remove images older than a specified number of days

DAYS="${1:-30}"
echo "Removing images older than ${DAYS} days..."

HOURS=$((DAYS * 24))

REMOVED=0
while read -r ID; do
  if [ -n "$ID" ]; then
    echo "Removing image ${ID}"
    podman rmi "$ID" 2>/dev/null && REMOVED=$((REMOVED + 1))
  fi
done < <(podman images --filter "until=${HOURS}h" -q)

echo "Cleanup complete. Removed ${REMOVED} image(s)."
```

## Checking Disk Space After Removal

Verify that disk space was reclaimed.

```bash
# Check storage before removal
echo "Before:"
podman system df

# Remove images
podman rmi myapp:v1.0.0 myapp:v1.1.0

# Check storage after removal
echo "After:"
podman system df
```

## Summary

Removing images with `podman rmi` is straightforward but requires awareness of dependencies. Always check for containers using an image before removal, and use scripts to automate cleanup of old images. Regular image removal, combined with `podman image prune` for dangling images, keeps your container storage efficient and your build environment clean.

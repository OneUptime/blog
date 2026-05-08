# How to Pull All Tags of an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry

Description: Learn how to pull all available tags of a container image using Podman, including listing available tags and scripting bulk pulls.

---

> Pulling all tags of an image is useful for mirroring registries, testing across versions, or populating a local cache.

There are scenarios where you need all versions of a container image available locally, such as mirroring images for an air-gapped environment, running compatibility tests, or populating a local registry cache. This guide shows you how to list and pull all tags of a container image with Podman.

---

## Listing Available Tags

Before pulling all tags, first discover what tags are available for an image.

```bash
# List available tags for an image on Docker Hub

podman search --list-tags docker.io/library/nginx

# Limit the output to a specific number of tags
podman search --list-tags --limit 20 docker.io/library/nginx

# List tags for an image on Quay.io
podman search --list-tags quay.io/prometheus/prometheus
```

## Using the --all-tags Flag

Podman provides the `--all-tags` flag to pull every tag of an image in a single command.

```bash
# Pull all tags of the alpine image
podman pull --all-tags docker.io/library/alpine

# Pull all tags of a smaller image (busybox)
podman pull --all-tags docker.io/library/busybox

# Pull all tags from a specific registry
podman pull --all-tags quay.io/coreos/etcd
```

Be cautious with this command on images that have many tags or large image sizes. Pulling all tags of a large image like `nginx` or `python` can consume significant disk space and bandwidth.

## Checking Disk Space Before Pulling

Always verify you have enough disk space before pulling all tags.

```bash
# Check available disk space
df -h /var/lib/containers/storage

# For rootless Podman, check user storage
df -h ~/.local/share/containers/storage

# Estimate the number of tags to get an idea of the scope
podman search --list-tags --format "{{.Tag}}" docker.io/library/alpine | wc -l
```

## Scripting Selective Tag Pulls

Often you want to pull a subset of tags rather than every single one. Here is a script to pull tags matching a pattern.

```bash
#!/bin/bash
# Pull tags matching a specific pattern

IMAGE="docker.io/library/python"
PATTERN="3.12"

echo "Fetching tags for ${IMAGE} matching '${PATTERN}'..."

# Get matching tags
TAGS=$(podman search --list-tags --limit 100 --format "{{.Tag}}" "$IMAGE" \
  | grep "$PATTERN")

if [ -z "$TAGS" ]; then
  echo "No tags found matching pattern '${PATTERN}'"
  exit 1
fi

echo "Found tags:"
echo "$TAGS"
echo ""

# Pull each matching tag
for TAG in $TAGS; do
  echo "Pulling ${IMAGE}:${TAG}..."
  podman pull "${IMAGE}:${TAG}"
  echo "---"
done

echo "Done. Pulled all matching tags."
```

## Pulling Tags with Version Filtering

A more advanced script that filters tags by a version pattern.

```bash
#!/bin/bash
# Pull all minor versions of a specific major version

IMAGE="docker.io/library/node"
MAJOR_VERSION="20"

echo "Pulling Node.js ${MAJOR_VERSION}.x major.minor tags..."

podman search --list-tags --limit 500 --format "{{.Tag}}" "$IMAGE" \
  | grep -E "^${MAJOR_VERSION}\.[0-9]+$" \
  | sort -V \
  | while read -r TAG; do
      echo "Pulling ${IMAGE}:${TAG}"
      podman pull "${IMAGE}:${TAG}"
    done

echo "All matching Node.js ${MAJOR_VERSION}.x major.minor tags pulled."
```

## Verifying Pulled Tags

After pulling all tags, verify what you have locally.

```bash
# List all local tags for a specific image
podman images --filter reference=alpine --format "{{.Repository}}:{{.Tag}}"

# Count how many tags were pulled
podman images --filter reference=alpine --format "{{.Tag}}" | wc -l

# Show total disk usage for all tags of an image
podman images --filter reference=alpine \
  --format "{{.Repository}}:{{.Tag}} {{.Size}}"
```

## Mirroring to a Local Registry

After pulling all tags, you can push them to a local registry for offline use.

```bash
#!/bin/bash
# Mirror all tags of an image to a local registry

SOURCE="docker.io/library/alpine"
DEST="myregistry.local:5000/library/alpine"

# Pull all tags
podman pull --all-tags "$SOURCE"

# Push each tag to the local registry
podman images --filter "reference=${SOURCE}" \
  --format "{{.Tag}}" | while read -r TAG; do
    echo "Pushing ${DEST}:${TAG}"
    podman tag "${SOURCE}:${TAG}" "${DEST}:${TAG}"
    podman push "${DEST}:${TAG}"
  done

echo "Mirror complete."
```

## Cleaning Up After Bulk Pulls

Remove all tags of an image when you no longer need them.

```bash
# Remove all local tags of alpine
podman images --filter reference=alpine \
  --format "{{.ID}}" | sort -u | xargs podman rmi -f

# Or remove specific tags
podman rmi alpine:3.17 alpine:3.18 alpine:3.19
```

## Summary

Podman's `--all-tags` flag makes it straightforward to pull every version of an image. For production use, consider scripting selective pulls based on version patterns to conserve disk space and bandwidth. This capability is particularly valuable for registry mirroring, compatibility testing, and maintaining local image caches in restricted environments.

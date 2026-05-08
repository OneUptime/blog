# How to List Local Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image

Description: Learn how to list and view container images stored locally using Podman, including various output formats and filtering options.

---

> Knowing what images are stored locally is the first step in managing your container image inventory effectively.

Managing container images starts with visibility. Podman provides several commands and options for listing local images, from simple overviews to detailed, formatted output. This guide covers everything you need to know about listing images stored on your local system with Podman.

---

## Basic Image Listing

The simplest way to list all local images.

```bash
# List all local images

podman images

# This is equivalent to
podman image list

# Sample output:
# REPOSITORY                TAG     IMAGE ID      CREATED       SIZE
# docker.io/library/nginx   1.25    a3ed95caeb02  2 days ago    188 MB
# docker.io/library/alpine  3.19    05455a08881e  1 week ago    7.38 MB
# docker.io/library/python  3.12    b5d58...      3 days ago    1.02 GB
```

## Showing All Images Including Intermediate Layers

By default, Podman hides intermediate image layers. Show them with the `-a` flag.

```bash
# Show all images including intermediate layers
podman images -a

# This reveals images created during multi-stage builds
# that are not tagged but still consume disk space
```

## Listing Images with Digests

Include the image digest for each image in the output.

```bash
# Show images with their SHA256 digests
podman images --digests

# Output includes the DIGEST column:
# REPOSITORY    TAG    DIGEST                    IMAGE ID     CREATED     SIZE
# nginx         1.25   sha256:6db391d1c0cf...    a3ed95ca     2 days ago  188 MB
```

## Showing Only Image IDs

When scripting, you often need just the image IDs.

```bash
# List only image IDs
podman images -q

# List all image IDs including intermediate layers
podman images -aq

# Use image IDs in a pipeline
podman images -q | wc -l
# Count of local images
```

## Listing Images Without Truncation

By default, image IDs are truncated. Show the full IDs.

```bash
# Show full image IDs without truncation
podman images --no-trunc

# Combine with quiet mode for full IDs only
podman images -q --no-trunc
```

## Filtering Images

Podman supports filtering the image list with the `--filter` flag.

```bash
# Show only dangling images (untagged)
podman images --filter dangling=true

# Show images created before a specific image
podman images --filter before=nginx:1.25

# Show images created after a specific image
podman images --filter since=alpine:3.19

# Show images matching a reference pattern
podman images --filter reference='*nginx*'

# Show images with a specific label
podman images --filter label=maintainer=nginx
```

## Sorting the Image List

Organize the image listing for better readability.

```bash
# Sort images by size
podman images --sort size

# Sort by creation date
podman images --sort created

# Sort by repository name
podman images --sort repository
```

## Custom Output Formatting

Use Go templates to customize the output format.

```bash
# Show only repository and tag
podman images --format "{{.Repository}}:{{.Tag}}"

# Show as a table with custom columns
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# JSON output for processing with jq
podman images --format json | jq '.[].names'

# Show image name, size, and creation date
podman images --format "{{.Repository}}:{{.Tag}} | {{.Size}} | {{.Created}}"
```

## Checking for a Specific Image

Verify whether a particular image exists locally.

```bash
# Check if nginx is available locally
podman images nginx
# Returns matching images or empty output

# Check for a specific tag
podman images nginx:1.25

# Use in a script to check image existence
if podman image exists nginx:1.25; then
  echo "Image nginx:1.25 is available locally"
else
  echo "Image nginx:1.25 not found, pulling..."
  podman pull nginx:1.25
fi
```

## Viewing Image Storage Information

Understand where and how images are stored.

```bash
# Show the image storage location
podman info --format '{{.Store.GraphRoot}}'

# Show total image storage usage
podman system df

# Show detailed image storage breakdown
podman system df -v
```

## Summary

Listing local images with Podman is flexible and powerful. Use basic `podman images` for quick checks, add `--filter` for targeted searches, and use `--format` for custom output. These commands form the foundation of image management and are essential for scripting, cleanup operations, and inventory tracking in container workflows.

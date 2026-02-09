# How to List All Docker Images on Your System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, CLI, DevOps, Docker Commands, Container Management

Description: A complete guide to listing, filtering, sorting, and inspecting Docker images on your local system using the Docker CLI.

---

Docker images accumulate on your system over time. Every pull, every build, and every failed experiment leaves images behind. Knowing how to list, filter, and inspect these images is essential for managing disk space and understanding what is running on your machines.

This guide covers every useful way to list Docker images, from the basic command to advanced filtering and formatting options that make the output actually useful.

## The Basic Command

The most straightforward way to list images is `docker images` or its equivalent `docker image ls`.

List all tagged images on your system:

```bash
# List all images (these two commands are identical)
docker images
docker image ls

# Sample output:
# REPOSITORY          TAG       IMAGE ID       CREATED        SIZE
# myapp               latest    a1b2c3d4e5f6   2 hours ago    245MB
# nginx               alpine    f1e2d3c4b5a6   3 days ago     42MB
# python              3.12      b6a5c4d3e2f1   5 days ago     1.01GB
# postgres            16        c3d4e5f6a1b2   2 weeks ago    432MB
```

The output shows the repository name, tag, image ID (shortened), creation date, and compressed size.

## Listing All Images Including Intermediate Layers

The default output hides intermediate images (layers created during builds). To see everything, use the `-a` flag.

Show all images including intermediate layers:

```bash
# Show all images, including intermediate build layers
docker images -a

# This reveals <none>:<none> entries that are intermediate layers
# REPOSITORY          TAG       IMAGE ID       CREATED        SIZE
# myapp               latest    a1b2c3d4e5f6   2 hours ago    245MB
# <none>              <none>    d4e5f6a1b2c3   2 hours ago    230MB
# <none>              <none>    e5f6a1b2c3d4   2 hours ago    180MB
# nginx               alpine    f1e2d3c4b5a6   3 days ago     42MB
```

The `<none>:<none>` entries are build layers that form the history of your tagged images. They are not usually useful to inspect directly but contribute to disk usage.

## Filtering Images

Docker provides a powerful `--filter` flag for narrowing down the image list.

### Filter by Dangling Status

Dangling images are images with no tag and no association with any tagged image. They typically result from rebuilding an image with the same tag.

List only dangling images:

```bash
# Show only dangling (untagged, unreferenced) images
docker images --filter "dangling=true"

# Show only non-dangling (properly tagged) images
docker images --filter "dangling=false"
```

### Filter by Repository Name

Narrow the list to images from a specific repository:

```bash
# List all images from the "nginx" repository
docker images nginx

# List all images from a specific registry
docker images myregistry.example.com/myapp

# List images matching a pattern (use wildcards with --filter)
docker images --filter "reference=my*"
```

### Filter by Creation Time

Find images created before or after a specific image:

```bash
# List images created before a specific image
docker images --filter "before=nginx:alpine"

# List images created after a specific image
docker images --filter "since=python:3.12"
```

### Filter by Label

If your images have labels, filter by them:

```bash
# List images with a specific label
docker images --filter "label=maintainer=team@example.com"

# List images with a label key (regardless of value)
docker images --filter "label=version"
```

## Custom Output Formatting

The default table format is fine for quick checks but not great for scripting. The `--format` flag uses Go templates to customize the output.

Common formatting examples:

```bash
# Show only image IDs (useful for piping to other commands)
docker images -q

# Custom format: repository, tag, and size
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# Table format with custom columns
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"

# JSON output for programmatic processing
docker images --format json

# Full image ID (not truncated)
docker images --no-trunc --format "{{.ID}}"
```

Available template fields include:

```
.Repository    - Image repository name
.Tag           - Image tag
.ID            - Image ID
.Digest        - Image digest
.CreatedSince  - Time since creation (e.g., "2 hours ago")
.CreatedAt     - Creation timestamp
.Size          - Image size
```

## Sorting Images

Docker does not have a built-in sort flag, but you can combine formatting with standard Unix tools.

Sort images by different criteria:

```bash
# Sort by size (largest first)
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -rh

# Sort by creation date (newest first) - default behavior
docker images --format "{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}" | sort -r

# Sort alphabetically by repository name
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | sort
```

## Checking Total Disk Usage

Get an overview of how much space Docker images consume.

Check disk usage for images:

```bash
# Show total disk usage breakdown
docker system df

# Sample output:
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          15        5         4.2GB     2.8GB (66%)
# Containers      3         2         120MB     40MB (33%)
# Local Volumes   8         3         1.5GB     800MB (53%)
# Build Cache     45        0         2.1GB     2.1GB (100%)

# Verbose output showing each image
docker system df -v
```

The "RECLAIMABLE" column shows how much space you could recover by removing unused images.

## Finding Large Images

Identify the biggest images consuming your disk space.

List images sorted by size:

```bash
# Find the top 10 largest images
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -rh | head -10

# Find images larger than 1GB
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | while read line; do
    size=$(echo "$line" | awk '{print $NF}')
    if echo "$size" | grep -q "GB"; then
        echo "$line"
    fi
done
```

## Listing Images in a Registry

To see images available in a remote registry (not on your local system), use different commands.

Search and list remote images:

```bash
# Search Docker Hub for images
docker search nginx

# List tags for an image on Docker Hub (requires curl or skopeo)
# Using the Docker Hub API
curl -s "https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=10" | \
    python3 -m json.tool

# Using skopeo (if installed)
skopeo list-tags docker://docker.io/library/nginx
```

## Listing Images Used by Running Containers

Find which images are actively in use:

```bash
# List images used by running containers
docker ps --format "{{.Image}}" | sort -u

# Show image details for all running containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Find images that are NOT used by any container
docker images --format "{{.Repository}}:{{.Tag}}" | while read img; do
    if ! docker ps -a --format "{{.Image}}" | grep -q "^${img}$"; then
        echo "UNUSED: $img"
    fi
done
```

## Scripting with Image Lists

The quiet flag (`-q`) and format flag make Docker image lists useful in scripts.

Common scripting patterns:

```bash
# Count total number of images
docker images -q | wc -l

# Get total size of all images (approximate, does not account for shared layers)
docker images --format "{{.Size}}" | paste -sd+ - | bc 2>/dev/null || \
    echo "Use 'docker system df' for accurate totals"

# Export the image list to a CSV file
docker images --format "{{.Repository}},{{.Tag}},{{.ID}},{{.CreatedAt}},{{.Size}}" > images.csv

# Check if a specific image exists locally
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^myapp:v2.0$"; then
    echo "Image myapp:v2.0 exists locally"
else
    echo "Image myapp:v2.0 not found"
fi
```

## Inspecting Image Details

For detailed information about a specific image, use `docker image inspect`.

Get detailed information about an image:

```bash
# Full JSON output for an image
docker image inspect nginx:alpine

# Extract specific fields
docker image inspect nginx:alpine --format "{{.Architecture}}"
docker image inspect nginx:alpine --format "{{.Os}}"
docker image inspect nginx:alpine --format "{{.Config.ExposedPorts}}"
docker image inspect nginx:alpine --format "{{.Config.Env}}"

# Show the image's labels
docker image inspect nginx:alpine --format "{{json .Config.Labels}}" | python3 -m json.tool

# Show the image's layer digests
docker image inspect nginx:alpine --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}"
```

## Using docker image ls vs docker images

Both commands are identical in functionality. `docker image ls` follows Docker's newer command structure (management commands), while `docker images` is the classic shorthand.

```bash
# These are equivalent
docker images
docker image ls
docker image list

# All flags work the same way
docker images -a --filter "dangling=true" --format "{{.ID}}"
docker image ls -a --filter "dangling=true" --format "{{.ID}}"
```

Use whichever form you prefer. The newer `docker image ls` style is recommended in scripts and documentation for clarity.

## Summary

Use `docker images` for a quick overview, add `--filter` to narrow results, and use `--format` for custom output. Check `docker system df` for disk usage summaries. Combine `-q` with other commands for scripting. Keep an eye on dangling images and large unused images to prevent disk space from growing out of control. For detailed inspection of individual images, `docker image inspect` gives you everything you need.

# How to Filter Images by Name with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image

Description: Learn how to filter and search local container images by name using Podman's reference filters, glob patterns, and formatting options.

---

> Filtering images by name helps you quickly find what you need in a local image store that may contain dozens or hundreds of images.

As your local image store grows, finding specific images becomes important. Podman provides several methods for filtering images by name, from simple reference matching to regular expressions and formatted output. This guide covers all the ways to narrow down your image list by name.

---

## Filtering by Repository Name

The simplest filter is passing the image name directly to `podman images`.

```bash
# Show only nginx images

podman images nginx

# Show only alpine images
podman images alpine

# Show images from a specific registry
podman images docker.io/library/python

# Show all images from a specific namespace
podman images docker.io/bitnami
```

## Using the Reference Filter

The `--filter reference=` option provides pattern-based filtering.

```bash
# Filter by exact image name
podman images --filter reference=nginx

# Filter with a regular expression pattern
podman images --filter reference='.*nginx.*'

# Filter by registry and name
podman images --filter reference='docker.io/library/nginx'

# Filter by name and tag pattern
podman images --filter reference='nginx:1\..*'

# Filter for all images from quay.io
podman images --filter reference='quay.io/.*'
```

## Regular Expression Pattern Matching

Use regular expression patterns for flexible name matching.

```bash
# Match images starting with "node"
podman images --filter reference='node.*'

# Match images containing "alpine" in the tag
podman images --filter reference=':.*alpine.*'

# Match all Python slim images
podman images --filter reference='python:.*slim.*'

# Match images from any registry with a specific name
podman images --filter reference='(^|/)nginx:'

# Match all UBI images from Red Hat
podman images --filter reference='registry.access.redhat.com/ubi.*'
```

## Combining Name Filters with Other Filters

Stack multiple filters to narrow results further.

```bash
# Find nginx images that are dangling (untagged)
podman images --filter reference='.*nginx.*' --filter dangling=true

# Find alpine images created before the last week
podman images --filter reference='alpine.*' --filter until=168h

# Find Python images with a specific label
podman images --filter reference='python.*' --filter label=maintainer
```

## Formatting Filtered Output

Combine name filtering with custom output formats.

```bash
# Show filtered images with only name and size
podman images --filter reference='nginx.*' \
  --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# Show filtered images as JSON
podman images --filter reference='alpine.*' --format json

# Show filtered image IDs only
podman images --filter reference='python.*' -q

# Table format with selected columns
podman images --filter reference='node.*' \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.Created}}"
```

## Scripting with Name Filters

Use name filters in shell scripts for automation.

```bash
#!/bin/bash
# Find and display all images matching a search term

SEARCH_TERM="${1:?Usage: $0 <search-term>}"

echo "Searching for images matching '${SEARCH_TERM}'..."

RESULTS=$(podman images --filter "reference=.*${SEARCH_TERM}.*" \
  --format "{{.Repository}}:{{.Tag}}")

if [ -z "$RESULTS" ]; then
  echo "No images found matching '${SEARCH_TERM}'"
  exit 0
fi

COUNT=$(echo "$RESULTS" | wc -l)
echo "Found ${COUNT} matching image(s):"
echo "$RESULTS"
```

## Finding Images Across Registries

When you have the same image pulled from different registries, filter to compare them.

```bash
# See all nginx images regardless of registry
podman images --filter reference='(^|/)nginx:'

# Compare sizes of nginx from different sources
podman images --filter reference='.*nginx.*' \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Find duplicate images from different registries
podman images --format "{{.Repository}}:{{.Tag}} {{.ID}}" \
  | sort -k2 | uniq -D -f1
```

## Filtering with Regular Expressions

For more advanced pattern matching, pipe output through grep.

```bash
# Find images with semantic version tags
podman images --format "{{.Repository}}:{{.Tag}}" | grep -E ':[0-9]+\.[0-9]+\.[0-9]+'

# Find all images with "latest" tag
podman images --format "{{.Repository}}:{{.Tag}}" | grep ':latest'

# Find images from a specific organization
podman images --format "{{.Repository}}:{{.Tag}}" | grep 'bitnami/'

# Case-insensitive search
podman images --format "{{.Repository}}:{{.Tag}}" | grep -i 'postgres'
```

## Checking Image Existence by Name

Quickly check if an image with a specific name exists locally.

```bash
# Check if a specific image exists
if podman image exists nginx:1.25; then
  echo "nginx:1.25 is available"
else
  echo "nginx:1.25 is not available"
fi

# Check and get details in one step
podman images --filter reference=nginx:1.25 --format "{{.ID}} {{.Size}}" \
  | read -r ID SIZE && echo "Found: ID=${ID}, Size=${SIZE}" \
  || echo "Image not found"
```

## Summary

Podman provides flexible options for filtering images by name, from simple repository matching to regular expression patterns and reference filters. Combine these with custom formatting and other filters to build precise queries for your local image store. These techniques are essential for managing large image collections and scripting image management tasks.

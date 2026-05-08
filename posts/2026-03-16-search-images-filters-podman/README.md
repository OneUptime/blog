# How to Search for Images with Filters in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry

Description: Learn how to use Podman's search filters to find container images by stars, official status, and automated build status in registries.

---

> Search filters transform Podman's image search from a broad discovery tool into a precise way to find exactly the image you need.

Podman's search command supports multiple filters that let you narrow results by popularity, official status, and whether images are automated builds. Combining these filters helps you quickly identify trusted, well-maintained images for your container workloads. This guide covers all available search filters and how to use them effectively.

---

## Available Search Filters

Podman supports three main search filters.

```bash
# Filter by official image status

podman search nginx --filter is-official=true

# Filter by minimum star count
podman search nginx --filter stars=100

# Filter by automated build status
podman search nginx --filter is-automated=true

# Combine multiple filters
podman search nginx --filter is-official=true --filter stars=50
```

## Filtering by Star Count

Stars indicate community popularity and trust.

```bash
# Find images with at least 100 stars
podman search nginx --filter stars=100

# Find highly popular images (1000+ stars)
podman search database --filter stars=1000

# Find images with at least 50 stars
podman search python --filter stars=50

# Combine with limit for a compact list
podman search redis --filter stars=100 --limit 10
```

## Filtering for Official Images

Official images are registry-designated trusted images. On Docker Hub, Docker Official Images are curated by Docker, often in collaboration with upstream maintainers.

```bash
# Search only official images
podman search postgres --filter is-official=true

# Official web servers
podman search web --filter is-official=true

# Official programming language runtimes
podman search golang --filter is-official=true

# Official operating system base images
podman search ubuntu --filter is-official=true
```

## Filtering for Automated Builds

Automated builds are images built automatically from source repositories.

```bash
# Search for automated builds
podman search nginx --filter is-automated=true

# Automated builds with minimum stars
podman search python --filter is-automated=true --filter stars=50
```

## Combining Multiple Filters

Stack filters to create precise search queries.

```bash
# Official images with high popularity
podman search database --filter is-official=true --filter stars=500

# Popular automated builds
podman search monitoring --filter is-automated=true --filter stars=100

# Official images with formatted output
podman search web --filter is-official=true \
  --format "table {{.Name}}\t{{.Stars}}\t{{.Description}}"
```

## Filtering with Custom Output

Format filtered results for different use cases.

```bash
# Show filtered results with stars and description
podman search nginx --filter stars=50 \
  --format "table {{.Name}}\t{{.Stars}}\t{{.Description}}"

# JSON output of filtered results
podman search postgres --filter is-official=true \
  --format json | python3 -m json.tool

# Show only image names from filtered search
podman search python --filter stars=100 \
  --format "{{.Name}}"

# Compact list of popular official images
podman search node --filter is-official=true \
  --format "{{.Name}} - Stars: {{.Stars}}"
```

## Practical Filter Recipes

Common filtering patterns for real-world image selection.

```bash
# Find the most popular database images
echo "=== Popular Database Images ==="
podman search database --filter stars=500 --limit 10 \
  --format "table {{.Name}}\t{{.Stars}}\t{{.Official}}"

# Find official images for a CI/CD pipeline
echo "=== CI/CD Base Images ==="
for TERM in golang node python ruby; do
  echo "--- ${TERM} ---"
  podman search "$TERM" --filter is-official=true --limit 1 \
    --format "  {{.Name}} (Stars: {{.Stars}})"
done

# Find monitoring tool images
echo "=== Monitoring Tools ==="
podman search monitoring --filter stars=50 --limit 10 \
  --format "table {{.Name}}\t{{.Stars}}"
```

## Searching with Filters Across Registries

Apply filters when searching specific registries.

```bash
# Filter on Docker Hub
podman search docker.io/nginx --filter stars=100

# Search Quay.io with a limit
podman search quay.io/prometheus --limit 20

# Note: Some filters like stars and is-official are
# Docker Hub specific. Other registries may not support
# all filter options.
```

## Building an Image Selection Script

Automate image selection using search filters.

```bash
#!/bin/bash
# Find the best image for a given purpose

PURPOSE="${1:?Usage: $0 <search-term>}"
MIN_STARS="${2:-100}"

echo "Searching for '${PURPOSE}' images (min ${MIN_STARS} stars)..."
echo ""

# Try official images first
echo "=== Official Images ==="
OFFICIAL=$(podman search "$PURPOSE" --filter is-official=true \
  --format "{{.Name}}\t{{.Stars}}" 2>/dev/null)

if [ -n "$OFFICIAL" ]; then
  echo "$OFFICIAL"
else
  echo "  No official images found."
fi

echo ""

# Show popular community images
echo "=== Popular Community Images ==="
podman search "$PURPOSE" --filter is-official=false --filter stars="$MIN_STARS" --limit 10 \
  --format "table {{.Name}}\t{{.Stars}}\t{{.Official}}"

echo ""
echo "Tip: Use 'podman search --list-tags <image>' to see available versions."
```

## Understanding Filter Limitations

Be aware of what filters can and cannot do.

```bash
# Filters work on metadata provided by the registry
# Not all registries support all filters

# Docker Hub supports: is-official, stars, is-automated
# Quay.io: limited filter support
# Private registries: filter support varies

# For more advanced filtering, use the registry's web API
# Example: Docker Hub API
curl -s "https://hub.docker.com/v2/search/repositories/?query=nginx&page_size=5" \
  | python3 -m json.tool
```

## Summary

Search filters in Podman help you find trusted, popular, and well-maintained container images quickly. Use `is-official=true` to find authoritative images, `stars` to gauge community trust, and combine filters with custom formatting for precise results. While filter support varies by registry, these tools are invaluable for making informed image selection decisions directly from the command line.

# How to Search for Images in a Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry

Description: Learn how to search for container images in registries using Podman, including searching Docker Hub, Quay.io, and other OCI registries.

---

> Searching registries directly from the command line saves time and integrates image discovery into your container workflow.

Before you can pull a container image, you need to find it. Podman's `search` command lets you query container registries to discover available images, check their details, and find the right image for your needs. This guide covers searching across different registries with various options.

---

## Basic Image Search

Search for images by keyword across your configured registries.

```bash
# Search for nginx images

podman search nginx

# Search for PostgreSQL images
podman search postgresql

# Search for Python images
podman search python

# The default output shows:
# NAME                       DESCRIPTION
# docker.io/library/nginx    Official build of Nginx
# docker.io/bitnami/nginx    Bitnami container for Nginx
```

## Searching a Specific Registry

Target your search to a particular registry.

```bash
# Search Docker Hub specifically
podman search docker.io/nginx

# Search Quay.io
podman search quay.io/nginx

# Search Red Hat Registry
podman search registry.access.redhat.com/ubi

# Search Fedora Registry
podman search registry.fedoraproject.org/fedora
```

Registry search support varies by registry, so some registries may not return search results even when images are available.

## Controlling Search Results

Limit and adjust the number of results returned.

```bash
# Limit results to 5 images
podman search nginx --limit 5

# Show more results than the default
podman search nginx --limit 100
```

## Searching for Official Images

Find only official images on Docker Hub.

```bash
# Search for official images only
podman search docker.io/nginx --filter=is-official=true

# Search for official database images
podman search docker.io/database --filter=is-official=true

# Combine with limit
podman search docker.io/python --filter=is-official=true --limit 10
```

## Listing Available Tags

After finding an image, list its available tags.

```bash
# List tags for a specific image
podman search --list-tags docker.io/library/nginx

# Limit the number of tags shown
podman search --list-tags --limit 20 docker.io/library/nginx

# List tags for a Quay.io image
podman search --list-tags quay.io/prometheus/prometheus

# List tags for a community image
podman search --list-tags docker.io/bitnami/postgresql
```

## Formatting Search Output

Customize how search results are displayed.

```bash
# Default table output
podman search nginx

# JSON output for programmatic processing
podman search nginx --format json | python3 -m json.tool

# Custom format showing name and stars
podman search docker.io/nginx --format "{{.Name}} (Stars: {{.Stars}})"

# Table format with selected columns
podman search docker.io/nginx \
  --format "table {{.Name}}\t{{.Stars}}\t{{.Official}}"
```

## Searching with Authentication

Some registries require authentication to search.

```bash
# Login to a private registry before searching
podman login registry.example.com

# Search the authenticated registry
podman search registry.example.com/myapp

# Login to Red Hat registry
podman login registry.redhat.io

# Search Red Hat certified images
podman search registry.redhat.io/rhel
```

## Practical Search Workflows

Common search patterns for finding the right image.

```bash
# Find the right base image for a web application
echo "=== Web Server Images ==="
podman search docker.io/nginx --filter=is-official=true --limit 3
echo ""
echo "=== Application Runtime Images ==="
podman search docker.io/node --filter=is-official=true --limit 3
echo ""
echo "=== Database Images ==="
podman search docker.io/postgres --filter=is-official=true --limit 3

# Find available tags for your chosen image
podman search --list-tags docker.io/library/node --limit 30
```

## Searching Across Multiple Registries

Compare images available across different registries.

```bash
#!/bin/bash
# Search for an image across multiple registries

SEARCH_TERM="${1:?Usage: $0 <search-term>}"

REGISTRIES=("docker.io" "quay.io" "registry.fedoraproject.org")

for REG in "${REGISTRIES[@]}"; do
  echo "=== ${REG} ==="
  podman search "${REG}/${SEARCH_TERM}" --limit 5 \
    --format "table {{.Name}}\t{{.Stars}}\t{{.Official}}" 2>/dev/null
  echo ""
done
```

## Summary

Podman's search command is a powerful tool for discovering container images directly from the command line. Use registry-specific searches for precision, filters for narrowing results, and `--list-tags` for finding available versions. Integrating image search into your workflow helps you make informed decisions about which images to use without leaving the terminal.

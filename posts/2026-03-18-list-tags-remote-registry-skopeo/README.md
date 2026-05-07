# How to List Tags in a Remote Registry with Skopeo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Registry, Tag

Description: Learn how to use Skopeo to list all available tags for container images in remote registries without pulling any images.

---

> Skopeo list-tags gives you a quick inventory of all available image versions in any Docker-compatible registry straight from the command line.

When working with container registries, knowing which tags are available for an image is essential for choosing the right version, auditing deployments, and automating updates. Skopeo provides a simple `list-tags` command that queries a remote registry and returns all available tags without downloading anything. This guide covers how to use it effectively with both public and private registries.

---

## Installing Skopeo

Ensure Skopeo is installed on your system.

```bash
# Install on Fedora/RHEL

sudo dnf install -y skopeo

# Install on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y skopeo

# Install on macOS
brew install skopeo

# Verify installation
skopeo --version
```

## Listing Tags for Public Images

The `skopeo list-tags` command returns a JSON object containing all tags for a given image.

```bash
# List all tags for the official nginx image on Docker Hub
skopeo list-tags docker://docker.io/library/nginx

# List tags for an image on Quay.io
skopeo list-tags docker://quay.io/prometheus/prometheus

# List tags for an image on GitHub Container Registry
skopeo list-tags docker://ghcr.io/actions/actions-runner
```

The output is JSON with a `Tags` array containing every available tag.

## Filtering Tags with jq

Since the output is JSON, you can use `jq` to filter and format the results.

```bash
# Get just the tag names as a plain list
skopeo list-tags docker://docker.io/library/python | \
  jq -r '.Tags[]'

# Count total number of available tags
skopeo list-tags docker://docker.io/library/python | \
  jq '.Tags | length'

# Filter tags matching a version pattern (e.g., 3.12.x)
skopeo list-tags docker://docker.io/library/python | \
  jq -r '.Tags[] | select(startswith("3.12"))'

# Find only tags with "alpine" in the name
skopeo list-tags docker://docker.io/library/node | \
  jq -r '.Tags[] | select(contains("alpine"))'

# Get semantic version-like tags (exclude sha and special tags)
skopeo list-tags docker://docker.io/library/redis | \
  jq -r '.Tags[] | select(test("^[0-9]+\\.[0-9]+"))'
```

## Listing Tags for Private Registries

For private registries, authenticate using Podman first or pass credentials directly.

```bash
# Log in to the private registry via Podman
podman login registry.example.com

# List tags using the shared auth file
skopeo list-tags docker://registry.example.com/myorg/myapp

# Pass credentials directly on the command line
skopeo list-tags \
  --creds "myuser:mypassword" \
  docker://registry.example.com/myorg/myapp

# Use a specific auth file
skopeo list-tags \
  --authfile /path/to/auth.json \
  docker://registry.example.com/myorg/myapp
```

## Listing Tags on Insecure Registries

Development registries often lack valid TLS certificates.

```bash
# List tags on an HTTP-only registry
skopeo list-tags \
  --tls-verify=false \
  docker://localhost:5000/myapp

# List tags with a custom certificate directory
skopeo list-tags \
  --cert-dir=/etc/containers/certs.d/myregistry.local \
  docker://myregistry.local/myapp
```

## Scripting Tag Comparisons Across Registries

You can compare available tags between two registries to find missing images.

```bash
#!/bin/bash
# compare-tags.sh - Find tags in source that are missing from destination

IMAGE="myapp"
SOURCE="docker://source-registry.example.com/${IMAGE}"
DEST="docker://dest-registry.example.com/${IMAGE}"

# Get tags from both registries
SOURCE_TAGS=$(skopeo list-tags "$SOURCE" | jq -r '.Tags[]' | sort)
DEST_TAGS=$(skopeo list-tags "$DEST" | jq -r '.Tags[]' | sort)

# Find tags that exist in source but not in destination
MISSING=$(comm -23 <(echo "$SOURCE_TAGS") <(echo "$DEST_TAGS"))

if [ -z "$MISSING" ]; then
  echo "All tags are synchronized."
else
  echo "Missing tags in destination registry:"
  echo "$MISSING"
fi
```

## Monitoring for New Tags

Set up a script to detect when new tags appear for an image you depend on.

```bash
#!/bin/bash
# watch-tags.sh - Detect new tags for a monitored image

IMAGE="docker://docker.io/library/nginx"
CACHE_FILE="/tmp/nginx-tags-cache.txt"

# Get current tags
CURRENT_TAGS=$(skopeo list-tags "$IMAGE" | jq -r '.Tags[]' | sort)

# Compare with cached tags if cache exists
if [ -f "$CACHE_FILE" ]; then
  NEW_TAGS=$(comm -13 "$CACHE_FILE" <(echo "$CURRENT_TAGS"))
  if [ -n "$NEW_TAGS" ]; then
    echo "New tags detected for nginx:"
    echo "$NEW_TAGS"
  else
    echo "No new tags since last check."
  fi
fi

# Update the cache
echo "$CURRENT_TAGS" > "$CACHE_FILE"
```

```bash
# Run the watch script periodically via cron
# 0 8 * * * /usr/local/bin/watch-tags.sh
```

## Summary

Skopeo list-tags provides a simple and efficient way to query available tags from any Docker-compatible registry. Combined with `jq`, it becomes a powerful tool for filtering specific versions, comparing registries, and monitoring for new releases. It integrates with Podman authentication, supports insecure registries, and produces clean JSON output that fits naturally into scripts and CI/CD pipelines. Use it to keep track of what is available before pulling or deploying container images.

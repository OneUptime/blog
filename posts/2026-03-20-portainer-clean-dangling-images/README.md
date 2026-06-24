# How to Clean Up Dangling Images in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Cleanup, DevOps

Description: Learn how to identify and remove dangling Docker images in Portainer to recover disk space consumed by intermediate build layers and replaced image versions.

## Introduction

Dangling images are untagged Docker images that commonly appear as `<none>:<none>` after a tag is moved to a newer image version. These images consume disk space silently, and Docker removes them with `docker image prune`. Docker build cache can also consume disk space, but it is managed separately from dangling images. Portainer and Docker CLI both provide ways to clean up dangling images.

## Prerequisites

- Portainer installed with a connected Docker environment

## What Are Dangling Images?

```bash
# Dangling images appear as <none>:<none> in docker images:

docker images

REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
myapp         latest    abc123         1 day ago      385MB
<none>        <none>    def456         2 days ago     380MB  ← DANGLING
<none>        <none>    ghi789         3 days ago     375MB  ← DANGLING
nginx         alpine    jkl012         2 weeks ago    42MB
```

### When Dangling Images Are Created

1. **Image rebuild**: Building `myapp:latest` multiple times creates a new `abc123` image and the old image can become dangling (`<none>`).

2. **Re-tagging**: Moving a tag to a new image can leave the old image untagged.
   ```bash
   docker pull myapp:v2.0.0
   docker tag myapp:v2.0.0 myapp:latest  # Old "latest" image becomes untagged
   ```

3. **Repeated CI/CD rebuilds**: Rebuilding the same mutable tag on a host over time can leave older local image IDs untagged.

Modern multi-stage and failed builds more often leave build cache, which Docker manages separately from dangling images.

## Step 1: List Dangling Images

```bash
# List only dangling images:
docker images --filter "dangling=true"

REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
<none>       <none>    def456         2 days ago     380MB
<none>       <none>    ghi789         3 days ago     375MB

# Count dangling images:
docker images --filter "dangling=true" -q | wc -l

# Review image disk usage before pruning:
docker system df -v
```

## Step 2: Remove Dangling Images via Portainer

1. Navigate to **Images** in Portainer.
2. Review the image list for entries showing `<none>:<none>`.
3. Select the dangling images.
4. Click **Remove**.

Or use the **Prune** function if your Portainer version exposes it:
1. Navigate to **Images**.
2. Click **Prune**.
3. Choose the dangling-images-only option rather than removing all unused images.

## Step 3: Remove Dangling Images via CLI

```bash
# Remove only dangling images:
docker image prune

# With confirmation bypass:
docker image prune --force

# Equivalent explicit removal:
docker rmi $(docker images --filter "dangling=true" -q)

# If the above fails (some in use):
docker rmi $(docker images --filter "dangling=true" -q) 2>/dev/null || true
```

## Step 4: Automate Dangling Image Cleanup

Add to a nightly cron or daily scheduled task:

```bash
#!/bin/bash
# cleanup-dangling.sh
# Remove dangling images and log the results

LOG_FILE="/var/log/docker-prune.log"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)

# Count before cleanup
DANGLING_BEFORE=$(docker images --filter "dangling=true" -q | wc -l)

if [ "${DANGLING_BEFORE}" -eq 0 ]; then
    echo "${TIMESTAMP}: No dangling images found." >> "${LOG_FILE}"
    exit 0
fi

echo "${TIMESTAMP}: Found ${DANGLING_BEFORE} dangling images. Cleaning up..." >> "${LOG_FILE}"

# Remove dangling images
OUTPUT=$(docker image prune --force 2>&1)
echo "${TIMESTAMP}: ${OUTPUT}" >> "${LOG_FILE}"

# Count after
DANGLING_AFTER=$(docker images --filter "dangling=true" -q | wc -l)
echo "${TIMESTAMP}: Dangling images after cleanup: ${DANGLING_AFTER}" >> "${LOG_FILE}"

echo "${TIMESTAMP}: Cleanup complete." >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"
```

```bash
# Add to crontab: daily cleanup at 3:15 AM
# 15 3 * * * /opt/scripts/cleanup-dangling.sh
```

## Step 5: Reduce Image and Build Cache Accumulation

### Use BuildKit for Multi-Stage Builds

```dockerfile
# syntax=docker/dockerfile:1
# BuildKit supports cache mounts, and Docker manages build cache separately from image cleanup
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -o myapp .

FROM alpine:3.19
COPY --from=builder /build/myapp /myapp
ENTRYPOINT ["/myapp"]
```

### Prune Build Cache Separately When Needed

```bash
# Remove build cache when disk usage is coming from builds rather than dangling images:
docker builder prune -f
```

This removes build cache. It does not remove existing dangling images.

### Clean Up After CI/CD Builds

In your CI/CD pipeline, clean up after build:

```yaml
# .github/workflows/build.yml
- name: Build image
  run: docker build -t your-namespace/myapp:${{ github.sha }} .

- name: Push image
  run: docker push your-namespace/myapp:${{ github.sha }}

- name: Clean up local images
  if: always()
  run: docker image prune -f
```

## Step 6: Distinguish Dangling vs. Unused Images

```bash
# Dangling images: untagged images left behind when a tag moves to a newer build
docker images --filter "dangling=true"

# Unused images: Docker doesn't provide a direct "unused only" listing filter.
# docker image prune -a removes all images not used by any container.

# All unused images (dangling + tagged but unreferenced):
docker image prune -a  # Removes EVERYTHING not used by a container
# WARNING: This also removes base images you might want to keep cached
```

Be careful with `docker image prune -a` - it removes all images not used by any container, including base images you use frequently. Dangling-only pruning is safer.

## Step 7: Monitor Disk Usage

Track image disk usage over time:

```bash
# Check Docker disk usage:
docker system df -v

# Verbose output showing all images:
docker system df -v | grep -A 50 "Images space usage"

# Output example:
Images space usage:
REPOSITORY    TAG       IMAGE ID       CREATED        SIZE      SHARED SIZE   UNIQUE SIZE   CONTAINERS
myapp         latest    abc123         1 day ago      385MB     0B            385MB         1
<none>        <none>    def456         2 days ago     380MB     368MB         12MB          0  ← Dangling
nginx         alpine    ghi789         2 weeks ago    42MB      0B            42MB          2
```

The UNIQUE SIZE column shows how much disk space each image actually uses (vs. shared layers).

## Conclusion

Dangling images are a normal byproduct of active Docker image building. Regular cleanup via `docker image prune` or Portainer's image-management features keeps your environment clean. For production hosts with frequent builds, automate cleanup in cron jobs and integrate cleanup into your CI/CD pipelines. Monitor disk usage with `docker system df` to catch accumulation before it causes issues, and remember that Docker build cache is cleaned separately from dangling images.

# How to Use docker builder prune to Clean Build Cache

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Build Cache, Cleanup, BuildKit, Disk Space, CI/CD, DevOps

Description: Manage Docker build cache efficiently with docker builder prune to reclaim disk space and keep builds fast.

---

Docker build cache is a double-edged sword. It speeds up repeated builds dramatically by reusing unchanged layers, but it grows silently until it consumes gigabytes of disk space. The `docker builder prune` command gives you precise control over this cache, letting you reclaim space without sacrificing build performance.

## Understanding the Build Cache

When Docker builds an image, it caches each instruction's result as a separate layer. The next time you build the same Dockerfile, Docker checks whether each layer can be reused. If the instruction and its inputs have not changed, Docker skips the build step and uses the cached version.

BuildKit (Docker's modern build engine) maintains a more sophisticated cache that includes:

- **Regular build cache** - Cached layers from Dockerfile instructions
- **Source cache** - Cached context files sent to the build daemon
- **Inline cache** - Cache metadata embedded in pushed images
- **External cache** - Cache stored in registries or other backends

```bash
# Check how much space the build cache is using
docker system df

# Detailed view showing build cache size
docker system df -v | grep -A 5 "Build cache"
```

On an active development machine, the build cache can easily reach 10-20GB or more.

## Basic Build Cache Cleanup

The simplest form removes unused build cache entries.

```bash
# Remove unused build cache
docker builder prune

# Output:
# WARNING! This will remove all dangling build cache.
# Are you sure you want to continue? [y/N] y
# Deleted build cache objects:
#   abc123...
#   def456...
# Total reclaimed space: 3.2GB
```

"Unused" means cache entries that are not referenced by any existing image. This is safe for most situations because the cache will be rebuilt on the next build.

## Aggressive Cache Cleanup

The `-a` flag removes all build cache, including entries that are still referenced.

```bash
# Remove ALL build cache (including in-use entries)
docker builder prune -a

# Skip the confirmation prompt
docker builder prune -a -f
```

After running this, your next build will start from scratch with no cache hits. This takes longer but guarantees you reclaim all build cache space.

## Keeping a Cache Budget

The `--keep-storage` flag lets you keep a certain amount of cache while removing the oldest entries. This is the most practical option for balancing build speed and disk usage.

```bash
# Keep 5GB of cache, remove the rest
docker builder prune --keep-storage 5g

# Keep 2GB of cache, remove old entries, skip confirmation
docker builder prune --keep-storage 2g -f

# Keep 500MB for a tight disk budget
docker builder prune --keep-storage 500m -f
```

Docker removes the least recently used cache entries first, so your most commonly used layers stay cached.

## Filtering by Age

Use the `--filter` flag to remove cache entries older than a specified time.

```bash
# Remove cache entries older than 24 hours
docker builder prune --filter "until=24h"

# Remove cache older than 7 days
docker builder prune --filter "until=168h"

# Remove cache older than 30 days
docker builder prune --filter "until=720h"

# Combine with keep-storage for precise control
docker builder prune --keep-storage 3g --filter "until=48h" -f
```

This is useful for CI/CD environments where build cache from old branches is no longer relevant.

## Build Cache in CI/CD Pipelines

CI/CD servers are the biggest build cache hogs. Every branch, every commit generates new cache entries. Without cleanup, disk space disappears fast.

### Post-Build Cleanup

Add a cleanup step after each build to keep the cache in check.

```bash
# CI pipeline step: clean up old cache after building
docker build -t my-app:$CI_COMMIT_SHA .
docker push my-app:$CI_COMMIT_SHA

# Keep only 10GB of cache, remove anything older than 2 days
docker builder prune --keep-storage 10g --filter "until=48h" -f
```

### Nightly Cleanup

Run a more aggressive cleanup as a scheduled job.

```bash
#!/bin/bash
# nightly-cache-cleanup.sh - Run as a cron job
echo "$(date) Starting nightly Docker build cache cleanup"

# Keep 5GB of cache for fast morning builds
docker builder prune --keep-storage 5g -f

# Log the results
docker system df
echo "$(date) Cleanup complete"
```

```bash
# Crontab entry: run at 2 AM every day
0 2 * * * /opt/scripts/nightly-cache-cleanup.sh >> /var/log/docker-cache-cleanup.log 2>&1
```

### GitHub Actions Example

```yaml
# .github/workflows/build.yml - with cache management
name: Build and Push

on: push

jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t my-app:${{ github.sha }} .

      - name: Push image
        run: docker push my-app:${{ github.sha }}

      - name: Cleanup build cache
        if: always()
        run: docker builder prune --keep-storage 5g -f
```

## BuildKit Cache Mount Cleanup

BuildKit supports cache mounts (`--mount=type=cache`) that persist package manager caches between builds. These are stored separately from regular build cache.

```dockerfile
# Dockerfile using BuildKit cache mounts
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

# Cache mount for npm - persists between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --production

COPY . .
CMD ["node", "server.js"]
```

These cache mounts are included in the `docker builder prune` cleanup. If you want to keep them while removing other cache:

```bash
# Check what cache entries exist
docker buildx du

# Detailed cache usage breakdown
docker buildx du --verbose
```

## Inspecting the Build Cache

Before pruning, inspect what is in the cache to make informed decisions.

```bash
# Show build cache usage with details
docker buildx du

# Sample output:
# ID                    RECLAIMABLE   SIZE        LAST ACCESSED
# abc123                true          1.2GB       3 days ago
# def456                true          800MB       1 week ago
# ghi789                false         500MB       2 hours ago
```

The `RECLAIMABLE` column indicates whether an entry can be safely removed. Entries marked `false` are still referenced by existing images.

```bash
# Show only reclaimable cache
docker buildx du --filter type=regular

# Show cache usage sorted by size (useful for finding big entries)
docker buildx du --verbose | sort -k2 -h
```

## Multi-Platform Build Cache

When building for multiple architectures, the cache grows faster because each platform has its own set of layers.

```bash
# Build for two platforms - creates double the cache
docker buildx build --platform linux/amd64,linux/arm64 -t my-app:latest .

# Clean up platform-specific cache
docker builder prune --keep-storage 10g -f
```

For multi-platform builds, you might want a larger cache budget since each platform adds its own layers.

## Remote Cache vs Local Cache

BuildKit supports remote cache backends that store cache in a registry. This reduces local cache pressure while keeping builds fast.

```bash
# Build with cache stored in the registry
docker buildx build \
  --cache-to type=registry,ref=myregistry/my-app:buildcache \
  --cache-from type=registry,ref=myregistry/my-app:buildcache \
  -t my-app:latest .
```

With remote cache, you can be more aggressive with local cache cleanup because the important layers are preserved in the registry.

```bash
# Aggressive local cleanup when using remote cache
docker builder prune -a -f
```

## Monitoring Build Cache Growth

Track cache growth over time to set appropriate cleanup policies.

```bash
#!/bin/bash
# cache-monitor.sh - Track build cache size over time

CACHE_SIZE=$(docker system df --format '{{.Size}}' | tail -1)
TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
echo "$TIMESTAMP,$CACHE_SIZE" >> /var/log/docker-cache-growth.csv

# Alert if cache exceeds threshold
SIZE_BYTES=$(docker system df --format '{{.RawSize}}' | tail -1)
THRESHOLD=21474836480  # 20GB
if [ "$SIZE_BYTES" -gt "$THRESHOLD" ] 2>/dev/null; then
  echo "WARNING: Docker build cache is ${CACHE_SIZE} - exceeds 20GB threshold"
fi
```

## Best Practices

**Set a cache budget, not a schedule.** Instead of wiping cache on a fixed schedule, use `--keep-storage` to maintain a cap. This keeps recent builds fast while preventing unbounded growth.

**Use `--filter until` for CI servers.** Cache from feature branches merged a week ago is unlikely to be useful. Age-based filtering cleans up stale entries while preserving fresh ones.

**Monitor before you prune.** Run `docker buildx du` before pruning to understand what is consuming space. You might find that a single large base image is responsible for most of the cache.

**Consider remote cache for teams.** If multiple developers or CI runners build the same project, remote cache avoids duplicate local caches and speeds up cold builds.

```bash
# Quick reference: common prune commands

# Safe cleanup (unused entries only)
docker builder prune -f

# Budget-based cleanup (keep 5GB)
docker builder prune --keep-storage 5g -f

# Age-based cleanup (remove old entries)
docker builder prune --filter "until=168h" -f

# Full cleanup (everything goes)
docker builder prune -a -f
```

Build cache management is a maintenance task that pays for itself. A few lines in your CI pipeline or a simple cron job keeps disk space under control while preserving the cache entries that actually speed up your builds. Set a budget, automate the cleanup, and forget about it.

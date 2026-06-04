# Validation Summary: How to Use docker builder prune to Clean Build Cache

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker BuildKit
- Docker Buildx
- Dockerfile cache mounts
- GitHub Actions
- Shell scripting

## Sources Consulted
- Docker CLI reference: docker builder prune - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker CLI reference: docker buildx prune - https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker CLI reference: docker buildx du - https://docs.docker.com/reference/cli/docker/buildx/du/
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Build cache garbage collection - https://docs.docker.com/build/cache/garbage-collection/
- Docker cache storage backends - https://docs.docker.com/build/cache/backends/
- Dockerfile reference: RUN --mount=type=cache - https://docs.docker.com/reference/dockerfile/
- Docker Build guide: cache mounts - https://docs.docker.com/build/guide/mounts/
- Local Docker CLI help output for `docker builder prune`, `docker buildx prune`, `docker buildx du`, and `docker system df`

## Issues Found
- The post described `docker builder prune -a` as removing all build cache, including referenced or in-use entries. Docker documents `--all` as removing all unused build cache, not actively in-use records, so the wording and examples were corrected.
- The post said the default prune removes "unused" cache entries and defined unused as not referenced by images. The command warning refers to dangling build cache, so the explanation was changed to dangling cache records no longer needed by the builder.
- The post claimed a full cleanup guarantees no cache hits on the next build. Because `--all` still targets unused build cache and may not remove actively used records, this was softened to say affected builds may have fewer cache hits.
- The cache-mount section implied `docker buildx du` was a way to keep cache mounts while removing other cache. I added the official Buildx filter form `docker buildx prune --filter "type!=exec.cachemount" -f`.
- The `RECLAIMABLE=false` explanation incorrectly tied the state to existing images. Docker Buildx documents this as records actively in use by the builder, so the wording was corrected.
- The `docker buildx du --filter type=regular` example was labeled as showing reclaimable cache. That filter selects regular cache records, not reclaimable records, so it was changed to `--filter "inuse=false"`.
- The monitoring script used the unsupported `{{.RawSize}}` template field for `docker system df`. It was replaced with a documented formatted `Build Cache` size lookup and a shell/awk conversion for the threshold check.
- The Dockerfile example used `npm ci --production`. It was updated to the current npm spelling, `npm ci --omit=dev`.

## Review Notes
The article is technically relevant and useful after correction. Docker `builder prune` and `buildx prune` behavior can differ by Docker CLI/buildx integration, so future updates should keep examples aligned with the current Docker CLI reference.

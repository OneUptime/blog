# Validation Summary: How to View Image Details and Layers in Portainer - View

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (web-based Docker management UI)
- Docker CLI (image management: pull, build, save/load, tag, push, prune, inspect)
- Docker Hub and private Docker registries

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- `docker pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- `docker build`: https://docs.docker.com/reference/cli/docker/buildx/build/
- `docker save` / `docker load`: https://docs.docker.com/reference/cli/docker/image/save/ and https://docs.docker.com/reference/cli/docker/image/load/
- `docker tag` / `docker push`: https://docs.docker.com/reference/cli/docker/image/tag/
- `docker image prune`: https://docs.docker.com/reference/cli/docker/image/prune/
- `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/
- `docker inspect` format strings: https://docs.docker.com/reference/cli/docker/inspect/
- Portainer documentation (images management): https://docs.portainer.io/

## Issues Found
- The comment "untagged layers" next to `docker image prune` was imprecise. Docker defines a dangling image as an image that is not tagged and is not referenced by any other image (not as "untagged layers"). Layers and images are distinct concepts — layers are filesystem deltas that make up images. Updated the comment to "untagged, not referenced by any image" to match Docker's own terminology.

## Review Notes
- All Docker commands, flags, and redirections verified against the current Docker CLI reference and are syntactically correct.
- `docker load -i myapp-latest.tar.gz` works because `docker load` transparently handles gzipped tar archives.
- The `docker pull ... 2>&1 | grep -E "Pull complete|up to date"` pattern is a pragmatic heuristic but not an officially supported way to detect a newer digest. A more robust approach is `docker pull` followed by comparing `docker inspect --format '{{.Id}}' <image>` digests before and after, or using `docker manifest inspect`. This is not strictly incorrect, so no change made.
- `postgres:16` is a current, supported Postgres tag on Docker Hub at the time of review.
- Portainer UI navigation wording ("Images > Pull image", "Images > Build image") is accurate for current Portainer CE/BE versions.

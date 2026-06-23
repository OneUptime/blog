# Validation Summary: How to Inspect and Clean Up Docker Disk Usage

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker Engine
- Docker CLI prune commands
- Docker images, containers, volumes, networks, and build cache
- BuildKit / Docker Buildx cache management
- Docker daemon JSON logging configuration
- Bash cleanup scripts and cron

## Sources Consulted
- Docker CLI local help from Docker version 29.4.2: `docker system prune --help`, `docker image prune --help`, `docker container prune --help`, `docker volume prune --help`, `docker builder prune --help`, `docker system df --help`
- Docker Docs: `docker system prune` CLI reference, https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: `docker volume prune` CLI reference, https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: `docker image prune` CLI reference, https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs: `docker builder prune` CLI reference, https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker Docs: `docker buildx prune` CLI reference, https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker Docs: Prune unused Docker objects, https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs: JSON file logging driver, https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Build garbage collection, https://docs.docker.com/build/cache/garbage-collection/
- Docker Docs: buildkitd.toml configuration, https://docs.docker.com/build/buildkit/toml-configuration/
- Docker Docs: Building best practices, https://docs.docker.com/build/building/best-practices/

## Issues Found
- The post described `RECLAIMABLE` space as safe to remove. I changed this to say Docker considers the space unused and eligible for cleanup, while still requiring review for volumes and images.
- The post stated dangling images have no tag and are not used by any container, and repeatedly described them as safe to delete. I changed the wording to define dangling images as untagged, and to state that `docker image prune` removes dangling images not referenced by containers while still advising review for local untagged build outputs.
- The `docker system prune -a --volumes` explanation said `--volumes` removes all unused volumes. Current Docker documentation and CLI help specify anonymous volumes for `docker system prune --volumes`, so I corrected that wording.
- The warning for `docker system prune -a` said images not attached to running containers are removed. Docker removes unused images without at least one container associated with them, so I changed this to "not attached to any container."
- The volume cleanup section implied `docker volume prune` removes all unused volumes. Current Docker CLI defaults to unused anonymous volumes, with `docker volume prune -a` required for all unused local volumes including named volumes. I updated the commands and comments accordingly.
- The build cache cleanup section said `docker builder prune` removes all build cache and used an unsupported `unused-for=24h` filter. I changed it to "unused build cache" and replaced the unsupported filter example with `docker builder prune -a --filter "until=24h"`.
- The CI cleanup script comment said `docker volume prune -f` removes unused volumes. I corrected it to unused anonymous volumes.
- The build cache limit example used `--reserved-space` while describing a maximum 10GB cache limit. `--reserved-space` is a lower retention threshold; I changed the examples to `--max-used-space 10GB` and updated the BuildKit wording to refer to `maxUsedSpace`.

## Review Notes
The remaining examples are broadly accurate for current Docker CLI behavior. The Dockerfile multi-stage example is syntactically valid, but copying `node_modules` from a Debian-based `node:22` build stage into an Alpine runtime can be risky for applications with native Node dependencies because Alpine uses musl libc. This is a portability caveat rather than a direct syntax error.

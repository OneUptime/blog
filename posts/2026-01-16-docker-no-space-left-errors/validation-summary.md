# Validation Summary: How to Fix Docker 'No Space Left on Device' Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Buildx / BuildKit cache
- Docker Compose
- Docker daemon configuration
- Docker logging drivers
- Linux disk usage and cron commands

## Sources Consulted
- Docker CLI reference: docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: docker volume prune - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: docker buildx prune - https://docs.docker.com/reference/cli/docker/buildx/prune/
- Docker CLI reference: docker compose down - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker CLI reference: dockerd storage options - https://docs.docker.com/reference/cli/dockerd/
- Docker JSON file logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Local Docker CLI help output from Docker 29.4.2 for prune, Compose, disk usage, image, container, and daemon flags.

## Issues Found
- Corrected `docker image prune` descriptions. By default it removes dangling images; `docker image prune -a` removes all unused images.
- Corrected volume cleanup descriptions. Current Docker CLI behavior distinguishes anonymous volumes from named volumes; `docker volume prune` and `docker system prune --volumes` should not be described as blanket removal of all unused named volumes.
- Replaced `docker builder prune --keep-storage` examples with current `docker buildx prune --max-used-space` examples. The local Docker 29.4.2 CLI exposes the Buildx prune interface and no longer lists `--keep-storage` there.
- Removed an invalid `//` comment from a `json` fenced `daemon.json` example and moved the file path into surrounding prose.
- Added the required caveat that `overlay2.size` only works with an XFS backing filesystem mounted with project quotas.
- Clarified the Docker data-root example so the `daemon.json` approach is presented as an alternative to a symlink.
- Removed an unused shell variable from the monitoring script.
- Updated the quick reference table so `docker system prune` includes build cache and `docker buildx prune` is used for build cache cleanup.

## Review Notes
The remaining commands and snippets are technically plausible for typical Linux Docker Engine installations. Some emergency commands intentionally operate directly under `/var/lib/docker`; they are appropriate as last-resort recovery examples but should be used with care on production hosts.

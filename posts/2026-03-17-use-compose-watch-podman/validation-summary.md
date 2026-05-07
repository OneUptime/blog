# Validation Summary: How to Use Compose Watch with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Compose Watch
- Compose Develop Specification
- Podman
- Podman socket / Docker API compatibility
- Node.js containers
- Containerfile / Dockerfile syntax

## Sources Consulted
- Docker Docs: Use Compose Watch - https://docs.docker.com/compose/how-tos/file-watch/
- Docker Docs: Compose Develop Specification - https://docs.docker.com/reference/compose-file/develop/
- Docker Docs: docker compose watch CLI reference - https://docs.docker.com/reference/cli/docker/compose/watch/
- Docker Docs: Compose file version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Podman Docs: podman-system-service - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Docs: podman compose - https://docs.podman.io/en/v5.3.1/markdown/podman-compose.1.html

## Issues Found
- The post stated only Docker Compose v2.22.0+ was required while using `sync+restart` in multiple examples. Docker's Compose Develop Specification documents `sync+restart` as available with Docker Compose v2.23.0 and later. Updated the prerequisites and summary to call out that `watch` requires v2.22.0+ and `sync+restart` requires v2.23.0+.
- The Compose examples used the top-level `version: "3.8"` property. Docker's current Compose file reference marks the top-level `version` property as obsolete and only informative. Removed the `version` lines from the example Compose files.

## Review Notes
- The Podman socket setup and `DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock` guidance matches Podman's documented rootless socket path.
- `docker compose watch`, `docker compose up -d`, the `develop.watch` structure, `sync`, `rebuild`, `sync+restart`, `path`, `target`, and `ignore` usage were verified against Docker's official Compose documentation.
- Docker's Compose Watch documentation notes that containers used with `sync` need common file utilities such as `stat`, `mkdir`, and `rmdir`, and the target path must be writable by the container user. The examples are plausible, but future revisions could mention this caveat if troubleshooting guidance is added.

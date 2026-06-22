# Validation Summary: How to Use Docker BuildKit Cache Mounts and Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker BuildKit
- Dockerfile frontend syntax
- Build cache mounts
- Build secrets
- SSH mounts
- Bind mounts and tmpfs mounts
- Docker Compose build secrets
- Docker Buildx Bake
- Inline, registry, and local cache exporters
- Package manager caches for APT, APK, pip, npm, Go modules, Maven, and Cargo

## Sources Consulted
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Dockerfile reference for `RUN --mount`, cache, bind, tmpfs, secret, and SSH mounts: https://docs.docker.com/reference/dockerfile/
- Docker Build secrets documentation: https://docs.docker.com/build/building/secrets/
- Docker cache optimization documentation: https://docs.docker.com/build/cache/optimize/
- Docker cache storage backends documentation: https://docs.docker.com/build/cache/backends/
- Docker inline cache backend documentation: https://docs.docker.com/build/cache/backends/inline/
- Docker registry cache backend documentation: https://docs.docker.com/build/cache/backends/registry/
- Docker local cache backend documentation: https://docs.docker.com/build/cache/backends/local/
- Docker Compose Build Specification: https://docs.docker.com/reference/compose-file/build/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker Buildx Bake reference: https://docs.docker.com/build/bake/reference/
- Docker Buildx Bake from Compose documentation: https://docs.docker.com/build/bake/compose-file/
- Docker CLI help output for `docker build`, `docker buildx build`, `docker buildx du`, and `docker builder prune`

## Issues Found
- The `/etc/docker/daemon.json` example included a JavaScript-style comment inside a `json` code block, which is not valid JSON. Moved the filename out of the code block.
- The APT cache mount example did not remove Docker's `docker-clean` apt configuration or enable keeping downloaded packages, so the package cache mount would be much less useful. Added the cache-retention setup from Docker's official APT cache example and set `sharing=locked` for both APT cache mounts because APT needs exclusive access.
- The basic secret example used `FROM alpine:3.19` and then ran `npm install`, but Alpine does not include npm by default. Changed the base image to `node:20-alpine`.
- The first SSH clone example mounted SSH credentials but did not add GitHub to `known_hosts`, which can fail in non-interactive builds. Added the same `ssh-keyscan` setup used later in the post.
- The bind mount section described the example as mounting host directories. Dockerfile `RUN --mount=type=bind` defaults to mounting files or directories from the build context, so the wording was corrected.
- The Docker Compose environment-variable command was presented generically, but `COMPOSE_DOCKER_CLI_BUILD=1` is for legacy Docker Compose V1. Clarified that scope.

## Review Notes
Most examples are intentionally generic and require project files such as `package-lock.json`, `requirements.txt`, `go.sum`, `pom.xml`, or `Cargo.lock` to exist in the build context. The Dockerfile frontend tag `docker/dockerfile:1.4` still supports the shown mount features, though Docker's current documentation generally uses `# syntax=docker/dockerfile:1`.

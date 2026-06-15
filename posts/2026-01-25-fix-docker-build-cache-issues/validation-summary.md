# Validation Summary: How to Fix Docker Build Cache Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker
- Dockerfile syntax
- Docker BuildKit
- Docker Buildx
- Docker build cache and cache mounts
- GitHub Actions
- docker/build-push-action

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Inline cache backend - https://docs.docker.com/build/cache/backends/inline/
- Docker Docs: Cache management with GitHub Actions - https://docs.docker.com/build/ci/github-actions/cache/
- Docker Docs: Build context and .dockerignore - https://docs.docker.com/build/concepts/context/
- docker/build-push-action README - https://github.com/docker/build-push-action

## Issues Found
- The post said commands that produce different output each time break caching. Docker's official cache rules state that normal RUN cache lookup uses the command string and does not inspect files changed inside the container, so timestamp or package-index commands are more likely to reuse stale cached output than to invalidate cache. Updated the section to describe stale RUN results and explicit cache busting.
- The apt install example used a fixed curl package version that may not exist on the base distribution used by a reader. Replaced it with an explicit cache-busting ARG and a standard apt install command with `--no-install-recommends`.
- The command comment for `docker build --target builder --no-cache` implied rebuilding from a specific stage. The command builds the named target stage and skips stages after it while disabling cache for that build. Updated the comment to say "Build a specific stage without cache."
- The GitHub Actions example used older Docker action major versions. Updated it to match current Docker examples: `actions/checkout@v6`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, and `docker/build-push-action@v7`.
- The apt cache mount example omitted Docker's documented `sharing=locked` settings and apt package-cache retention setup. Updated the snippet to remove `docker-clean`, keep downloaded packages, and use locked cache mounts for apt cache directories.
- The troubleshooting section said Git timestamp changes can invalidate COPY cache. Docker's official cache invalidation docs state that file modification time (`mtime`) is not included in the checksum. Updated the note to refer to file content and relevant metadata instead.

## Review Notes
The overall Dockerfile ordering guidance, BuildKit inline cache usage, registry cache example, `.dockerignore` advice, cache mount concept, and multi-stage caching strategy are technically sound. The examples remain general-purpose; real production Dockerfiles should also pin base images and package versions according to the target distribution's package repository.

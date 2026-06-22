# Validation Summary: How to Optimize Docker Build Times with Layer Caching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile layer caching
- Docker BuildKit
- Docker Buildx cache backends
- Multi-stage builds
- npm, pip, Go modules, Cargo cache mounts
- GitHub Actions
- GitLab CI

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: BuildKit - https://docs.docker.com/build/buildkit/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build context and .dockerignore - https://docs.docker.com/build/concepts/context/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Inline cache backend - https://docs.docker.com/build/cache/backends/inline/
- Docker Docs: GitHub Actions cache management - https://docs.docker.com/build/ci/github-actions/cache/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- npm Docs: npm ci - https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm Docs: npm config, omit/only settings - https://docs.npmjs.com/cli/v11/using-npm/config/
- Local Docker CLI help output for `docker build` / `docker buildx build`

## Issues Found
- Replaced `npm ci --only=production` with `npm ci --omit=dev`. The npm `only=production` setting is a deprecated alias for omitting dev dependencies; `--omit=dev` is the current documented form.
- Updated GitHub Actions examples from `docker/setup-buildx-action@v3` and `docker/build-push-action@v5` to `@v4` and `@v7`, matching current Docker documentation examples.
- Removed `--build-arg BUILDKIT_PROGRESS=plain` from the profiling command. Build progress is controlled by the Docker CLI `--progress=plain` option or the client environment, not by passing an arbitrary build argument unless the Dockerfile explicitly consumes it.
- Moved `ENV NODE_ENV=production` from the shared base stage to the final production stage in the complete optimized example. With npm, `NODE_ENV=production` makes `omit` default to `dev`, so inheriting it in the development dependency stage could prevent build dependencies from being installed.

## Review Notes
The remaining Dockerfile, cache mount, bind mount, `.dockerignore`, external cache, inline cache, target stage, and multi-stage build examples align with Docker's current documentation. BuildKit is now the default builder for current Docker Desktop and Docker Engine Linux-container builds, so the explicit BuildKit enablement section is still usable but less necessary for modern Docker versions.

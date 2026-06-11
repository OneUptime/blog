# Validation Summary: How to Implement Docker Layer Caching Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile build cache
- BuildKit cache mounts
- Docker Buildx
- GitHub Actions
- GitLab CI
- npm
- Python pip
- Go modules
- Rust Cargo

## Sources Consulted
- Docker Docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Cache storage backends - https://docs.docker.com/build/cache/backends/
- Docker Docs: GitHub Actions cache backend - https://docs.docker.com/build/cache/backends/gha/
- Docker Docs: Cache management with GitHub Actions - https://docs.docker.com/build/ci/github-actions/cache/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- GitLab Docs: Cache Docker layers in Docker-in-Docker builds - https://docs.gitlab.com/ci/docker/docker_layer_caching/
- npm Docs: npm ci - https://docs.npmjs.com/cli/v9/commands/npm-ci/
- npm Docs: npm config - https://docs.npmjs.com/cli/v9/using-npm/config/

## Issues Found
- The post stated that each Dockerfile instruction creates a new layer. This is an oversimplification: filesystem-changing instructions such as `RUN`, `COPY`, and `ADD` create filesystem layers, while metadata instructions still participate in cache checks. Updated the explanation to be more precise.
- The production-stage Node example used `npm ci --only=production`. npm documents `only=production` as deprecated in favor of `--omit=dev`, so the example now uses `npm ci --omit=dev`.
- The GitHub Actions example used older Docker action major versions. Updated `docker/setup-buildx-action` to `v4` and `docker/build-push-action` to `v7`, matching current Docker documentation.
- The GitLab CI inline cache example did not pull the cache image before `--cache-from`, did not tag `latest`, and did not push `latest` for future cache reuse. Added `docker pull $CI_REGISTRY_IMAGE:latest || true`, the `latest` tag, and a push for the `latest` tag, matching GitLab's documented inline cache pattern.
- The registry-based cache example used `docker build` with `--cache-to`. Docker documents external cache import/export with `docker buildx build`; updated the command to use `docker buildx build`, registry cache syntax for both cache import and export, and `--push`.

## Review Notes
- The GitHub Actions `gha` cache backend is documented by Docker as experimental and should only be used in GitHub Actions workflow context.
- BuildKit cache mounts are correct for local and persistent BuildKit builders. Docker notes that cache mount contents are not automatically preserved by the GitHub Actions cache backend without additional handling.

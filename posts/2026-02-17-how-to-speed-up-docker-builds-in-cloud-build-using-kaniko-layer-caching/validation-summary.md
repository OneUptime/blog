# Validation Summary: How to Speed Up Docker Builds in Cloud Build Using Kaniko Layer Caching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Kaniko
- Docker and Dockerfile layer caching
- Artifact Registry
- gcloud CLI
- Node.js / npm

## Sources Consulted
- Kaniko README, GoogleContainerTools/kaniko: https://github.com/GoogleContainerTools/kaniko
- Cloud Build overview and build environment documentation: https://docs.cloud.google.com/build/docs/overview
- Artifact Registry Docker image management documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/manage-images
- Docker build cache optimization documentation: https://docs.docker.com/build/cache/optimize/
- Docker build cache documentation: https://docs.docker.com/build/cache/
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The post described every Cloud Build Docker build as fully cold and every instruction as always rebuilt. Updated the wording to clarify this applies to plain builds without an external cache source.
- The post described Kaniko as currently developed by Google. Updated it to say it was originally developed under GoogleContainerTools and noted that the original repository was archived on June 3, 2025.
- The post implied Kaniko checks every layer throughout the build. Updated it to explain that Kaniko checks cacheable commands and, after a cache miss, builds subsequent layers locally without consulting the cache.
- The examples enabled `--cache=true` but did not enable `--cache-copy-layers=true`, while the text discussed cached COPY layers. Added `--cache-copy-layers=true` where needed.
- The `--cache-repo` default was described as the same repository as the destination image. Updated it to match Kaniko's documented behavior: the cache repository is inferred from the destination, such as appending `/cache`.
- The `--skip-unused-stages` comment incorrectly described filesystem-scan behavior. Changed it to describe skipping unused multi-stage Dockerfile stages.
- The `--compressed-caching=false` comment incorrectly presented the flag as a parallel compression speed optimization. Changed it to describe the actual tradeoff: lower memory usage with possible longer runtime.
- The Dockerfile used `npm ci --production`. Updated it to `npm ci --omit=dev`, which is the current npm option for omitting development dependencies.
- The Artifact Registry deletion example omitted `--delete-tags`, which may be required when deleting a digest that has tags. Added `--delete-tags`.
- The Docker `--cache-from` comparison overstated Kaniko's cache granularity and described Docker cache-from as all-or-nothing. Updated the comparison to state that Docker can also reuse matching layers but requires a cache source to be available.

## Review Notes
Kaniko remains usable in environments that already standardize on it, but the original GoogleContainerTools repository is archived and no longer maintained. For new Cloud Build pipelines, consider evaluating actively maintained builders or Docker BuildKit registry cache options.

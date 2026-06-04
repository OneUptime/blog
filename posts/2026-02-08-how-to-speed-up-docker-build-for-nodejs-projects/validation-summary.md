# Validation Summary: How to Speed Up Docker Build for Node.js Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfile builds
- Docker BuildKit
- Docker layer caching and cache mounts
- Node.js official Docker images
- npm and npm workspaces
- pnpm
- Yarn
- Alpine Linux package installation

## Sources Consulted
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Dockerfile reference for `RUN --mount=type=cache` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: BuildKit overview and parallel build capabilities - https://docs.docker.com/build/buildkit/
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker CLI help: `docker build --help` and `docker builder prune --help`
- npm Docs: `npm ci` - https://docs.npmjs.com/cli/commands/npm-ci/
- Local npm CLI help: `npm ci --help`
- Node.js Releases page - https://nodejs.org/en/about/previous-releases
- Node.js Release Working Group schedule - https://github.com/nodejs/Release#release-schedule
- Node.js official Docker image documentation - https://github.com/nodejs/docker-node
- pnpm Docs: Working with Docker - https://pnpm.io/docker
- pnpm Docs: `pnpm install` - https://pnpm.io/cli/install
- Yarn Docs: Cache strategies - https://yarnpkg.com/features/caching
- Yarn Docs: `yarn install` - https://yarnpkg.com/cli/install
- Yarn configuration docs: https://yarnpkg.com/configuration/yarnrc

## Issues Found
- The Dockerfile examples used `node:20-alpine`. Node.js 20 is end-of-life as of the 2026-06-04 review date, so the examples were updated to `node:24-alpine`, the current Active LTS line.
- The BuildKit enablement text implied manual setup was commonly needed and included an older daemon configuration example. Current Docker Desktop and Docker Engine use BuildKit by default for Linux container builds, so the wording was updated while keeping the `DOCKER_BUILDKIT=1` command for older setups.
- The pnpm Docker cache mount used an older/default store path. The example now follows pnpm's current Docker recipe by setting `PNPM_HOME=/pnpm`, enabling Corepack, and mounting `/pnpm/store` with a stable cache id.
- The "Parallel Dependency Installation" section described a single npm workspace install, not explicit parallel package installs. The heading and intro were corrected to describe workspace dependency installation and cache-friendly manifest copying.
- The base image size section listed stale approximate image sizes. The exact size comments were replaced with relative descriptions because current local image sizes vary by Node version, architecture, platform, and Docker image store.

## Review Notes
- The `.dockerignore`, `npm ci`, multi-stage build, BuildKit cache mount, `docker builder prune -a -f`, and Yarn `--immutable` examples are technically valid.
- The Yarn cache mount targets Yarn's default root-owned global cache path. Projects that set `enableGlobalCache: false` or a custom `cacheFolder` in `.yarnrc.yml` should mount that configured cache folder instead.

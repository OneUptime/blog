# Validation Summary: Fix Vanishing Multi-Stage Docker Caches in CI with BuildKit `mode=max`

## Status
validated

## Post Type
Technical guide / CI build-cache tutorial

## Technologies Covered
- Docker
- Dockerfile multi-stage builds
- BuildKit
- Docker Buildx
- Registry-backed external build cache
- Node.js 24 and npm
- CI/CD with ephemeral builders
- Container registries

## Sources Consulted
- [Docker cache storage backends and cache modes](https://docs.docker.com/build/cache/backends/)
- [Docker registry cache backend](https://docs.docker.com/build/cache/backends/registry/)
- [Docker guide to optimizing build cache](https://docs.docker.com/build/cache/optimize/)
- [Docker build-cache invalidation rules](https://docs.docker.com/build/cache/invalidation/)
- [Docker multi-stage builds documentation](https://docs.docker.com/build/building/multi-stage/)
- [Docker BuildKit overview](https://docs.docker.com/build/buildkit/)
- [Dockerfile reference, including `RUN --mount=type=cache`](https://docs.docker.com/reference/dockerfile/)
- [Docker Buildx build command reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Buildx create command reference](https://docs.docker.com/reference/cli/docker/buildx/create/)
- [Docker build variables and secret-handling guidance](https://docs.docker.com/build/building/variables/)
- [Docker build secrets documentation](https://docs.docker.com/build/building/secrets/)
- [Moby BuildKit cache-export documentation](https://github.com/moby/buildkit#cache)
- [Moby BuildKit maintainer clarification that cache mounts are not stored in exported cache](https://github.com/moby/buildkit/issues/3011)
- [Official Docker Library metadata for the Node image](https://github.com/docker-library/official-images/blob/master/library/node)
- [npm `ci` command documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)

## Issues Found
- The post implied that pulling the application image could itself provide BuildKit cache. Clarified that an inline cache must be explicitly exported and imported, and that merely pushing or pulling an image does not transfer a complete set of intermediate-stage cache records.
- The description of `mode=max` could be read as including every stage in the Dockerfile. Clarified that it exports cache for the build steps BuildKit actually executes for the selected target; unrelated stages that BuildKit skips are not built or cached.
- The main registry-cache command did not state its builder requirement. Added that the default `docker` driver supports registry cache export only with the containerd image store enabled, while `docker-container` and other supported drivers can be used otherwise.
- The monorepo storage warning referred to "unused stages," although BuildKit skips stages outside the selected target's dependency graph. Changed it to refer to large stages within a target's dependency graph.
- The cache-mount discussion did not distinguish builder-local cache-mount data from externally exported layer cache. Clarified that registry cache can reuse the result of the `RUN` step but does not transfer `/root/.npm` cache-mount contents to a fresh builder when the step must execute again.

## Review Notes
- The Dockerfile syntax, named stages, `COPY --from` usage, cache mounts, `npm ci --omit=dev`, and JSON-form `CMD` are valid. The `node:24-bookworm-slim` official image tag exists as of the validation date.
- The Buildx flags and command structure are current. The two named `docker-container` builders in the verification procedure have isolated BuildKit state, so the second build is a valid remote-cache test.
- The dedicated cache reference, missing-cache behavior, `inline` exporter's `min`-only limitation, multiple `--cache-from` sources, branch-scoped exports, cache invalidation explanation, and secret/SSH mount guidance agree with current Docker documentation.

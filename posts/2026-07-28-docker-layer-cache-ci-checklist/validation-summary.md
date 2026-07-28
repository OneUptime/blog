# Validation Summary: Why Does Docker Ignore the Layer Cache in CI? A Cache-Invalidation Checklist

## Status

validated

## Post Type

Technical troubleshooting guide and checklist

## Technologies Covered

- Docker
- Docker BuildKit
- Docker Buildx
- Dockerfile
- Docker build cache and cache mounts
- GitHub Actions
- Docker GitHub Actions cache backend
- Registry and inline cache exporters

## Sources Consulted

- [Docker build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Optimize Docker build cache usage](https://docs.docker.com/build/cache/optimize/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker registry cache backend](https://docs.docker.com/build/cache/backends/registry/)
- [Docker GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/)
- [Docker cache management with GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/)
- [Docker GitHub Actions build summary](https://docs.docker.com/build/ci/github-actions/build-summary/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker build variables](https://docs.docker.com/build/building/variables/)
- [docker buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [docker buildx inspect CLI reference](https://docs.docker.com/reference/cli/docker/buildx/inspect/)
- [docker/setup-buildx-action documentation](https://github.com/docker/setup-buildx-action)
- [docker/build-push-action documentation](https://github.com/docker/build-push-action)
- [GitHub dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)

## Issues Found

- The GitHub Actions example used the path context `context: .` and pushed to GHCR without stating its prerequisites. Path context requires the repository to have been checked out, and pushing requires registry authentication. The introduction now makes those prerequisites explicit while keeping the cache example focused.
- The cache-mount section did not explicitly distinguish GitHub Actions external layer-cache export from cache-mount persistence. Docker documents that BuildKit does not preserve cache mounts in the GitHub Actions cache by default. The text now states this and recommends persisting builder state or using a separate supported save/restore mechanism on ephemeral runners.

## Review Notes

- `docker/setup-buildx-action@v4` and `docker/build-push-action@v7` are the current major versions used by Docker's official examples as of the validation date.
- The GitHub Actions cache backend is still marked experimental in Docker's documentation and remains subject to GitHub cache size, access, and eviction policies.
- The remaining cache invalidation, cache scope, secret handling, `SOURCE_DATE_EPOCH`, platform, cache mode, CLI flag, and cache security claims match the consulted documentation.

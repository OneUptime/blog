# Validation Summary: How to Use BuildKit Workers for Parallel CI Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker BuildKit
- Docker Buildx
- buildctl
- buildkitd.toml
- Docker Compose
- Nginx stream proxying
- Registry and S3 build cache backends
- Dockerfile multi-stage builds

## Sources Consulted
- Docker Docs: BuildKit overview and Docker Engine 23.0 default BuildKit behavior, https://docs.docker.com/build/buildkit/
- Docker Docs: Buildx remote driver, https://docs.docker.com/build/builders/drivers/remote/
- Docker Docs: buildkitd.toml configuration, https://docs.docker.com/build/buildkit/toml-configuration/
- Docker Docs: BuildKit configuration and max parallelism, https://docs.docker.com/build/buildkit/configure/
- Docker Docs: cache storage backends, https://docs.docker.com/build/cache/backends/
- Docker Docs: Amazon S3 cache backend, https://docs.docker.com/build/cache/backends/s3/
- Docker Docs: buildx build CLI reference, https://docs.docker.com/reference/cli/docker/buildx/build/
- Moby BuildKit v0.13.0 README, https://github.com/moby/buildkit/blob/v0.13.0/README.md
- Moby BuildKit v0.13.0 buildkitd.toml reference, https://github.com/moby/buildkit/blob/v0.13.0/docs/buildkitd.toml.md
- Local Docker Buildx CLI help for `docker buildx create` and `docker buildx build`

## Issues Found
- The post described a BuildKit worker as a daemon process. Updated the wording to distinguish the `buildkitd` daemon from workers, which are execution backends inside the daemon.
- The post said recent Docker versions use BuildKit without specifying the version. Updated the claim to Docker Engine 23.0, where Docker documents Buildx and BuildKit as the default build path.
- The standalone TCP examples omitted the security caveat. Added a note that unauthenticated TCP access is unsafe and production deployments should use mTLS or isolation.
- The `buildkitd.toml` examples used `gckeepbytes`, which is not the BuildKit v0.13 configuration key. Changed it to `gckeepstorage`.
- The `buildkitd.toml` example included a `[cache]` / `[cache.local]` block that is not part of the documented BuildKit daemon configuration. Removed it.
- The GC policy examples used less accurate comments and an unsupported-looking `type==regular` filter. Replaced the filter with documented BuildKit cache record filters and used documented duration and byte formats.
- The Nginx section called the stream configuration gRPC load balancing. Clarified that it is TCP load balancing for BuildKit's gRPC API.
- The Buildx platform-routing example registered two nodes for `linux/amd64`. Changed the appended node to `linux/arm64` to match the platform-specific routing explanation.
- The monitoring section implied `buildctl debug info` provides build-specific metrics and cache hit rates. Tightened the wording to worker status, cache size, and daemon information.

## Review Notes
- The post pins BuildKit v0.13.0, while current Docker documentation has newer GC option names such as `reservedSpace`, `maxUsedSpace`, and `minFreeSpace`. The examples were kept aligned with the pinned v0.13.0 references instead of updating the entire post to a newer BuildKit release.
- The S3 cache backend is documented as experimental and unavailable with the default `docker` driver, so the post now calls out that limitation.

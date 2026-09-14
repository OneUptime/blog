# Validation Summary: Why a BuildKit Local Cache Directory Grows Forever—and How to Rotate Unreferenced Blobs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Buildx
- BuildKit
- OCI image layouts
- Bash
- CI cache management

## Sources Consulted
- [Docker local cache backend](https://docs.docker.com/build/cache/backends/local/)
- [Docker Buildx build reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Buildx prune reference](https://docs.docker.com/reference/cli/docker/buildx/prune/)
- [Docker Buildx disk usage reference](https://docs.docker.com/reference/cli/docker/buildx/du/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker cache management with GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/)
- [OCI Image Layout specification](https://github.com/opencontainers/image-spec/blob/main/image-layout.md)

## Issues Found
No technical issues found.

## Review Notes
The `reset=true` option is version-specific and requires Docker Buildx 0.35.0 or later, as the post states. The fresh-directory rotation example is intentionally a maintenance-window procedure: all readers and writers must honor the same exclusion policy, and recovery may be necessary if interruption occurs between its two promotion renames.

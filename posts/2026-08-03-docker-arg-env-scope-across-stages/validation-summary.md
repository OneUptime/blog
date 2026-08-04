# Validation Summary: Docker `ARG` and `ENV` Scope Across Multi-Stage `FROM` Boundaries

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Docker
- Dockerfile syntax
- Multi-stage builds
- BuildKit
- Build arguments (`ARG`)
- Environment variables (`ENV`)
- BuildKit secret mounts
- OCI image labels

## Sources Consulted

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker build variables and scoping](https://docs.docker.com/build/building/variables/)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Node Docker Official Image tags](https://hub.docker.com/_/node/tags?name=24-bookworm-slim)
- [Python Docker Official Image tags](https://hub.docker.com/_/python/tags?name=3.14-slim)
- [Alpine Docker Official Image tags](https://hub.docker.com/_/alpine/tags?name=3.23)

## Issues Found

- The main example described `BUILD_REVISION` as a global argument, but it was first declared inside the `base` stage. A value passed with `--build-arg BUILD_REVISION=...` would still be available at each matching `ARG BUILD_REVISION` declaration, so the build behavior was valid; however, the example did not actually demonstrate consuming a globally declared argument as claimed. Added `ARG BUILD_REVISION` before the first `FROM` so the declaration, comments, and scope explanation agree.

## Review Notes

- The `node:24-bookworm-slim`, `python:3.14-slim`, and `alpine:3.23` tags are currently available official image tags. They are mutable version-series tags rather than digest-pinned references, which is appropriate for concise scope examples but may not be sufficiently reproducible for production builds.
- The local Docker 29.4.3 / Buildx 0.33.0 CLI help confirms the documented `--build-arg`, `--tag`, and `--secret` options. A Docker daemon was not available for live builds; Dockerfile syntax and behavior were checked against the current official references.

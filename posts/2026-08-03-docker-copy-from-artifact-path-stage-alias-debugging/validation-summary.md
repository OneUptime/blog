# Validation Summary: `COPY --from` Artifact Not Found: Path and Stage-Alias Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Docker
- Dockerfile
- Docker Buildx and BuildKit
- Multi-stage builds and named stages
- `COPY --from`
- `RUN --mount` bind, cache, and secret mounts
- Build contexts and `.dockerignore`
- Go, Node.js/npm, NGINX, Debian, and Alpine container images

## Sources Consulted

- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile reference: `COPY`, `COPY --from`, and `RUN --mount`](https://docs.docker.com/reference/dockerfile/)
- [Moby issue confirming relative `COPY --from` sources resolve from `/`](https://github.com/moby/moby/issues/35650)
- [Docker build context and Dockerfile-specific ignore files](https://docs.docker.com/build/concepts/context/)
- [Docker cache optimization and build bind mounts](https://docs.docker.com/build/cache/optimize/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker container run CLI reference](https://docs.docker.com/reference/cli/docker/container/run/)
- Docker CLI 29.4.3 and Buildx 0.33.0 local `--help` output
- Docker Hub official-image tag metadata for `golang:1.25-bookworm`, `debian:bookworm-slim`, `node:24-bookworm-slim`, `nginx:1.29-alpine`, and `alpine:3.23`

## Issues Found

- The opening checklist said the `COPY --from` source path must be absolute. Docker also accepts a source without a leading slash and resolves it from the source filesystem root. Changed the wording to require correct root-based resolution rather than absolute-path syntax.
- The debug-stage command did not force the tagged result into the local image store when a non-`docker` Buildx driver is selected, so the following `docker run` could fail to find it. Added `--load` to make that inspection flow reliable for a single-platform build.
- The corrected bind-mount example wrote to `/out/service` without ensuring `/out` existed. Added `mkdir -p /out` before invoking `make`.
- The trailing-slash explanation implied that a trailing slash on the source changes `COPY` behavior. Docker disregards source trailing slashes; destination trailing slashes are significant. Corrected the explanation while preserving the example.

## Review Notes

All referenced documentation links returned successfully, and all pinned official-image tags existed at validation time. The local Docker CLI and Buildx help confirmed the documented command flags. A live sample build could not be executed because the local Docker daemon was not running; Dockerfile behavior was verified against the official Docker documentation and current CLI reference.

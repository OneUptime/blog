# Validation Summary: How to Use Build Cache Effectively with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Buildah-backed image builds
- Containerfile/Dockerfile syntax
- Container image layer caching
- `.containerignore`
- `RUN --mount=type=cache`
- npm, pip, apt, Go modules, and Cargo dependency installation patterns

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Containerfile(5) man page from containers-common, covering `RUN`, cache mounts, and instruction syntax: https://manpages.debian.org/testing/golang-github-containers-common/Containerfile.5.en.html
- Docker Dockerfile reference for `RUN --mount=type=cache` behavior and apt cache example details: https://docs.docker.com/reference/builder
- Docker cache optimization documentation for package manager cache mount examples: https://docs.docker.com/build/cache/optimize/

## Issues Found
- The post said every Containerfile instruction creates a layer. This is too broad; build instructions such as `RUN`, `COPY`, and `ADD` create filesystem layers, while metadata/configuration instructions do not necessarily create filesystem layers. Updated the wording to be precise.
- The CI cache example used `--cache-from` without `--layers` and pointed it at the final application image. Current Podman documentation says `--cache-from` is ignored unless `--layers` is specified and that `--cache-to` should be used to populate the remote cache repository. Updated the example to use a dedicated cache repository with `--layers`, `--cache-from`, and `--cache-to`, then push the final image separately.
- The apt cache mount example did not disable Ubuntu image cleanup behavior that removes downloaded package archives. Updated the example to remove `/etc/apt/apt.conf.d/docker-clean`, keep downloaded packages, and use `--no-install-recommends`.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior could not be checked with `podman build --help` or a live build. The review was completed against current upstream Podman documentation and Containerfile man pages. The Rust dummy-main caching pattern is a common optimization but may need adjustment for workspaces, library crates, or packages whose binary name is not `app`.

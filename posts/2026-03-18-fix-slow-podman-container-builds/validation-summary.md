# Validation Summary: How to Fix Slow Podman Container Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Buildah/Containerfile builds
- Dockerfile-compatible syntax
- Container image layer caching
- Multi-stage container builds
- Node.js container images
- Python container images
- Go container images
- Alpine Linux and Ubuntu base images
- Local registry caching

## Sources Consulted
- Podman build reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman global options reference: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `.containerignore` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html#containerignore-dockerignore
- Buildah build and cache mount references: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md and https://buildah.io/releases/2025/02/03/Buildah-version-v1.39.0.html
- Node.js release schedule: https://github.com/nodejs/Release
- Go release history and support policy: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Docker Official Image tags for Python: https://hub.docker.com/_/python

## Issues Found
- The verbose logging command placed `--log-level=debug` after the `build` subcommand. Podman documents `--log-level` as a global option, so the command was changed to `podman --log-level=debug build ...`.
- Several examples used outdated image tags for a 2026 post: `node:18`, `golang:1.21`, `alpine:3.18`, `python:3.11`, and `ubuntu:22.04`. These were updated to currently supported tags: `node:24`, `golang:1.26`, `alpine:3.22`, `python:3.13`, and `ubuntu:24.04`.
- The build-context explanation implied Podman sends context to a daemon-like build process. Podman does not use a Docker daemon, so the wording was changed to say Podman makes the context available to the build process and applies ignore rules before `COPY` and `ADD`.
- The `tar --exclude-from=.containerignore` command was presented as simulating the exact context sent to the build. Since `.containerignore` supports semantics that plain `tar --exclude-from` does not fully model, the text now describes it as a rough estimate for simple ignore files.
- The `--build-arg` section claimed build args can be used to pass values that do not affect caching. Build arguments can affect cache from the point where they are declared or used, so the section now says to place cache-busting build arguments after expensive cached layers.

## Review Notes
The remaining guidance is technically sound. Image size comments are approximate and should be periodically refreshed because official image sizes change over time.

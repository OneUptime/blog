# Validation Summary: How to Build an Image with SSH Keys with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman image builds
- Containerfile/Dockerfile `RUN --mount`
- SSH agent forwarding
- Podman build secrets
- Multi-stage container builds
- Go private modules
- Python packages from private Git repositories
- SSH agent usage in CI/CD

## Sources Consulted
- Podman `podman-build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Buildah `buildah-build` documentation, used by Podman builds: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Containers `Containerfile(5)` documentation: https://github.com/containers/common/blob/main/docs/Containerfile.5.md
- Dockerfile reference for BuildKit-style SSH and secret mounts: https://docs.docker.com/reference/builder
- Go release history: https://go.dev/doc/devel/release
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Docker Official Image for Go tags: https://hub.docker.com/_/golang/

## Issues Found
- The Go examples used `docker.io/library/golang:1.22`, which is outdated as of the review date. Updated both Go examples to `docker.io/library/golang:1.26`, matching the current Go release line and current official image tags.
- The CI cleanup example used `ssh-agent -k` directly. Updated it to `eval "$(ssh-agent -k)"` so the agent is killed and the shell environment variables emitted by `ssh-agent` are applied.

## Review Notes
- Podman documents `--ssh` for builds and `RUN --mount=type=ssh` in Containerfiles, and documents `--secret` with `RUN --mount=type=secret` for build-time secrets that are not stored in the final image.
- The local environment did not have the `podman` binary installed, so CLI behavior was verified against official Podman and Buildah documentation rather than local `--help` output.

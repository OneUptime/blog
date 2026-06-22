# Validation Summary: How to Build Custom Docker Base Images from Scratch

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfiles
- Docker scratch base images
- Docker multi-stage builds
- Docker Buildx multi-platform builds
- Alpine Linux base images and minirootfs
- Debian slim and debootstrap root filesystems
- Distroless images
- Go, Rust, C, Python, Node.js, and Java container builds
- npm
- GitHub Actions
- Trivy

## Sources Consulted
- Docker Docs: Base images and `scratch` usage, https://docs.docker.com/build/building/base-images/
- Docker Docs: Multi-stage builds, https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Multi-platform builds, https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Build variables, including `BUILDPLATFORM`, `TARGETOS`, and `TARGETARCH`, https://docs.docker.com/build/building/variables/
- Docker CLI help: `docker import` and `docker buildx build`
- GoogleContainerTools distroless README and language image docs, https://github.com/GoogleContainerTools/distroless
- npm CLI v10 docs for `npm ci`, https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Alpine Linux release branches, https://alpinelinux.org/releases/
- Docker Hub official `golang` image docs, https://hub.docker.com/_/golang
- Docker Hub official `rust` image docs, https://hub.docker.com/_/rust
- Go release policy and release history, https://go.dev/doc/devel/release

## Issues Found
- Several examples used stale base image tags. Updated Go from `golang:1.21-alpine` to `golang:1.26-alpine`, Rust from `rust:1.74-alpine` to `rust:1.96-alpine`, Alpine from `3.19` to `3.24`, and the pinned Alpine example from `3.19.0` to `3.24.1` because Alpine 3.19 is no longer in normal support and current official image tags are newer.
- The Alpine minirootfs example used `VERSION="3.19"` with a hard-coded `.0` tarball suffix. Updated it to `VERSION="3.24.1"` and changed the URL to derive the `v3.24` release path while using the exact patch tarball name. Verified the resulting URL returns HTTP 200.
- The distroless examples used older Debian 12 / Node 20 tags. Updated Python to `python:3.13-slim-trixie` with `gcr.io/distroless/python3-debian13`, Node to `node:22-slim` with `gcr.io/distroless/nodejs22-debian13`, and Java to `gcr.io/distroless/java21-debian13`, matching current distroless documentation and supported tags.
- The Node.js example used `npm ci --only=production`. Replaced it with `npm ci --omit=dev`, which is the current documented npm configuration for omitting development dependencies.
- The security-hardened base image referenced `COPY --from=app-builder` without defining an `app-builder` stage in that Dockerfile. Changed it to `COPY app /app` so the snippet no longer references an undefined build stage.

## Review Notes
The remaining examples are templates and still assume application-specific files exist, such as `go.mod`, `go.sum`, `Cargo.toml`, `main.c`, Gradle project files, `requirements.txt`, and a statically compiled `app` binary where shown. The `scratch` and distroless examples are technically correct, but real applications may need additional runtime files such as CA certificates, timezone data, passwd/group entries, or native shared libraries depending on their dependencies.

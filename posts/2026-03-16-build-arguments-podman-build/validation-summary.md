# Validation Summary: How to Use Build Arguments with podman build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Container image builds
- Build arguments (`ARG`, `--build-arg`, `--build-arg-file`)
- Build secrets (`--secret`, `RUN --mount=type=secret`)
- npm / Node.js container builds
- Go container builds
- Alpine Linux container images

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman history` documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Dockerfile reference for `ARG`, `ENV`, `FROM`, and secret mounts: https://docs.docker.com/reference/builder
- Docker build secrets documentation: https://docs.docker.com/build/building/secrets/
- npm `ci` documentation for `--omit=dev`: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Node.js release schedule: https://github.com/nodejs/Release
- Go release history and release cycle: https://go.dev/doc/devel/release and https://go.dev/wiki/Go-Release-Cycle
- Alpine Linux releases: https://www.alpinelinux.org/releases/

## Issues Found
- The Node.js example used `node:20-alpine`, but Node.js 20 reached end-of-life on 2026-04-30. Updated it to `node:22-alpine`, which is still supported.
- The Node.js example used `npm ci --production`. Updated it to the current npm option `npm ci --omit=dev`, which is the documented way to omit development dependencies.
- The Go example used `golang:1.22`, which is outside Go's supported release window as of 2026-05-08. Updated it to `golang:1.26`.
- The reproducible build example used `alpine:latest`, which is not pinned and can change over time. Updated it to `alpine:3.23`.
- The build-arguments-from-file example manually expanded `--build-arg` flags from a file. Podman supports `--build-arg-file` directly, so the example was updated to use the official option.

## Review Notes
Podman was not installed in the local environment, so CLI verification used official Podman documentation rather than local `podman build --help` output. The remaining examples and explanations match documented Podman build argument behavior, Dockerfile/Containerfile `ARG` scoping rules, `ENV` persistence behavior, and Podman build secret usage.

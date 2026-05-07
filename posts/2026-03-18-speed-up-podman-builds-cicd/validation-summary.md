# Validation Summary: How to Speed Up Podman Builds in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Buildah
- Containerfile/Dockerfile syntax
- Container image layer caching
- Registry-backed build caches
- Multi-stage container builds
- Node.js and npm
- Go
- Alpine Linux

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Buildah `buildah build` documentation: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Node.js release schedule: https://github.com/nodejs/Release
- Go release history: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The Node.js examples used `node:20-alpine`, but Node.js 20 reached end-of-life on 2026-04-30. Updated the examples to `node:24-alpine`.
- The Go examples used `golang:1.22-alpine`, which is no longer a current supported Go release. Updated the examples to `golang:1.26-alpine`, matching the current Go 1.26 release series.
- The final multi-stage example used `alpine:3.19`, which reached end of support on 2025-11-01. Updated it to `alpine:3.22`.
- The single-stage Node.js build examples ran `npm ci --production` before `npm run build`. That omits dev dependencies, which commonly include build tools required by the build script. Changed those build-stage installs to `npm ci`.
- The production-stage install used `npm ci --production --ignore-scripts`. Updated it to `npm ci --omit=dev --ignore-scripts`, which matches current npm documentation for omitting development dependencies.
- The registry cache example used `--cache-from "${IMAGE}:latest"` after pulling the final image tag. Podman/Buildah registry cache support uses cache repositories populated with `--cache-to`, and `--cache-from` is ignored unless `--layers` is specified. Updated the example to use `--layers`, `--cache-from`, and `--cache-to` with a dedicated cache image repository.
- The cache mount section implied package manager cache persistence across all CI builds. Clarified that cache mounts persist between builds on the same builder cache storage.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against current official Podman documentation and upstream Buildah documentation rather than local `podman --help` output.

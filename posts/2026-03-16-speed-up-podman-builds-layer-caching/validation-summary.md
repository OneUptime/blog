# Validation Summary: How to Speed Up Podman Builds with Layer Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Buildah build cache
- Containerfile/Dockerfile syntax
- .containerignore
- Node.js and npm
- Alpine Linux
- Go

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Buildah `buildah build` documentation: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Docker build cache invalidation documentation: https://docs.docker.com/build/cache/invalidation/
- Dockerfile reference for ARG cache behavior: https://docs.docker.com/reference/dockerfile/
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Go release history and release policy: https://go.dev/doc/devel/release
- Node.js release schedule: https://nodejs.org/en/about/previous-releases

## Issues Found
- The remote cache example incorrectly showed pulling and pushing a final application image as the cache source. Updated the example to use `--cache-from` together with `--cache-to`, matching Podman/Buildah's remote cache mechanism.
- Several example base image versions were end-of-life as of 2026-05-08. Updated `node:20-alpine` to `node:24-alpine`, `alpine:3.19` to `alpine:3.23`, and `golang:1.22` to `golang:1.26`.
- The Ubuntu NodeSource example used the Node.js 20 setup script, which corresponds to an EOL Node.js release. Updated it to `setup_24.x`.
- The npm production install example used `npm ci --production`. Updated it to `npm ci --omit=dev`, the current explicit form for omitting development dependencies.

## Review Notes
The caching concepts, `.containerignore` behavior, `--layers` requirement for remote cache flags, `ARG` cache behavior, `--no-cache`, and instruction-ordering guidance were consistent with the consulted documentation.

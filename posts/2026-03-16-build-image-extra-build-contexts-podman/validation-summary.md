# Validation Summary: How to Build an Image with Extra Build Contexts with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- Container image build contexts
- Container image references
- Alpine Linux, Go, Node.js, and Ubuntu base images

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Docker Build named contexts documentation: https://docs.docker.com/build/building/context/
- Dockerfile reference for `COPY --from`: https://docs.docker.com/reference/builder
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Go release policy and release history: https://go.dev/doc/devel/release
- Node.js release schedule: https://github.com/nodejs/Release
- Docker Official Image tag listings for Go and Node.js on Docker Hub: https://hub.docker.com/_/golang and https://hub.docker.com/_/node

## Issues Found
- The local directory example created `Containerfile` in the shell's current directory while building `/projects/myapp/`, which would only work if the command happened to be run from `/projects/myapp`. Changed the redirection to `/projects/myapp/Containerfile` so the file is placed in the main build context.
- The post described container image contexts as being prefixed with `docker-image://`. Podman accepts that alias, but its documentation uses `container-image://` as the primary container image transport for `--build-context`. Updated the explanation and examples to use `container-image://` while noting that `docker-image://` is also accepted.
- Several examples used older image tags: `alpine:3.19`, `golang:1.22`, `golang:1.22-alpine`, and `node:20-alpine`. Alpine 3.19 is past standard support, Go 1.22 is no longer supported under Go's release policy, and Node.js 20 reached EOL on 2026-04-30. Updated examples to `alpine:3.23`, `golang:1.26`, `golang:1.26-alpine`, and `node:24-alpine`.
- Updated the Ubuntu context example from `ubuntu:22.04` to `ubuntu:24.04` to keep the example on a newer LTS release.

## Review Notes
Podman is not installed in the local review environment, so commands could not be executed directly here. The CLI flag behavior, named context resolution order, and `COPY --from=<name>` usage were verified against current official Podman documentation.

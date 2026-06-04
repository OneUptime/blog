# Validation Summary: How to Speed Up Docker Build for Go Projects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Dockerfile syntax
- Docker BuildKit
- Docker Buildx
- Go
- Go modules
- Go build cache
- Multi-stage container builds
- Multi-platform container builds
- Distroless container images

## Sources Consulted
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Docker cache optimization and cache mounts documentation: https://docs.docker.com/build/cache/optimize/
- Dockerfile reference for `RUN --mount=type=cache`: https://docs.docker.com/reference/dockerfile/
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker multi-platform builds and Go cross-compilation documentation: https://docs.docker.com/build/building/multi-platform/
- Docker build variables documentation: https://docs.docker.com/build/building/variables/
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/concepts/context/
- Docker Buildx CLI documentation: https://docs.docker.com/reference/cli/docker/buildx/build/
- Go modules reference for module cache and vendoring behavior: https://go.dev/ref/mod
- Go cgo command documentation: https://go.dev/cmd/cgo/
- Go linker command documentation for `-s` and `-w`: https://go.dev/cmd/link/
- Go release history and support policy: https://go.dev/doc/devel/release
- Docker Hub Go official image tags: https://hub.docker.com/_/golang
- GoogleContainerTools distroless documentation: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The Dockerfile examples used `golang:1.22` and `golang:1.22-alpine`. Go 1.22 is outside Go's supported release window as of the validation date because Go supports each major release only until two newer major releases exist. Updated the examples to `golang:1.26-alpine`.
- The CGO example used the generic `golang:1.22` builder with `gcr.io/distroless/base-debian12`. Updated it to `golang:1.26-bookworm` so the Debian/glibc family remains aligned with the Debian 12 distroless runtime.
- The `.dockerignore` example listed `vendor` as a non-essential file. Go can use `vendor/` automatically for modules with `go 1.14` or later when the directory is present, and projects may explicitly build with `-mod=vendor`. Added a caveat to remove `vendor` only when the project is not building with vendored modules.

## Review Notes
The BuildKit cache mount examples, multi-stage build examples, `scratch` usage for `CGO_ENABLED=0` binaries, `-ldflags="-s -w"`, Buildx `--platform`, and `TARGETOS`/`TARGETARCH` cross-compilation pattern are consistent with current official documentation. The exact build-time numbers are illustrative and will vary by dependency graph, builder cache state, CPU, network, and registry/cache configuration.

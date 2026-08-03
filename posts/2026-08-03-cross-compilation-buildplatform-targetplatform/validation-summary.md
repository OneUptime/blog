# Validation Summary: Docker Cross-Compilation with `$BUILDPLATFORM` and `$TARGETPLATFORM`

## Status

validated

## Post Type

Technical tutorial and guide

## Technologies Covered

- Docker
- Docker Buildx
- BuildKit
- Multi-platform and multi-stage container builds
- Dockerfile automatic platform arguments (`BUILDPLATFORM`, `TARGETPLATFORM`, `TARGETOS`, `TARGETARCH`, and `TARGETVARIANT`)
- OCI image indexes and platform-specific manifests
- Go 1.25 cross-compilation
- Go architecture variants and `GOARM`
- cgo, native compilation, and QEMU emulation considerations

## Sources Consulted

- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile reference: automatic platform arguments](https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope)
- [Dockerfile reference: `FROM --platform`, cache mounts, and `COPY --chmod`](https://docs.docker.com/reference/dockerfile/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Buildx inspect CLI reference](https://docs.docker.com/reference/cli/docker/buildx/inspect/)
- [Docker Buildx imagetools inspect CLI reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker RedundantTargetPlatform build check](https://docs.docker.com/reference/build-checks/redundant-target-platform/)
- [Docker local and tar exporters](https://docs.docker.com/build/exporters/local-tar/)
- [Docker containerd image store](https://docs.docker.com/desktop/features/containerd/)
- [Official Go command and environment-variable reference](https://pkg.go.dev/cmd/go#hdr-Environment_variables)
- [Official cgo command reference](https://pkg.go.dev/cmd/cgo)
- [Official Go on ARM reference](https://go.dev/wiki/GoArm)
- [Docker Official Image for Go](https://hub.docker.com/_/golang)

## Issues Found

No technical issues found.

## Review Notes

- The primary cross-compilation pattern was smoke-tested with Docker Engine 29.4.3 and Buildx 0.33.0. A native `linux/arm64` compiler stage successfully emitted a statically linked `linux/amd64` x86-64 executable.
- The `TARGETVARIANT` to `GOARM` mapping was also smoke-tested for `linux/arm/v7` and produced a statically linked 32-bit ARM EABI5 executable.
- The `golang:1.25-bookworm` tag exists and provides both `linux/amd64` and `linux/arm64` images. It is a floating Go 1.25 patch-level tag, so its exact patch release can change between builds.
- Multi-platform builds still require a builder and image store/exporter combination that supports multi-platform results. The post correctly recommends registry push or one-platform-at-a-time loading when the local store cannot load an image index.

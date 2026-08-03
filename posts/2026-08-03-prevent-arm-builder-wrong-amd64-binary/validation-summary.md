# Validation Summary: Prevent ARM Builders from Shipping the Wrong AMD64 Runtime Binary

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Docker and Docker Engine
- Docker Buildx and BuildKit
- Multi-platform container images
- ARM64 and AMD64 architectures
- Go 1.25 cross-compilation
- QEMU emulation
- ELF binaries
- GNU binutils (`readelf`)

## Sources Consulted

- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile reference: `FROM`, automatic platform arguments, and `COPY --chmod`](https://docs.docker.com/reference/dockerfile/)
- [Docker Buildx build reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Buildx imagetools inspect reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Docker image inspect reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker container create reference](https://docs.docker.com/reference/cli/docker/container/create/)
- [Docker container cp reference](https://docs.docker.com/reference/cli/docker/container/cp/)
- [Docker container run reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Go command documentation](https://go.dev/cmd/go/)
- [Go cgo documentation](https://go.dev/cmd/cgo/)
- [Go source installation and cross-compilation documentation](https://go.dev/doc/install/source)
- [GNU Binary Utilities: `readelf`](https://sourceware.org/binutils/docs/binutils/readelf.html)
- [OCI Image Manifest Specification](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md)
- [Linux kernel `binfmt_misc` documentation](https://www.kernel.org/doc/html/next/admin-guide/binfmt-misc.html)

## Issues Found

- The runtime-library caveat implied that every cgo build is dynamically linked. Cgo can also be used with a suitable static toolchain, so the sentence now conditions the loader and library requirement on whether enabling cgo or another feature actually produces a dynamically linked binary.
- The post said that both `docker image inspect` and `docker buildx imagetools inspect` verify manifest metadata. A locally inspected image exposes image configuration/platform information, while `imagetools inspect` shows registry manifest or image-index details. Changed the sentence to say that the commands verify "image or manifest platform metadata."
- The post said that a manifest routes an image to a node. Image platform metadata identifies the intended platform and enables a container runtime to select a matching image variant; it does not perform node scheduling. Reworded this explanation to describe the runtime-facing role accurately.

## Review Notes

- The `golang:1.25-bookworm` official image tag exists and provides both `linux/amd64` and `linux/arm64` variants. It is a floating patch-version tag; digest pinning would be appropriate where fully reproducible builds are required.
- Local fixture checks with Go 1.25 confirmed that `CGO_ENABLED=0 GOOS=linux GOARCH=amd64` and `GOARCH=arm64` produce statically linked ELF binaries. GNU `readelf --file-header` reported `Advanced Micro Devices X86-64` and `AArch64`, matching the Dockerfile assertion exactly. An end-to-end `linux/amd64` Buildx build on an ARM64 worker also passed the in-build assertion and exported an x86-64 `/service` with mode `0555`.
- The documented Docker commands and flags are current. The host-side payload inspection requires `file` and GNU `readelf` to be installed, and the smoke-test argument should be adapted if the application does not implement `--version`.

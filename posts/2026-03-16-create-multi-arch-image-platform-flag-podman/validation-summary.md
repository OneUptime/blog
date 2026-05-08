# Validation Summary: How to Create a Multi-Arch Image with --platform Flag in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Buildah-based container builds
- Containerfile/Dockerfile syntax
- Multi-architecture container images
- OCI/Docker manifest lists
- QEMU/binfmt emulation
- Go cross-compilation
- Alpine Linux container images

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman manifest` documentation: https://docs.podman.io/en/v4.4/markdown/podman-manifest.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Buildah source and conformance tests for built-in platform args: https://github.com/containers/buildah
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The post used `alpine:3.19`, which is past Alpine's published support window as of the validation date. Updated examples to `alpine:3.23`.
- The Go builder example used `golang:1.22-alpine`, but Go 1.22 is no longer a supported Go release. Updated it to `golang:1.26-alpine`.
- The Go multi-stage example was not self-contained and would fail in an empty demo directory because there was no Go module or source file. Added minimal `go mod init` and `main.go` setup before writing the Containerfile.
- The article described single-machine non-native builds without mentioning the required ability to execute non-native `RUN` instructions. Added a concise note that QEMU/binfmt-style emulation is needed for non-native architectures when `RUN` instructions are present.
- The automatic build argument list omitted `BUILDVARIANT`. Added it to match the built-in platform argument set.
- The intro described the workflow as the "fastest path"; that is not generally true when emulation is involved. Changed it to "most concise path."

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was validated against official Podman documentation and Buildah source/tests rather than local `--help` output.

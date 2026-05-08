# Validation Summary: How to Build Multi-Architecture Images with podman build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Buildah image builds
- Containerfile/Dockerfile syntax
- OCI image manifests and manifest lists
- Multi-architecture container images
- Go cross-compilation
- QEMU user-mode emulation

## Sources Consulted
- Podman official documentation: `podman build` man page, including `--platform`, `--manifest`, `--jobs`, and `--no-cache`: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman official documentation: `podman manifest inspect` man page: https://docs.podman.io/en/latest/markdown/podman-manifest-inspect.1.html
- Podman official documentation: `podman manifest push` man page: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Buildah official source and documentation, used because Podman builds use Buildah code: https://github.com/containers/buildah
- Go official documentation: valid `GOOS`/`GOARCH` platform names: https://go.dev/doc/install/source#environment

## Issues Found
- The post said Podman automatically provides `BUILDPLATFORM`. Buildah/Podman sets target-platform build args such as `TARGETPLATFORM`, `TARGETOS`, `TARGETARCH`, and `TARGETVARIANT`, but the reviewed Buildah source does not set `BUILDPLATFORM`. I removed `BUILDPLATFORM` from the automatic-build-argument example and changed the Go examples to pass it explicitly with `--build-arg`.
- The Go cross-compilation Containerfile used `FROM --platform=$BUILDPLATFORM` without declaring `ARG BUILDPLATFORM` before the first `FROM`. I added the global `ARG BUILDPLATFORM` declaration so the value passed by `--build-arg` is available in the `FROM` instruction.
- The automatic build-argument example used `TARGETPLATFORM` in `CMD`, but `ARG` values are build-time values and are not persisted as runtime environment variables. I changed the runtime command to use `uname -m`.
- The performance tips suggested running two concurrent `podman build --manifest myapp:latest` commands against the same manifest. That can race on shared local manifest state. I replaced it with the documented `--jobs=2` option on a single multi-platform build invocation.

## Review Notes
- The main `podman build --platform linux/amd64,linux/arm64 --manifest ...` workflow is supported by the current Podman documentation. The docs also note that non-native `RUN` instructions require emulation such as `qemu-user-static` unless the build is structured to avoid executing target-architecture binaries.
- The examples use Alpine 3.19 and Go 1.22 images. They remain valid as examples, but future updates could refresh those base image versions.

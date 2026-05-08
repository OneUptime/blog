# Validation Summary: How to Build an Image for a Specific Platform with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Buildah-backed container image builds
- Containerfiles
- OCI/Docker manifest lists
- QEMU user-space emulation
- Go cross-compilation

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman manifest create` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-create.1.html
- Podman `podman manifest add` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-add.1.html
- Podman `podman manifest push` documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman multi-architecture manifest article: https://podman.io/blogs/2021/10/11/multiarch
- Buildah source for automatic target-platform build args: https://github.com/containers/buildah
- Docker Build variables documentation, used only to distinguish Docker BuildKit build-platform args from Podman/Buildah target args: https://docs.docker.com/build/building/variables/

## Issues Found
- The manual manifest example added locally built images without an explicit transport. Podman manifest documentation treats `docker://` as the default transport, while local images should be referenced with the `containers-storage:` transport. Updated the commands to use `containers-storage:localhost/myapp:amd64` and `containers-storage:localhost/myapp:arm64`.
- Manifest push examples omitted `--all`. Current Podman documents `--all` as default true, but older official guidance and examples use `podman manifest push --all` to ensure all referenced images are pushed with the manifest list. Added `--all` to the push commands.
- The automatic platform variables section listed Docker BuildKit build-platform args (`BUILDPLATFORM`, `BUILDOS`, `BUILDARCH`) as Podman-provided args. Buildah/Podman automatically provide target-platform args (`TARGETPLATFORM`, `TARGETOS`, `TARGETARCH`, `TARGETVARIANT`) when platform information is selected. Removed the unsupported build-platform args from the Podman example.

## Review Notes
Podman was not installed in the local workspace, so command behavior was verified against the current official Podman documentation and Buildah source rather than local `podman --help` output. The examples still assume QEMU/binfmt support is installed and active for non-native `RUN` instructions, which matches the Podman and Buildah documentation.

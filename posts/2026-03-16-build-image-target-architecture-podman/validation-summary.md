# Validation Summary: How to Build an Image with Target Architecture with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile syntax
- QEMU user-mode emulation
- binfmt_misc
- Multi-architecture container image builds
- Go cross-compilation

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman/containers `Containerfile(5)` documentation: https://github.com/containers/common/blob/main/docs/Containerfile.5.md
- Docker Dockerfile reference for comparison of platform ARG behavior: https://docs.docker.com/reference/dockerfile/
- Docker build variables documentation for comparison of platform ARG naming and scope: https://docs.docker.com/build/building/variables/

## Issues Found
- The architecture-specific base image example said to use an architecture-specific digest, but the example used a tag with `FROM --platform=linux/arm64`, not a digest. Changed the wording to say it pins the base image platform in the Containerfile.
- The post implied `TARGETARCH` and `TARGETOS` are automatically available without qualification. Podman's Containerfile documentation says platform ARG values must be declared within each `FROM` section where they are used. Updated the wording and added a note to declare the needed ARG values per stage.
- The performance example uses `BUILDPLATFORM`, but the platform build argument list omitted the `BUILD...` variables. Added `BUILDPLATFORM`, `BUILDOS`, `BUILDARCH`, and `BUILDVARIANT`.

## Review Notes
Podman was not installed in the local workspace, so commands were reviewed against current official Podman and Containerfile documentation rather than executed locally. The examples are otherwise consistent with Podman's documented `--platform` behavior and QEMU/binfmt_misc requirement for foreign-architecture `RUN` instructions.

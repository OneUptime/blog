# Validation Summary: How to Pull an Image for a Specific Platform with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Skopeo
- OCI container images and image indexes
- Multi-architecture container image manifests
- Containerfile builds

## Sources Consulted
- Podman pull official documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman build official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman info official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman inspect / image inspect official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html and https://docs.podman.io/en/v5.2.1/markdown/podman-image-inspect.1.html
- Podman images official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman manifest add official documentation: https://docs.podman.io/en/v5.1.2/markdown/podman-manifest-add.1.html
- Podman global command and environment variable documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- containers.conf official source documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- OCI Image Specification: https://specs.opencontainers.org/image-spec/

## Issues Found
- The ARM v6 and ARM v7 pull examples used Docker-style `linux/arm/v6` and `linux/arm/v7` platform strings. Podman's pull documentation defines `--platform` as `OS/ARCH` and provides `--variant` separately for ARM variants, so those commands were changed to `--platform linux/arm --variant v6` and `--platform linux/arm --variant v7`.
- The multiple-platform listing example said `podman images` would show both platforms, but the documented `podman images --format` placeholders do not include architecture. The comment was changed to say the command lists image IDs and that each ID can be inspected to verify architecture.
- The default platform section used `CONTAINERS_PLATFORM`, which is not documented by Podman or containers.conf as a supported default-platform environment variable. The section was changed to a shell helper that consistently passes `--platform linux/arm64`.

## Review Notes
Podman was not installed in the local workspace, so command validation was performed against official Podman documentation and containers/common source documentation rather than local `--help` output. The post uses older but plausible example image tags such as `nginx:1.25`, `alpine:3.19`, `ubuntu:22.04`, and `golang:1.22`; these are acceptable as examples, though future updates could use more current image tags.

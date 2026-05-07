# Validation Summary: How to Use FROM Instruction Effectively in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfile syntax
- Base images and image pinning
- Multi-stage builds
- Multi-architecture image builds
- Alpine Linux
- Distroless images

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman history documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Dockerfile reference for `FROM`, `ARG`, and `COPY --from`: https://docs.docker.com/reference/dockerfile
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Go release history: https://go.dev/doc/devel/release
- Rust 1.95.0 release announcement: https://blog.rust-lang.org/2026/04/16/Rust-1.95.0/
- Distroless image catalog and support notes: https://github.com/GoogleContainerTools/distroless
- Fedora 42 package reference: https://packages.fedoraproject.org/pkgs/fedora-release/fedora-release/fedora-42.html

## Issues Found
- The opening explanation said every Containerfile starts with `FROM`, which is not strictly true because global `ARG` may appear before the first `FROM`. I corrected the wording to match the documented behavior.
- The digest lookup example used `podman inspect` without first ensuring the image was local. I changed it to `podman pull` plus `podman image inspect --format '{{ .Digest }}'`, and kept `podman images --digests` as the local listing alternative.
- The multi-platform build command used `-t` with multiple `--platform` values. Podman requires `--manifest` for multi-platform builds, so I corrected the command and added the emulation caveat for non-native `RUN` steps.
- Several example base image tags were outdated or unsupported as of May 7, 2026. I refreshed the examples to current supported lines, including Alpine 3.23, Node 24, Go 1.26, Rust 1.95, Fedora 42, and current Distroless Debian 13 tags.
- The external-image `COPY --from` example copied an nginx binary and config into Alpine, which was a less reliable illustration. I replaced it with a simpler valid config-file copy example.
- Exact image size comments were removed because those figures drift over time and were not stable enough to present as fixed guidance. I also corrected the misleading "completely different base" label in the build-arg example.

## Review Notes
- Podman was not installed in the review environment, so command verification was done against official Podman and Dockerfile documentation rather than local CLI execution.
- Image tags and distribution branches age quickly; examples in posts about base-image selection should be periodically revalidated for end-of-life runtimes and deprecated Distroless tags.

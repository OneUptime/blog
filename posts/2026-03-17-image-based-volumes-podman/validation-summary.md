# Validation Summary: How to Use Image-Based Volumes with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile image builds
- Podman image mounts
- Container volumes and pods

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman Quadlet/systemd unit documentation for image mount semantics: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html

## Issues Found
- Several examples said they mounted the image's `/data` or `/assets` directory, but `--mount type=image` mounts the whole image root unless `subpath` is specified. Added `subpath=/data` or `subpath=/assets` where needed so the commands match the surrounding explanation.
- The read-only image mount example used `readonly`, but current Podman documentation lists `rw`/`readwrite` as the image-specific mutability option. Changed the explicit read-only example to `rw=false`.
- The read-only and read-write examples mounted to `/config` from an image that only populated `/data` and `/assets`. Added `subpath=/data` so the examples mount the intended configuration data rather than the image root filesystem.

## Review Notes
Podman was not installed in the local workspace, so commands were verified against official documentation rather than executed locally. The `subpath` option for image mounts is documented in current Podman releases; users on older Podman versions should confirm their installed version supports it.

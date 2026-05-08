# Validation Summary: How to Build an Image with Squash Layers with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containerfile/Dockerfile image builds
- Container image layers
- Multi-stage builds
- Linux package managers (`apk`, `apt`)

## Sources Consulted
- Podman `podman build` official documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman `podman image inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman history` official documentation: https://docs.podman.io/en/stable/markdown/podman-history.1.html
- Docker official storage driver and image layer documentation: https://docs.docker.com/engine/storage/drivers/

## Issues Found
- The post said each Containerfile instruction creates a new layer. Official Docker image-layer documentation distinguishes filesystem-changing instructions from metadata-only instructions such as `CMD` and `LABEL`, so I changed the wording to specify filesystem-changing instructions such as `RUN`, `COPY`, and `ADD`.
- The layer-count example used `podman inspect ... | grep -c '"sha256:'`, which can count image IDs, digests, repo digests, and other sha256 values in addition to root filesystem layers. I replaced it with `podman image inspect --format '{{len .RootFS.Layers}}' ...`, which directly counts the root filesystem layers.

## Review Notes
Podman was not installed in the review environment, so commands could not be executed locally. The CLI options and command forms were checked against official Podman documentation instead. The `--squash` and `--squash-all` descriptions match current Podman documentation.

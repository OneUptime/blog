# Validation Summary: How to Use VOLUME Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfile syntax
- Container volumes and bind mounts
- tmpfs mounts
- SELinux volume labeling
- Rootless containers and user namespaces

## Sources Consulted
- Podman `podman build` man page: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman run` man page: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--volume` option reference: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `--mount` option reference: https://docs.podman.io/en/v4.4/markdown/options/mount.html
- Podman `podman volume create` man page: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `podman volume export` man page: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman `podman volume import` man page: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman `podman volume prune` man page: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `podman rm` man page: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile
- PostgreSQL Official Image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The introduction incorrectly said data disappears when a container stops. I changed this to reflect Podman/container behavior more accurately: data in the writable layer persists while the container exists and is lost when the container is removed.
- The introduction also implied that `VOLUME` by itself guarantees persistence across removals. I corrected this to explain that the data lives outside the writable layer only when the volume itself is preserved and reused.
- The explanation of image-defined volumes was too absolute. I updated it to match Podman’s documented default `--image-volume=bind` behavior and clarified that the path can still be overridden at runtime.
- The `Data Initialization` section was too broad. I narrowed it to newly created Podman-managed volumes and noted that copying existing image data happens by default.
- The `Instructions After VOLUME` section was outdated for current Podman. Podman now keeps later `RUN` changes in `VOLUME` paths by default; only `podman build --compat-volumes` restores the older behavior where those `RUN` changes are reverted. I corrected that section, the matching “Common Mistakes” example, and the conclusion.

## Review Notes
- No local `podman` binary was available in this workspace, so the review was validated against official documentation rather than live CLI execution.
- The image tags used in examples were not changed. They remain reasonable examples, but exact upstream image contents can evolve over time.

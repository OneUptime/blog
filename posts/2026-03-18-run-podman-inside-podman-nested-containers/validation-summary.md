# Validation Summary: How to Run Podman Inside Podman (Nested Containers)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Nested containers
- Rootless containers
- fuse-overlayfs
- containers-storage.conf
- containers-registries.conf
- systemd
- Python subprocess scripting

## Sources Consulted
- Podman-in-Podman guidance from Red Hat: https://www.redhat.com/es/blog/podman-inside-container
- Podman rootless mode and storage notes: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Podman run options, including `--device`, `--privileged`, `--systemd`, and volume `:U`: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- containers-storage.conf upstream reference: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md
- containers-registries.conf upstream reference: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md

## Issues Found
- The CI/CD Python example defaulted `IMAGE_NAME` to `myapp:latest`, then tagged the tested image as `{image_name}:tested`, which would produce an invalid reference like `myapp:latest:tested`. I changed the default to `myapp` so the demonstrated tag command produces `myapp:tested`.
- The persistent nested Podman storage volume examples mounted named volumes for a non-root `podman` user with only `:Z`. Podman documents the `:U` volume option for writable mounts used by non-root users inside containers, so I changed those mounts to `:Z,U`.
- The systemd example enabled `podman.socket` with `systemctl --user` inside a privileged rootful systemd container. That user manager is not what the example starts with `/sbin/init`, so I changed it to `systemctl enable --now podman.socket`.

## Review Notes
- The core rootless Podman-in-Podman command with `--security-opt label=disable`, `--user podman`, and `--device /dev/fuse` matches the documented Red Hat example for running rootless Podman inside rootless Podman.
- Rootless overlay behavior is kernel- and environment-dependent. The post's fuse-overlayfs guidance is appropriate for this nested-container setup, though modern rootless Podman can use native overlayfs on supported hosts outside this constrained environment.

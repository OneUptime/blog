# Validation Summary: How to Fix 'permission denied' Errors in Podman

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- SELinux volume labeling
- systemd user services
- Dockerfile file ownership

## Sources Consulted
- Podman rootless mode documentation: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman `--userns` / `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume option documentation for `:z`, `:Z`, and `:U`: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `podman unshare` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- Podman system service and socket documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman top` documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Podman `podman system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Containers/Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md

## Issues Found
- Corrected the rootless UID mapping explanation. The original wording implied the host user ID maps into a subordinate UID range inside the container. Podman rootless mode maps container root to the invoking host user by default and maps other container UIDs into subordinate UID/GID ranges.
- Corrected the storage ownership repair command. The original `podman unshare chown -R $(id -u):$(id -g) ...` could set ownership to the wrong namespace UID. The post now uses host-side `sudo chown -R $(id -u):$(id -g) ~/.local/share/containers/` for storage that was accidentally created or modified as root.
- Corrected the destructive reset guidance. The post now uses `podman system reset` directly and states that it removes containers, pods, images, networks, volumes, build cache, and machines for the user.
- Corrected the runtime-directory guidance for `su` and `sudo` sessions. The post no longer implies that manually exporting `XDG_RUNTIME_DIR` or using `sudo -i -u username` is enough to create a proper systemd user session.

## Review Notes
Local `podman` was not installed in the review environment, so CLI behavior was verified against upstream Podman documentation and the official containers/podman troubleshooting guide rather than local `--help` output.

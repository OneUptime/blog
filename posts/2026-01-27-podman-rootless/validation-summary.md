# Validation Summary: How to Run Rootless Containers with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Subordinate UID/GID ranges
- containers/storage storage.conf
- containers/image registries.conf
- cgroups v2 and systemd delegation
- Podman rootless networking with pasta and slirp4netns
- Podman Compose wrapper
- Podman Quadlet systemd integration
- Podman pods and health checks

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman CLI reference: https://docs.podman.io/en/stable/markdown/podman.1.html
- Podman run reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman user namespace option reference: https://docs.podman.io/en/v4.4/markdown/options/userns.container.html
- Podman unshare reference: https://docs.podman.io/en/latest/markdown/podman-unshare.1.html
- Podman network reference: https://docs.podman.io/en/v5.1.1/markdown/podman-network.1.html
- Podman Compose reference: https://docs.podman.io/en/v5.3.2/markdown/podman-compose.1.html
- Podman systemd / Quadlet reference: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Deprecated podman generate systemd reference: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- containers-storage.conf reference: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- Red Hat rootless privileged port guidance: https://access.redhat.com/solutions/7044059

## Issues Found
- Corrected the user namespace explanation and diagrams. The post said container UID 0 maps directly to the first subordinate UID, but Podman's default rootless namespace maps the invoking user's UID to UID 0 and maps subordinate IDs after that.
- Moved `mount_program = "/usr/bin/fuse-overlayfs"` into the `[storage.options.overlay]` table. The storage configuration reference defines `mount_program` as an overlay storage option, not a top-level `[storage.options]` key.
- Fixed a shell redirection bug in the systemd delegation example. `sudo cat > /etc/...` would run the redirection as the unprivileged shell user; the post now uses `tee` under sudo.
- Updated the rootless networking section. Current Podman documentation identifies pasta as the default rootless networking tool, with slirp4netns as an alternative.
- Clarified that `podman compose` is a wrapper around an external Compose provider, not built-in Compose functionality.
- Replaced the deprecated `podman generate systemd` production example with a Quadlet `.container` unit, matching current Podman guidance.
- Fixed the pod localhost test. The original `podman exec web curl localhost:6379` was unlikely to work because the nginx image does not include curl and Redis is not an HTTP service; the post now uses `redis-cli` in the Redis container.

## Review Notes
- Podman was not installed in the local review environment, so CLI behavior was verified against upstream Podman documentation instead of local `--help` output.
- The `kernel.unprivileged_userns_clone` sysctl is distribution-specific; it is relevant on Debian/Ubuntu-family systems, but may not exist on every Linux distribution.
- The post remains broadly accurate after correction. Future updates may want to mention that Quadlet requires cgroups v2 and that some rootless resource limits still depend on systemd delegation and distribution defaults.

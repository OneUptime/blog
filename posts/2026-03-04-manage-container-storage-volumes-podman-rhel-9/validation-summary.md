# Validation Summary: How to Manage Container Storage Volumes with Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Podman named volumes
- Bind mounts
- tmpfs mounts
- SELinux volume labeling
- Rootless containers and user namespaces
- NFS-backed Podman volumes

## Sources Consulted
- Podman `podman-run` manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-volume-create` manual: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `podman-volume-prune` manual: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `podman-system-df` manual: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Red Hat Enterprise Linux 9, Building, running, and managing containers: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/index
- Linux kernel tmpfs documentation: https://www.kernel.org/doc/html/v6.8/filesystems/tmpfs.html

## Issues Found
- The nginx bind-mount example mounted `/srv/webdata` without an SELinux label even though the post targets RHEL and later explains that unlabeled bind mounts are likely to fail under SELinux. Changed the mount from `:ro` to `:ro,Z`.
- The tmpfs section described tmpfs as staying in RAM and as suitable for sensitive data that should not be written to disk. Linux tmpfs can use swap, so the wording was changed to "memory-backed" and now notes the swap caveat.
- The NFS-backed volume example used `device=:/exports/data` with `addr=192.168.1.10` in mount options. Podman passes `device` as the mount device argument, so the example now uses `device=192.168.1.10:/exports/data` and keeps `rw` in the mount options.
- The backup examples used `/backup` as a bind mount without ensuring the host path exists or applying an SELinux label. Added `mkdir -p /backup` and labeled the backup bind mount with `:Z` / `:ro,Z`.
- The rootless `chown` example used `1000:1000` without clarifying that those IDs are container process IDs. Tightened the heading to specify a rootless container process running as UID/GID 1000.

## Review Notes
The remaining Podman commands and flags matched the official Podman documentation. Named volumes are not removed by `podman rm --volumes`; only anonymous volumes are, so the cleanup section's wording is correct.

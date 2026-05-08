# Validation Summary: How to Unmount a Container's Filesystem in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux container filesystems
- Podman rootless mode and user namespaces
- Linux process/mount diagnostics with lsof and fuser

## Sources Consulted
- Podman official documentation: podman-unmount - https://docs.podman.io/en/latest/markdown/podman-unmount.1.html
- Podman official documentation: podman-mount - https://docs.podman.io/en/latest/markdown/podman-mount.1.html
- Podman official documentation: podman-rm - https://docs.podman.io/en/latest/markdown/podman-rm.1.html

## Issues Found
- The post used `podman mount --notruncate`, but the current documented option is `--no-trunc`. Updated all examples to use `--no-trunc`.
- The post checked mounted containers by grepping for the container name in `podman mount` output. Official examples show `podman mount` list output as container ID plus mount path, so name-based checks may not work. Updated those examples to inspect the full container ID and grep for that ID.
- The busy-mount example called `podman mount my-app` twice before unmounting. Podman increments a mount counter each time a container is mounted, so a single later unmount may only decrement the counter rather than physically unmounting the filesystem. Removed the extra mount call.
- The commented busy-process simulation used `cat`, which exits immediately and does not keep the mount busy. Changed it to `tail -f` so the example represents a process keeping a file open.
- The common-errors `lsof` example used `podman mount my-app` inside command substitution, which could increment the mount counter while only trying to discover the mount path. Updated it to read the current mounted-container list with `podman mount --no-trunc`.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against current official Podman documentation rather than local `--help` output. The documented `podman unmount` / `podman umount` aliases, `--all`, `--force`, and rootless `podman unshare podman mount` guidance are consistent with the official Podman documentation.

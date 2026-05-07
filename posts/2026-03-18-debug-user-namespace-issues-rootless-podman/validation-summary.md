# Validation Summary: How to Debug User Namespace Issues in Rootless Podman

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Subordinate UID/GID mapping with `/etc/subuid` and `/etc/subgid`
- `newuidmap` and `newgidmap`
- Linux `sysctl` namespace settings
- Podman storage configuration

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Podman `system migrate` documentation: https://docs.podman.io/en/v3.2.2/markdown/podman-system-migrate.1.html
- Podman `system renumber` documentation: https://docs.podman.io/en/stable/markdown/podman-system-renumber.1.html
- Podman `info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman user namespace option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Linux `user_namespaces(7)` manual: https://man7.org/linux/man-pages/man7/user_namespaces.7.html
- Linux `newuidmap(1)` manual: https://man7.org/linux/man-pages/man1/newuidmap.1.html
- `containers-storage.conf(5)` manual: https://manpages.debian.org/bullseye/containers-storage/containers-storage.conf.5.en.html

## Issues Found
- The sample UID map described `100000:65536` as ending at host UID `165536`. A range of 65,536 IDs starting at 100,000 ends at `165535`, so the example was corrected.
- The "stale lock files" recovery advice manually deleted `~/.local/share/containers/storage/libpod/`. That directory contains Podman's libpod storage metadata, and the official command for lock numbering changes is `podman system renumber`, so the command was replaced.
- The diagnostics text said to check `containers.conf` but showed `storage.conf` paths. The label was corrected to `storage.conf`.
- The storage configuration grep searched for `idmap`, but documented storage mapping keys are `remap-uids`, `remap-gids`, `remap-user`, and `remap-group`. The grep pattern was changed to `remap`.

## Review Notes
Podman was not installed in the local environment, so Podman-specific command behavior was verified against official Podman documentation rather than local `--help` output. The `usermod --add-subuids` and `--add-subgids` flags were verified locally.

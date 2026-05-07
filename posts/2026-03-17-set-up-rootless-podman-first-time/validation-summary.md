# Validation Summary: How to Set Up Rootless Podman for the First Time

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Subordinate UID/GID mappings
- containers/storage storage.conf
- systemd loginctl lingering

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman command reference and rootless mode notes: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- podman-system-migrate documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- podman-unshare documentation: https://docs.podman.io/en/latest/markdown/podman-unshare.1.html
- podman-info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers-storage.conf documentation: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- loginctl manual page: https://man7.org/linux/man-pages/man1/loginctl.1.html
- usermod manual page: https://man7.org/linux/man-pages/man8/usermod.8.html

## Issues Found
- The post described rootless Podman as running without "any root privileges" and said a container escape "cannot gain root access." This was too absolute, so the wording was changed to say Podman is not run as root and that rootless mode reduces the risk because an escape does not automatically gain host root access.
- The user namespace sysctl check was presented as universal. `kernel.unprivileged_userns_clone` is especially relevant on Debian/Ubuntu and may not exist on every distribution, so the check was guarded with a file existence test and labeled for Debian/Ubuntu.
- The installation examples omitted current rootless networking support packages. `passt` was added to the distribution install commands, and `uidmap` was added for Debian/Ubuntu because subordinate ID mapping helpers are required for rootless operation.
- The storage section said to customize `containers.conf` while writing `storage.conf`. The comment was corrected to `storage.conf`.
- The storage example used a single-quoted heredoc with `"/home/$USER/..."`, which would leave a literal `$USER` in the config. It was changed to `"$HOME/.local/share/containers/storage"`, which is supported by containers/storage environment variable substitution.
- The summary claimed all Podman commands can be run as the regular user. This was softened to "Podman commands" because some administrative host changes still require root.

## Review Notes
The core tutorial flow is valid for a Linux host: install Podman, ensure user namespace support, configure `/etc/subuid` and `/etc/subgid`, run `podman system migrate` after mapping changes, verify rootless mode with `podman info`, and optionally enable lingering for user-managed background containers. Future improvements could add distro-specific caveats for SELinux labeling when moving storage and for rootless networking behavior across Podman versions.

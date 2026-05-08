# Validation Summary: How to Install Podman on Debian

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Podman
- Debian package management with APT
- Rootless containers
- containers registries configuration
- systemd user sockets
- PostgreSQL container image

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman main manual page: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman system service manual page: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman run manual page: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman network create manual page: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Debian package search for podman: https://packages.debian.org/podman
- Debian bullseye podman package details: https://packages.debian.org/bullseye/podman
- Debian bookworm podman package details: https://packages.debian.org/bookworm/podman
- Debian trixie podman package details: https://packages.debian.org/trixie/podman

## Issues Found
- The introduction said Podman requires no root access, which was too broad because installation and system-wide configuration require sudo/root. Changed it to say Podman supports running containers without root access.
- The dependency description implied `slirp4netns` is always installed as an essential component. Debian package metadata shows dependencies and recommendations vary by release, with `slirp4netns` and `uidmap` recommended rather than universal hard dependencies. Updated the wording to reflect release-specific package behavior.
- The Debian 11 backports instructions claimed `bullseye-backports` could install a newer Podman package. Current Debian package listings do not show a newer `podman` package in `bullseye-backports`. Replaced the instructions with a version note and `apt-cache policy podman` check.
- The registry drop-in filename was named `shortnames.conf` even though it configured unqualified search registries, not short-name aliases. Renamed it to `unqualified-search-registries.conf` and used standard TOML double-quoted strings.
- The `/etc/subuid` and `/etc/subgid` checks used an unquoted, unanchored `grep $(whoami)`, which can match partial names or break on unusual usernames. Changed the examples to `grep "^$(id -un):"` and quoted `id -un` in the `usermod` commands.

## Review Notes
The remaining commands and explanations are technically valid for a Debian system using Podman from official repositories. The Docker-compatible socket guidance matches Podman's documented systemd user socket path and `DOCKER_HOST` usage. The DNS troubleshooting command is plausible, but future revisions could mention that not all Debian installations use `systemd-resolved`.

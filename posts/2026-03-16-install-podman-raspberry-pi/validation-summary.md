# Validation Summary: How to Install Podman on Raspberry Pi

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Raspberry Pi OS
- Debian package management
- Rootless Linux containers
- containers/storage storage.conf
- systemd user services
- ARM container images

## Sources Consulted
- Official Podman installation instructions: https://podman.io/docs/installation
- Podman run manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman generate systemd manual: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet/systemd unit manual: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Debian package metadata for Podman on Bookworm armhf: https://packages.debian.org/bookworm/armhf/podman
- Debian package search results for Podman on Bullseye: https://packages.debian.org/podman
- Debian Backports notice for Bullseye backports discontinuation: https://backports.debian.org/news/bullseye_backports_discontinued/
- Debian containers-storage.conf manual: https://manpages.debian.org/testing/containers-storage/containers-storage.conf.5.en.html
- Local shadow-utils usermod help output for --add-subuids and --add-subgids

## Issues Found
- The Bullseye backports instructions used `bullseye-backports`, which is discontinued and no longer a reliable live repository. Removed the backports commands and added guidance to upgrade to Raspberry Pi OS Bookworm or later for newer Podman packages.
- The storage section described `vfs` as beneficial for SD cards. Updated the guidance to prefer `overlay` with `fuse-overlayfs` for rootless containers and describe `vfs` as a slower, disk-heavy fallback.
- The external SSD storage example set `runroot` on the SSD. Removed that line because `runroot` is runtime state; redirecting persistent container storage only needs `graphroot` in this example. Added commands to create and hand ownership of the SSD storage directory to the user.
- The auto-start example generated a systemd unit for `pi-web` after the earlier example had removed that container. Added a `podman create` command so the `podman generate systemd --new --name pi-web` command has an existing container configuration to use as its template.

## Review Notes
The `podman generate systemd` command is deprecated in current upstream Podman 5 documentation in favor of Quadlet, but it remains available and matches the Debian 11/12 Podman versions targeted by this post. A future update for Raspberry Pi OS releases based on newer Debian versions should consider switching the auto-start example to Quadlet.

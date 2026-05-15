# Validation Summary: How to Install Podman Desktop on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- Podman Desktop
- Red Hat build of Podman Desktop
- Flatpak and Flathub
- systemd user services
- Rootless containers and subordinate UID/GID mappings

## Sources Consulted
- Podman Desktop Linux installation documentation: https://podman-desktop.io/docs/installation/linux-install
- Podman Desktop RHEL 10 installation documentation: https://podman-desktop.io/docs/installation/linux-install/install-on-rhel10
- Red Hat build of Podman Desktop 1.0 RHEL installation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_podman_desktop/1.0/html/install_on_linux/proc_install-on-rhel_install-on-linux
- Red Hat Enterprise Linux container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/enabling-the-podman-api-using-systemd-in-rootless-mode_using-the-container-tools-api
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- GitHub releases API for Podman Desktop latest release assets: https://api.github.com/repos/podman-desktop/podman-desktop/releases/latest
- Local `usermod` man page for `--add-subuids` and `--add-subgids`

## Issues Found
- The Flatpak instructions omitted upstream's documented `--user` install scope and used the older `dl.flathub.org` remote URL. Updated the remote, install, and update commands to match current Podman Desktop documentation.
- The RPM instructions pointed to `https://github.com/podman-desktop/podman-desktop/releases/latest/download/podman-desktop.x86_64.rpm`, which currently resolves to a 404 because the latest upstream release does not publish that RPM asset. Replaced this with the current RHEL 10 Red Hat RPM path using the extensions repository and `rh-podman-desktop` package.
- The RPM update command used `podman-desktop`, but the current Red Hat package name is `rh-podman-desktop`. Updated the command accordingly.
- The custom desktop-entry instructions implied they applied to the RPM installation. Updated the wording so the `Exec=podman-desktop` example is scoped to standalone builds where that executable is on `PATH`.
- The rootless subordinate ID instructions changed `/etc/subuid` and `/etc/subgid` but did not apply the changes to existing Podman state. Added `podman system migrate`, which Red Hat documents as required after subordinate ID changes.

## Review Notes
- The post is technically valid after the corrections. The Flatpak path uses Flathub, a third-party remote; RHEL administrators should consider organizational support policy before using it on managed systems.

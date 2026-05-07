# Validation Summary: How to Install Podman Desktop on Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Podman Desktop
- Linux package managers: APT, DNF, pacman
- Flatpak and Flathub
- Rootless containers
- containers registries configuration

## Sources Consulted
- Podman Desktop official Linux installation documentation: https://podman-desktop.io/docs/installation/linux-install
- Podman Desktop official Linux downloads page: https://podman-desktop.io/downloads/linux
- Podman Desktop official Flatpak bundle documentation: https://podman-desktop.io/docs/installation/linux-install/installing-podman-desktop-from-a-flatpak-bundle
- Podman Desktop official RHEL 10 installation documentation: https://podman-desktop.io/docs/installation/linux-install/install-on-rhel10
- Podman Desktop official Linux troubleshooting documentation: https://podman-desktop.io/docs/troubleshooting/troubleshooting-podman-on-linux
- Podman official installation instructions: https://podman.io/docs/installation
- Podman official rootless mode documentation: https://docs.podman.io/en/stable/markdown/podman.1.html
- Podman official system migrate documentation: https://docs.podman.io/en/stable/markdown/podman-system-migrate.1.html
- Podman official info command documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- containers-registries.conf manual page: https://www.mankier.com/5/containers-registries.conf
- GitHub release assets for podman-desktop/podman-desktop: https://github.com/podman-desktop/podman-desktop/releases

## Issues Found
- The post listed AppImage as a Linux install method, but current official Podman Desktop Linux downloads provide Flatpak and tar.gz assets, not AppImage. Changed this method to the officially documented Flatpak bundle flow.
- The post listed Fedora RPM and Ubuntu/Debian DEB package methods for Podman Desktop, but current official documentation documents Flathub, Flatpak bundle, compressed tar file, and RHEL 10 DNF installation. Replaced those sections with compressed tar file and RHEL 10 DNF instructions.
- The Flatpak commands omitted the `--user` scope used in the official Podman Desktop documentation. Updated Flathub setup, installation, and update commands to use `--user`.
- The Fedora Podman engine command used `dnf update podman`, which does not install Podman when missing. Changed it to `dnf install -y podman`.
- The requirements pinned Podman 4.x/5.x without matching current official Podman Desktop Linux docs. Changed this to require a stable Podman version.
- The rootless wording implied all Podman on Linux defaults to rootless mode. Clarified that Podman is rootless when run as a regular user.
- The summary still referenced AppImage, Fedora native packages, and Ubuntu native packages. Updated it to match the corrected installation methods.

## Review Notes
The post is technically relevant and valid after correction. Future maintenance should re-check Podman Desktop release assets because Linux packaging options have changed over time.

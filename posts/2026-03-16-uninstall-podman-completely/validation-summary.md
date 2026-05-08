# Validation Summary: How to Uninstall Podman Completely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux package managers: DNF, APT, Pacman, Zypper, APK
- systemd user and system services
- Linux container storage and configuration paths
- macOS Homebrew
- Windows Package Manager winget

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman `system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `stop`, `rm`, and `rmi` command documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html, https://docs.podman.io/en/latest/markdown/podman-rm.1.html, https://docs.podman.io/en/v4.4/markdown/podman-rmi.1.html
- Podman volume and network removal documentation: https://docs.podman.io/en/v4.3/markdown/podman-volume-rm.1.html, https://docs.podman.io/en/v4.3/markdown/podman-network-prune.1.html
- Podman machine stop and remove documentation: https://docs.podman.io/en/latest/markdown/podman-machine-stop.1.html, https://docs.podman.io/en/latest/markdown/podman-machine-rm.1.html
- Podman generated systemd unit documentation: https://docs.podman.io/en/v4.4/markdown/podman-generate-systemd.1.html
- Podman storage path documentation: https://docs.podman.io/en/v4.0.0/markdown/podman.1.html
- Microsoft winget uninstall documentation: https://learn.microsoft.com/en-us/windows/package-manager/winget/uninstall
- Local command help output for `apt`, `systemctl`, and GNU `sed`

## Issues Found
- The generated systemd unit cleanup only removed `container-*.service` files from the user systemd directory. Podman-generated units can also include `pod-*.service`, and generated units may be installed in `/etc/systemd/system`; added cleanup for both user and system-level container and pod service files, followed by user and system daemon reloads.
- The Debian / Ubuntu purge command only purged `podman` after removing related packages. Updated it to purge `podman`, `podman-docker`, `buildah`, and `skopeo` so package configuration cleanup matches the stated intent.
- The Windows winget uninstall example used a bare query. Updated it to `winget uninstall --id RedHat.Podman --exact`, matching winget's documented exact ID filtering behavior.
- The Fedora cleanup script disabled only `podman.socket`. Added `podman.service` stop and disable commands for both user and system systemd managers to match the main guide.

## Review Notes
The destructive cleanup commands are technically valid for a complete removal, but they also remove shared container configuration and storage used by related tools such as Buildah and Skopeo. Users should review paths such as `/etc/containers`, `/var/lib/containers`, and `~/.local/share/containers` before running the commands on systems that use other containers/storage-based tools.

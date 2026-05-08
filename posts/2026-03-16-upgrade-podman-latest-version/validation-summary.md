# Validation Summary: How to Upgrade Podman to the Latest Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Linux package managers: dnf, apt, pacman, zypper
- Homebrew
- Windows Package Manager
- Debian Backports
- Podman storage migration and network backends

## Sources Consulted
- Podman Installation Instructions: https://podman.io/docs/installation
- Podman Ubuntu 22.04 Kubic repository notice: https://podman.io/blogs/2022/04/05/ubuntu-2204-lts-kubic
- Podman system migrate manual: https://docs.podman.io/en/stable/markdown/podman-system-migrate.1.html
- Podman system reset manual: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman network manual: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Podman machine rm manual: https://docs.podman.io/en/v4.3/markdown/podman-machine-rm.1.html
- Podman machine os apply manual: https://docs.podman.io/en/latest/markdown/podman-machine-os-apply.1.html
- Podman stop manual: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman inspect manual: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman run manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman info manual: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Debian Backports instructions: https://backports.debian.org/Instructions/
- Debian Backports wiki: https://wiki.debian.org/Backports

## Issues Found
- The Fedora COPR example enabled the Podman Next repository without `-y` and then used `dnf update`. The official Podman installation page shows enabling the COPR with `-y` and installing Podman from that repository, so the commands were updated to `sudo dnf copr enable -y rhcontainerbot/podman-next` and `sudo dnf install -y podman`.
- The Ubuntu section recommended the openSUSE Kubic/libcontainers repository for Ubuntu 22.04. Podman's official Ubuntu 22.04 Kubic notice says those repositories no longer receive updates and recommends the default Ubuntu repositories, so the Kubic repository setup was removed and replaced with official-repository guidance.
- The Debian backports example used `bookworm-backports` without showing that the backports repository must first be enabled. The example now adds a Debian 12 backports source before installing with `apt install -t bookworm-backports`.
- The macOS and Windows examples used `podman machine rm` without `-f`, which prompts for confirmation. The commands now use `podman machine rm -f` so the scripted sequence works predictably.
- The `podman system reset` warning said it removes only containers and images. Current Podman documentation says it removes pods, containers, images, networks, volumes, machines, and storage roots, so the warning was expanded.
- The CNI troubleshooting section said Podman 5.x uses Netavark by default and advised deleting `/etc/cni/net.d/`. Podman documentation says Netavark became the default in Podman 4.0, and network backend changes should be handled through configuration and storage reset rather than deleting CNI config directories directly. The section now checks the backend with `podman info --format '{{.Host.NetworkBackend}}'` and removes the unsafe deletion command.
- The rootless troubleshooting sequence ran `podman system migrate` after `podman system reset`. Since `system reset` clears storage, the follow-up migration is unnecessary and was removed.

## Review Notes
The guide is technically relevant and generally accurate after the fixes. The most important caveat is that "latest" varies by distribution repository; Fedora and Arch tend to move faster than Debian and Ubuntu stable releases. For macOS and Windows, recreating a Podman machine gets a fresh VM image but also removes the existing machine, so users should back up machine-local data first.

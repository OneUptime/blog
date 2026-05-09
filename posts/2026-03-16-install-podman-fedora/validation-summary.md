# Validation Summary: How to Install Podman on Fedora

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Fedora Linux
- DNF package management
- Podman
- Rootless containers
- systemd user services
- Podman Docker-compatible API socket
- podman-compose
- Container DNS configuration

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman command reference: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman rootless container documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman DNS option documentation: https://docs.podman.io/en/v4.3/markdown/options/dns.html
- Podman system reset documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- Fedora release life cycle documentation: https://fedoraproject.org/wiki/Fedora_Release_Life_Cycle
- Fedora package listing for podman-compose: https://packages.fedoraproject.org/pkgs/podman-compose/podman-compose/

## Issues Found
- The prerequisite recommended Fedora 38 or later. Fedora 38 is no longer a supported Fedora release, so this was changed to require a currently supported Fedora system.
- The update command used `sudo dnf update -y`. DNF documents `update` as a deprecated alias for `upgrade`, so this was changed to `sudo dnf upgrade -y`.
- The DNS troubleshooting step recommended restarting `systemd-resolved`. Podman documents explicit DNS configuration with `--dns` when the host DNS configuration is not usable from containers, so the troubleshooting command was changed to a Podman `--dns` example.

## Review Notes
The core installation, version check, rootless subuid/subgid verification, user socket enablement, Docker-compatible `DOCKER_HOST` value, `podman-compose` package name, and sample `podman run` commands are consistent with current Podman and Fedora documentation.

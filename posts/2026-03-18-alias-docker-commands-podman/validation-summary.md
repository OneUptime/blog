# Validation Summary: How to Alias Docker Commands to Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Docker CLI compatibility
- podman-docker package
- Docker Compose and podman-compose
- systemd user socket activation
- Shell aliases, symlinks, and wrapper scripts

## Sources Consulted
- Podman documentation: What is Podman? https://docs.podman.io/en/latest/
- Podman documentation: podman compose https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: podman system service https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: podman network https://docs.podman.io/en/stable/markdown/podman-network.1.html
- Fedora Packages: podman-docker https://packages.fedoraproject.org/pkgs/podman/podman-docker/
- Ubuntu Packages: podman-docker https://packages.ubuntu.com/podman
- Red Hat documentation: Building, running, and managing containers in RHEL 8 https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/index

## Issues Found
- The post described aliasing Docker to Podman as allowing existing scripts and workflows to work unchanged. Podman documents strong Docker-CLI compatibility for many users, but not full behavioral compatibility for every script. I changed the wording to "many existing scripts and workflows."
- The post said Podman is designed as a drop-in replacement for Docker's CLI. Official Podman documentation describes a Docker-comparable or familiar CLI and says most users can alias Docker to Podman. I narrowed the wording to "Docker-compatible CLI for many common commands."
- The `podman-docker` section said the package creates symlinks and also provides a Docker-compatible socket. Distribution behavior varies: Fedora describes a Docker command script and man page links, while Podman's API socket still depends on `podman.socket` or `podman system service`. I changed the section to mention a wrapper or symlink and clarified the socket requirement.
- The Docker Compose section called `podman compose` "built-in compose support." Official Podman documentation describes it as a thin wrapper around an external compose provider such as `docker-compose` or `podman-compose`. I changed the wording and comments accordingly.
- The networking note said Podman uses "CNI/Netavark by default." Current Podman documentation says Netavark is the default network backend, with CNI relevant to older installations. I updated the note to reflect current behavior.
- The summary claimed full compatibility with Docker-based tooling. Because Podman provides broad but not complete Docker compatibility, I changed this to "broad compatibility."

## Review Notes
The command examples are generally valid for Linux systems with Podman installed. Shell aliases do not apply to every non-interactive execution environment, so the symlink, package, wrapper script, and socket examples remain important alternatives.

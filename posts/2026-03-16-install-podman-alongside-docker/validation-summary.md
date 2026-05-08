# Validation Summary: How to Install Podman Alongside Docker

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Docker Engine
- Linux package managers: dnf, apt
- systemd user services
- Container image save/load workflows
- Container registries
- podman-compose

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman load documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman pull documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman network list documentation: https://docs.podman.io/en/stable/markdown/podman-network-ls.1.html
- Docker Engine installation documentation: https://docs.docker.com/engine/install/
- Docker daemon startup documentation: https://docs.docker.com/engine/daemon/start/
- Docker container ls / ps documentation: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI formatting documentation: https://docs.docker.com/go/formatting/
- podman-compose project installation documentation: https://github.com/containers/podman-compose
- Debian podman-docker package description: https://packages.debian.org/podman-docker
- Red Hat container tools documentation for podman-docker behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/index

## Issues Found
- The Debian / Ubuntu Podman installation example skipped `sudo apt update`. Added it before `sudo apt install -y podman` to match the official Podman installation instructions for Ubuntu-style systems.
- The image transfer examples used `nginx:latest` with `docker save` and `docker tag` without first ensuring that image existed locally in Docker. Added `sudo docker pull nginx:latest` before those examples because Docker save/tag commands require a local source image.
- The socket section implied that enabling the system-level Podman socket inherently conflicts with Docker. Updated the wording to reflect the actual default socket paths: Docker uses `/var/run/docker.sock`, while Podman uses user/rootful Podman socket paths, and conflicts mainly come from Docker-compatible tools being pointed at the wrong socket.
- The `podman-docker` explanation called it an alias. Updated it to describe the package as a Docker-compatible wrapper/replacement for the `docker` command, which matches Debian and Red Hat package descriptions.
- The networking section said containers from Docker and Podman cannot communicate with each other. Reworded this to say the runtimes do not share container DNS or network membership by default, and that published ports can bridge between them.
- The summary repeated the overly strict claim that the Podman system socket must remain disabled while Docker is running. Updated it to focus on avoiding `podman-docker` when the real Docker CLI is needed and keeping Docker-compatible tools pointed at the intended socket.

## Review Notes
The commands and claims are now technically sound for current Linux Podman and Docker installations. Some behavior can still vary by distribution packaging, especially around Docker availability on RHEL-family systems and how `podman-docker` conflicts with or replaces a real Docker CLI.

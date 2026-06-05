# Validation Summary: How to Install Docker on Linux Mint

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker BuildKit
- Docker Compose plugin
- Linux Mint
- Ubuntu apt repositories
- systemd
- VS Code Dev Containers
- Dev Container Features
- X11 GUI forwarding

## Sources Consulted
- Docker Engine installation on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Engine installation overview for Ubuntu derivatives: https://docs.docker.com/engine/install/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker BuildKit documentation: https://docs.docker.com/build/buildkit/
- Docker legacy builder / BuildKit default behavior: https://docs.docker.com/reference/cli/docker/build-legacy/
- Docker prune command references: https://docs.docker.com/reference/cli/docker/system/prune/ and https://docs.docker.com/reference/cli/docker/image/prune/
- Linux Mint supported releases table: https://linuxmint.com/download_all.php
- Linux Mint 22 release notes: https://www.linuxmint.com/rel_wilma_cinnamon.php
- VS Code Dev Containers documentation: https://code.visualstudio.com/docs/devcontainers/containers
- Dev Container Features registry: https://containers.dev/features

## Issues Found
- The post claimed that blindly following Docker's standard Ubuntu instructions would use the Mint codename. Docker's current official Ubuntu instructions read `UBUNTU_CODENAME` from `/etc/os-release`, so I changed the wording to describe the issue as applying to older snippets that use `$(lsb_release -cs)`.
- The Docker repository example used the older one-line `.list` format. It would still work with apt, but Docker's current official Ubuntu documentation uses Deb822 `.sources` files. I updated the example and verification command to use `/etc/apt/sources.list.d/docker.sources`.
- The cleanup command included older package names that are no longer the current Docker-documented set. I updated it to target the current legacy/conflicting packages documented by Docker.
- The BuildKit section said to enable BuildKit globally. Current Docker Engine releases use BuildKit by default for Linux image builds, so I updated the text and kept the daemon configuration focused on log rotation.
- The Dev Containers example referenced `ghcr.io/devcontainers/features/node:1`; the current Dev Container Features registry lists Node.js as `ghcr.io/devcontainers/features/node:2`, so I updated the feature reference.

## Review Notes
- The guide is technically relevant and remains valid for Linux Mint 21.x and 22.x. Linux Mint's supported releases table maps Mint 21.x to Ubuntu Jammy and Mint 22.x to Ubuntu Noble, which matches the post's Ubuntu codename table.
- Adding a user to the `docker` group grants root-level privileges through Docker socket access. Docker documents this security implication; a future revision could add that warning near Step 8.

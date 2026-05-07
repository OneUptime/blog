# Validation Summary: How to Enable the Podman REST API for Rootless Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman REST API
- Rootless Podman
- systemd user services and socket activation
- Linux user namespaces and subordinate UID/GID mappings
- Rootless container networking with pasta and slirp4netns
- Docker-compatible API clients and DOCKER_HOST
- Linux sysctl configuration for unprivileged low ports

## Sources Consulted
- Podman `podman-system-service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman `podman-network` official documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman rootless mode documentation: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Docker CLI official documentation for `DOCKER_HOST` and socket URL formats: https://docs.docker.com/reference/cli/docker/
- Local `usermod --help` output for subordinate UID/GID flags.
- Local `loginctl` man page for lingering behavior.

## Issues Found
- The TCP service example used `tcp:127.0.0.1:8080`, but Podman expects endpoint URI form such as `tcp://127.0.0.1:8080`. Updated the command to use the correct URI syntax.
- The post stated that rootless containers use `slirp4netns` by default. Current Podman documentation says `pasta` is the default rootless networking tool, with `slirp4netns` available when configured. Updated the networking descriptions and prerequisite examples accordingly.
- The rootless networking comparison implied rootless mode avoids Netavark entirely. Current Podman documentation says Podman uses Netavark as the network backend, while rootless containers use pasta or slirp4netns rather than the rootful default bridge network. Updated the wording.
- The `grep $USER /etc/subuid` and `/etc/subgid` checks could match unrelated usernames. Updated the examples to anchor the match with `grep "^${USER}:"`.
- The post claimed rootless API mode provides "full" or the "same" functionality as root mode. Rootless Podman has documented limitations, so the wording was narrowed to "broad" and "most day-to-day container management functionality."

## Review Notes
- The Unix socket path, systemd user socket path, socket activation behavior, `--time 0` behavior, `DOCKER_HOST` usage, subordinate UID/GID setup, rootless storage location, and linger behavior match the consulted documentation.
- The post binds the TCP API to localhost, which is safer than a public bind, but Podman's official documentation still recommends avoiding network exposure without mutual TLS because even localhost access can allow arbitrary code execution as the API user.

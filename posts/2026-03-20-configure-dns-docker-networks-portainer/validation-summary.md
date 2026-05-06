# Validation Summary: How to Configure DNS for Docker Networks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker CLI (`docker network`, `docker run`, `docker exec`, `docker inspect`)
- Portainer Docker network management
- Docker network drivers (`bridge`, `macvlan`, `ipvlan`, `overlay`)

## Sources Consulted
- Docker Docs: Networking overview — https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker run` CLI reference — https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Network drivers summary — https://docs.docker.com/engine/network/drivers/
- Docker Docs: Macvlan network driver — https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: IPvlan network driver — https://docs.docker.com/engine/network/drivers/ipvlan/
- Portainer Documentation: Networks — https://docs.portainer.io/user/docker/networks
- Portainer Documentation: Add a new network — https://docs.portainer.io/user/docker/networks/add

## Issues Found
- The original title, tags, and description claimed the post was about configuring DNS for Docker networks in Portainer. Docker documents DNS overrides on containers via `docker run` or `docker create`, and Portainer's network-creation documentation describes driver and IPAM settings rather than per-network DNS settings. I corrected the title and metadata to match the documented scope of the post.
- The introduction said Portainer manages "all Docker network types" and the table included `host` and `none`. Portainer's current network documentation lists `bridge`, `macvlan`, `ipvlan`, and `overlay` as supported network types, so I corrected the introduction and removed the unsupported entries from the table.
- The overlay network example did not mention its Swarm prerequisite. I updated the example comment to note that overlay networks require Swarm mode.

## Review Notes
- Docker's embedded DNS is used for containers attached to custom networks. Custom DNS servers and related DNS options are configured per container with `--dns`, `--dns-search`, and `--dns-option`, not with `docker network create`.
- The CLI examples for creating `bridge`, `macvlan`, `ipvlan`, and `overlay` networks, attaching containers to multiple networks, assigning a static IP on a user-defined bridge network, inspecting networks, listing networks, and pruning unused networks are consistent with current Docker documentation.
- The `ping` troubleshooting example assumes the container image includes `ping`; some minimal images may require a different diagnostic tool.

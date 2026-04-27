# Validation Summary: How to Set Up Overlay Networks for Swarm Services in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Docker overlay network driver
- Portainer (Swarm environment)
- Docker Compose (v3.8 stack file format)
- VXLAN (overlay data plane)

## Sources Consulted
- Docker overlay networks documentation: https://docs.docker.com/engine/network/drivers/overlay/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Swarm mode networking: https://docs.docker.com/engine/swarm/networking/
- Docker Swarm port requirements: https://docs.docker.com/engine/swarm/swarm-tutorial/#open-protocols-and-ports-between-the-hosts
- Compose Spec networks reference: https://docs.docker.com/reference/compose-file/networks/
- Portainer Swarm networks documentation: https://docs.portainer.io/user/docker/networks

## Issues Found
No technical issues found.

## Review Notes
- The CLI commands for `docker network create` (with `--driver overlay`, `--opt encrypted`, and `--attachable`) are all correct and current.
- The port list is accurate for overlay networking: 4789/UDP for VXLAN data plane and 7946/TCP+UDP for the gossip/control plane. Note that Swarm cluster management additionally uses 2377/TCP, which the post does not mention; this is fine because the post scopes itself to overlay-network traffic, not cluster bootstrapping.
- The Compose stack snippet uses `version: "3.8"`. The Compose Spec has since deprecated the top-level `version` field, but it is still accepted by Docker stack deploy and remains common in Swarm tutorials, so leaving it in place is reasonable.
- Portainer UI labels (e.g., "Add network", "Create the network") can shift slightly between Portainer CE versions, but the described navigation flow matches recent Portainer Business/CE releases.

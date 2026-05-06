# Validation Summary: Best Practices for Network Configuration in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose network configuration
- Docker Swarm overlay networking
- Bridge and macvlan network drivers

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker network prune - https://docs.docker.com/reference/cli/docker/network/prune/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Portainer Docs: Networks - https://docs.portainer.io/user/docker/networks
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view

## Issues Found
- The post said the default bridge creates "shared network namespace risks". That is inaccurate for standard bridge networking because containers do not share a network namespace simply by being on the same bridge. I changed this to "Shared bridge network increases lateral movement risk".
- The main Compose example used the top-level `version: "3.8"` field. Docker now documents `version` as obsolete and only kept for backward compatibility, so I removed it.
- The `internal: true` comments overstated the behavior as blanket internet blocking. Docker documents `internal` as creating an externally isolated network, so I updated the wording to match the current behavior more precisely.
- The Portainer inspection bullets implied capabilities such as verifying service connectivity and identifying orphaned networks directly from the Networks view. I revised that section to match documented Portainer capabilities around viewing, adding, removing, and reviewing network configuration and attached networks.

## Review Notes
- `docker compose config` accepted the updated bridge, macvlan, and overlay examples syntactically.
- Overlay encryption is valid and recommended for sensitive Swarm traffic, but Docker documents a performance cost and notes that encrypted overlay networking is not supported for Windows containers.
- The `attachable: true` setting on the overlay example is valid. Docker also notes that overlay networks created by Compose in Swarm mode are attachable by default unless explicitly set otherwise.

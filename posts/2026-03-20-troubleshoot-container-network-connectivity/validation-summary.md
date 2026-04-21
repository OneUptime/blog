# Validation Summary: How to Troubleshoot Container Network Connectivity in Portainer - Container

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker CLI
- Docker bridge, macvlan, ipvlan, overlay, host, and none network drivers

## Sources Consulted
- Docker Docs - Network drivers: https://docs.docker.com/engine/network/drivers/
- Docker Docs - Macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs - IPvlan network driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs - docker network create: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs - docker network connect: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Docs - docker network inspect: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs - docker network ls: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker Docs - docker network prune: https://docs.docker.com/reference/cli/docker/network/prune/
- Docker Docs - docker container run: https://docs.docker.com/reference/cli/docker/container/run/
- Portainer Docs - Networks: https://docs.portainer.io/user/docker/networks
- Portainer Docs - Add a new network: https://docs.portainer.io/user/docker/networks/add

## Issues Found
- The introduction said Portainer provides a visual interface for creating and managing all Docker network types. Current Portainer documentation lists supported network types as bridge, macvlan, ipvlan, and overlay, so the sentence was changed to avoid implying that Portainer can create every Docker network driver/type.

## Review Notes
- The Docker CLI examples are syntactically valid and match current Docker documentation.
- Overlay network creation requires Swarm mode to be enabled and should be run in that context; the post labels the example as "Swarm", but a future revision could make that prerequisite more explicit.
- The `ping` troubleshooting example is valid, but it assumes the source container image includes a ping utility and that both containers are attached to a network where the target name can resolve.

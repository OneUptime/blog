# Validation Summary: How to Create Custom Docker Networks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine networking
- Docker bridge, host, none, overlay, and macvlan network drivers
- Docker DNS and service discovery
- Docker Compose networking
- Docker Swarm overlay networks
- iptables / DOCKER-USER firewall rules

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Network drivers - https://docs.docker.com/engine/network/drivers/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker network connect CLI reference - https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose file networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose services aliases reference - https://docs.docker.com/reference/compose-file/services/#aliases
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help: `docker network create --help`, `docker network connect --help`, `docker service create --help`, and `docker compose version`

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: "3.9"` property. Removed it from all Compose YAML snippets because the current Compose Specification treats `version` as backward-compatible but obsolete, and Docker Compose uses the current schema regardless of that field.
- The standalone iptables example referenced `br-frontend` and `br-database` bridge interfaces, but the preceding standalone network creation commands did not create those interface names. Updated the tier network creation commands to set `com.docker.network.bridge.name` for the frontend, backend, and database bridges, and clarified that the firewall rules target bridge interfaces.

## Review Notes
- The remaining Docker network commands and flags matched current Docker CLI help and official Docker documentation.
- The Compose examples are illustrative application configurations; paths such as `./api`, `./frontend`, and application images such as `myapp:legacy` assume corresponding project files or images exist.

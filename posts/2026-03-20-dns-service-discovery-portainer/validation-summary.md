# Validation Summary: How to Set Up DNS-Based Service Discovery in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Docker networking
- Docker Swarm networking
- iptables
- ntopng

## Sources Consulted
- Docker Compose file reference: Networks: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose file reference: Services: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine networking overview: https://docs.docker.com/engine/network/
- Docker bridge networking tutorial: https://docs.docker.com/engine/network/tutorials/standalone/
- Docker overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/
- Docker host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker network inspect` reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Portainer add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer networks overview: https://docs.portainer.io/user/docker/networks
- Portainer add a new network: https://docs.portainer.io/user/docker/networks/add

## Issues Found
- The description and introduction claimed the guide used Consul, but the post contained no Consul configuration or commands. I corrected both lines to describe Docker's built-in DNS and per-network aliases, which is what the post actually demonstrates.
- The prerequisites said a Kubernetes environment was enough, but every example in the post is Docker or Docker Swarm specific. I updated the prerequisite to a Docker or Docker Swarm environment connected to Portainer.
- Step 2 directed readers to Portainer's **Networks** UI while showing a stack YAML example. I changed the navigation to **Stacks** > **Add stack** so the instructions match the Compose-based workflow shown in the snippet.
- The stack snippet used the top-level `version: "3.8"` field. Docker's current Compose documentation marks `version` as obsolete, so I removed it.
- The overlay network examples used `encrypted: true` as a top-level network key. That is not a valid Compose network attribute. I replaced it with `driver_opts: encrypted: "true"` and kept the Swarm-only context explicit.
- The database network comment described an `internal: true` network as "fully isolated", which overstates Docker's behavior. I changed it to "isolated from external access".
- The firewall section used UFW rules that do not reflect Docker's documented handling of published ports and host firewall rules. I replaced that section with `DOCKER-USER` chain examples based on Docker's official iptables guidance.
- The troubleshooting section said to use Portainer's console but then provided `docker exec` commands, referenced a network name as if it were a hostname, and depended on tools that might not exist inside the target application container. I replaced those commands with disposable `busybox`-based tests on the correct Docker networks and a `docker network inspect --format` example that avoids a `jq` dependency.
- The `ntopng` example combined `network_mode: host` with a `ports` mapping. Docker Compose documents that port mapping must not be used with `network_mode: host`, so I removed the port mapping and declared the named volume explicitly.
- The tiered architecture example contained malformed YAML because `internal: true` was indented under a flow-style mapping. I corrected the YAML structure.

## Review Notes
- Overlay network encryption examples apply only to Docker Swarm. The bridge-network DNS examples apply to standalone Docker as well.
- Placeholder values such as `stack-name_backend`, `stack-name_frontend`, and the example firewall subnet should be replaced with environment-specific values before use.
- Docker was not installed in this workspace, so I could not run `docker compose config`. I did validate every YAML block with a local YAML parser and every bash block with `bash -n`.

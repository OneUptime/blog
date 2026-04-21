# Validation Summary: How to Troubleshoot Cross-Network Container Communication in Portainer (2)

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Portainer CE/BE
- Docker Engine networking
- Docker Compose and Portainer stacks
- Docker Swarm overlay networks
- Linux iptables firewall rules
- ntopng container-based monitoring

## Sources Consulted
- Docker Docs: Network drivers - https://docs.docker.com/engine/network/drivers/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Compose file networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker CLI Docs: docker network inspect - https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker CLI Docs: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The prerequisites said a Docker or Kubernetes environment was suitable, but the post uses Docker-specific network drivers, Compose stacks, and Docker CLI commands. Changed the prerequisite to Docker standalone or Docker Swarm, and replaced TLS with IPsec because the encryption example is Docker overlay IPsec.
- The Portainer navigation pointed only to **Networks** > **Add Network** while showing a Compose stack snippet. Updated the sentence to use **Stacks** > **Add stack** for Compose stack definitions, with **Networks** > **Add network** retained for individual networks.
- The Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Compose treats it as only informative and warns that it is obsolete.
- The overlay network examples used unsupported top-level `encrypted: true` Compose network attributes. Replaced them with `driver_opts: encrypted: "true"`, which maps to Docker's overlay driver option for encrypted overlay traffic.
- The overlay network comment called the network "External" without using Compose's `external` attribute. Renamed the comment to avoid conflicting with Compose semantics.
- The API service comment said it connected only to frontend and backend networks, but the snippet also connected it to `db-net`. Updated the comment to match the configuration.
- The firewall example used UFW rules for Docker container networks. Docker's official documentation notes that Docker and UFW are incompatible for published container traffic because Docker routes packets before UFW's INPUT/OUTPUT chains. Replaced the example with `DOCKER-USER` iptables rules.
- The troubleshooting curl example targeted `http://frontend:3000`, but `frontend` is a network name in the shown Compose snippets, not a service hostname. Changed it to `http://nginx`, which is a service on the shared frontend network.
- The ntopng Compose example combined `network_mode: host` with `ports`, which Compose documents as a runtime error. Removed the port mapping and added the top-level `ntopng-data` named volume declaration.
- The tiered architecture YAML had `data: {}` followed by nested `internal: true`, which is invalid YAML. Changed it to a proper mapping.

## Review Notes
All YAML snippets in the post parse successfully after the fixes. Docker was not installed in the local workspace, so live Docker CLI or `docker compose config` validation could not be run. The review was completed against current official Docker, Compose, and Portainer documentation.

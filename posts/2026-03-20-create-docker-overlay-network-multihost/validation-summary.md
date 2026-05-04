# Validation Summary: How to Create a Docker Overlay Network for Multi-Host IPv4 Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker overlay network driver
- VXLAN (Virtual Extensible LAN)
- Docker Compose (v3.8 schema) / `docker stack deploy`
- Docker embedded DNS / service VIP load balancing

## Sources Consulted
- Docker overlay networks documentation: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Swarm mode networking: https://docs.docker.com/engine/swarm/networking/
- `docker swarm init` reference: https://docs.docker.com/reference/cli/docker/swarm/init/
- `docker network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- `docker service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- `docker stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Swarm port requirements (TCP 2377, TCP/UDP 7946, UDP 4789): https://docs.docker.com/engine/swarm/swarm-tutorial/
- VXLAN UDP port 4789 assignment (IANA / RFC 7348)

## Issues Found
No technical issues found. All commands, flags, port numbers, and explanations match official Docker documentation:

- `docker swarm init --advertise-addr` is the correct flag.
- `docker network create --driver overlay --subnet --gateway --attachable <name>` uses correct flags; `--attachable` correctly enables standalone containers (not just services) to attach.
- `docker service create --name --network --replicas` syntax is correct.
- Required Swarm ports listed (TCP 2377 management, TCP/UDP 7946 node communication, UDP 4789 VXLAN data plane) are accurate.
- The claim that overlay networks use VXLAN encapsulation (UDP 4789) is correct.
- Default service discovery resolves the service name to a VIP that load-balances across replicas — correct for the default `vip` endpoint mode.
- The Compose v3.8 `networks.<name>.driver: overlay` with `ipam.config.subnet` is valid for `docker stack deploy`.
- `ss -ulnp | grep 4789` correctly checks for the UDP VXLAN listener.

## Review Notes
- The Compose `version: "3.8"` field is technically obsolete in the current Compose Specification (the spec no longer requires/uses a top-level `version`), but it is still accepted by `docker stack deploy` and does not cause errors. Could be removed in a future update.
- The post does not mention encrypted overlay networks (`--opt encrypted`), which would be worth a note for production use cases handling sensitive traffic, but its absence is not an error.
- For a standalone container (`docker run --network my-overlay ...`) to attach successfully on a non-manager node, the overlay must be both `--attachable` and already extended to that node (e.g., because a service replica is running there). The post implicitly assumes this since the `web` service is deployed first; this is fine but a subtle behavior worth noting.
- No version-specific caveats — the commands have been stable across modern Docker Engine releases.

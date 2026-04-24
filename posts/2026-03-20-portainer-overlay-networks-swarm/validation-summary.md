# Validation Summary: How to Set Up Overlay Networks for Swarm Services in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker overlay networks
- Docker CLI
- Compose / stack file networking
- YAML

## Sources Consulted
- Docker Docs: Overlay network driver https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage swarm service networks https://docs.docker.com/engine/swarm/networking/
- Docker Docs: `docker network create` https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Networks in the Compose file reference https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: `docker service inspect` https://docs.docker.com/reference/cli/docker/service/inspect/
- Docker Docs: Deploy a stack to a swarm https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: Version and name top-level elements https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Add a new network https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Configure service options https://docs.portainer.io/user/docker/services/configure

## Issues Found
- The original post said traffic is encrypted by default between nodes. I corrected this to match Docker's documentation: Swarm management/control traffic is encrypted by default, but overlay application data is not encrypted unless you enable the `encrypted` network option.
- The original service-discovery explanation implied that same-network containers can generally use either container names or service names in Swarm. I corrected this to distinguish Swarm service discovery by service name from standalone-container name discovery on attachable overlay networks.
- The Portainer network-creation snippet used `Attachable` as if it were the current Portainer UI field name. I updated it to Portainer's documented `Enable manual container attachment`.
- The public-network explanation suggested communication with external load balancers over the overlay network. I corrected this to the documented attachable-overlay use case: reverse proxies or standalone containers joining the overlay network.
- The combined Compose example omitted `attachable: true` from `public-net`, which made it inconsistent with the earlier example and explanation. I added it.
- The DNS section used `curl http://database:5432`, which is not a valid protocol test for a PostgreSQL service. I replaced that example with DNS lookups and clarified the default VIP-based service-discovery behavior.
- The encryption section described overlay encryption as AES-256-GCM and gave a specific `~10-20%` overhead figure. Docker's current docs describe IPsec over VXLAN and a non-negligible performance penalty, so I corrected the wording to match the documentation.
- The troubleshooting section used `ping` against a service name and suggested an `iperf3` test on UDP 4789. Those were not reliable or documented overlay-network checks, so I replaced the container test with a task-container DNS check and removed the `iperf3` example.
- The MTU section cited a specific cloud provider without official documentation in the review sources. I generalized this to "some environments" while keeping the MTU configuration example.

## Review Notes
- The Compose example still uses `version: "3.8"`. This is acceptable in a Swarm stack context because `docker stack deploy` still uses the legacy Compose v3 format, even though the Compose Specification marks the top-level `version` field as obsolete for regular Compose workflows.
- The `nslookup` examples assume the container image includes a DNS lookup tool. Minimal images may require an equivalent utility instead.
- Validation was performed against current Docker and Portainer documentation as of 2026-04-24.

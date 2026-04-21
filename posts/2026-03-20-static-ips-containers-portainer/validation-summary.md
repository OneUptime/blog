# Validation Summary: How to Assign Static IPs to Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- Docker Compose networking
- Portainer Docker network management
- PostgreSQL and Redis container examples

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference (`ipv4_address`, `ipv6_address`): https://docs.docker.com/reference/compose-file/services/#ipv4_address-ipv6_address
- Docker Compose networks reference (`external`, `ipam`, `driver`): https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker container run` networking reference: https://docs.docker.com/reference/cli/docker/container/run/#connect-a-container-to-a-network---network
- Docker `docker inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Portainer Docker network documentation: https://docs.portainer.io/user/docker/networks/add

## Issues Found
1. **Obsolete Compose `version` field in examples.** The post used `version: "3.8"` in three Compose snippets. Current Docker Compose treats the top-level `version` property as obsolete and only informative, emitting a warning when it is used. Removed those `version` lines so the examples match the current Compose Specification.

## Review Notes
- The core guidance is accurate: Docker supports static container IPs on user-defined networks with subnet configuration, Compose supports `ipv4_address` for service network attachments, and static addresses must be covered by the network IPAM subnet.
- The `external: true` network example is correct for a network created outside the Compose project; Compose will look up the existing network and fail if it does not exist.
- The `docker network create` options `--driver`, `--subnet`, and `--gateway`, plus the `docker inspect --format` IP lookup pattern, match Docker's official CLI references.
- Portainer's current documentation groups subnet and gateway fields under "IPv4 Network configuration" on the Networks > Add network page; the post's UI guidance is directionally correct.
- The local workspace does not have the Docker CLI installed, so Docker commands and `docker compose config` could not be executed locally during review.
- The `myapp/api:latest` image is an illustrative placeholder. Readers must substitute a real application image, and the `ping` verification command requires that the chosen image include a ping utility.

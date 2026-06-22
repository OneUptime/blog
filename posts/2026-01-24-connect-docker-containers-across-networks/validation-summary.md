# Validation Summary: How to Connect Docker Containers Across Networks

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Engine networking
- Docker Compose networking
- Docker bridge networks
- Docker overlay networks and Swarm mode
- Network aliases and service discovery
- IPAM, custom subnets, and static container IP addresses

## Sources Consulted
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose file networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: Manage swarm service networks - https://docs.docker.com/engine/swarm/networking/
- Local CLI checks: `docker network create --help`, `docker network connect --help`, `docker service create --help`, and `docker compose config`

## Issues Found
- The Docker network basics section said containers communicate using container names as hostnames in general. I narrowed this to user-defined networks and Compose default networks, where Docker-provided DNS supports service/container-name resolution.
- The Compose examples used the obsolete top-level `version: '3.8'` key. I removed those lines because current Docker Compose treats `version` as informational and warns that it is obsolete.
- The DMZ example named a network `internal` but did not configure it as an externally isolated Compose network. I added `internal: true` and changed the database comment from "completely isolated" to "not published to the host."
- The service mesh simulation Compose snippet defined services without `image` or `build`, which makes the project invalid. I added placeholder `image` values to each service.
- The troubleshooting section described a "Network already exists" issue but showed a command for creating a missing external network. I corrected the issue title and explanatory comment to "External network not found."

## Review Notes
The remaining examples are technically valid for current Docker Engine and Docker Compose. The static IP example is valid, but Docker's own Compose guidance still recommends service-name DNS over hardcoded IP addresses for most applications because container IPs are otherwise dynamic.

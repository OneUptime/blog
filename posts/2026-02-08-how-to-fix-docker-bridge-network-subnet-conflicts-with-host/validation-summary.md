# Validation Summary: How to Fix Docker 'Bridge Network Subnet Conflicts' with Host

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- Docker Swarm overlay networks
- Docker Compose network IPAM configuration
- Linux routing commands
- IPv4 and IPv6 CIDR subnetting

## Sources Consulted
- Docker Docs: Networking overview and subnet allocation: https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker network command reference: https://docs.docker.com/reference/cli/docker/network/
- Docker Docs: dockerd CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker Docs: Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: IPv6 networking for Docker Engine: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Swarm mode default address pools: https://docs.docker.com/engine/swarm/swarm-mode/
- Local Docker CLI help output for `docker network create`, `docker network disconnect`, `docker network inspect`, and `docker network prune`.

## Issues Found
- The post described Docker user-defined network allocation as only `172.18.0.0/16`, `172.19.0.0/16`, and so on. Docker's current documented built-in default address pools include additional ranges, including parts of `172.16.0.0/12` and `192.168.0.0/16`. Updated the description to match Docker's documented default pools.
- The post said Docker assigns automatic subnets without checking for conflicts. Docker documentation says Docker attempts to avoid address prefixes already in use on the host, though manual configuration is still needed in many LAN/VPN environments. Updated the claim to be more precise.
- The conflict diagnosis wording said any overlap with the host routing table indicates a conflict. Docker networks normally create their own host routes, so the real concern is overlap with non-Docker routes. Updated the wording and verification comment.
- The `docker network disconnect` example passed multiple containers to a command that accepts only one container argument. Replaced it with an `xargs -n1` form that disconnects each container separately.
- The IPv6 `default-address-pools` example replaced Docker's IPv4 pools with an IPv6-only pool. Docker's IPv6 documentation says to include default IPv4 pools as well when manually configuring IPv6 pools. Added an IPv4 pool, changed the IPv6 dynamic pool to a `/56` base with `/64` allocations, and used a `/64` `fixed-cidr-v6` for the default bridge.
- The validation script detected conflicts by matching only the first two IPv4 octets, which misses real CIDR overlaps such as `172.17.0.0/16` overlapping `172.16.0.0/12`. Replaced it with a CIDR-aware Python script using the standard `ipaddress` module and JSON output from Docker and `ip route`.

## Review Notes
The remaining examples use current Docker CLI options and Compose network IPAM fields. The article is Linux-focused, which matches its use of `ip route`, `ip addr`, `/etc/docker/daemon.json`, and `systemctl`.

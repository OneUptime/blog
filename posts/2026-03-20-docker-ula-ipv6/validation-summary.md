# Validation Summary: How to Use ULA Addresses for Internal Docker Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- IPv6
- Unique Local Addresses (ULA)
- RFC 4193
- Python

## Sources Consulted
- Docker Docs, "Use IPv6 networking": https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs, "Networking overview": https://docs.docker.com/engine/network/
- Docker Docs, "`docker network create`": https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, "Bridge network driver": https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs, "Define and manage networks in Docker Compose": https://docs.docker.com/reference/compose-file/networks/
- Docker Docs, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "`dockerd`": https://docs.docker.com/reference/cli/dockerd/
- RFC 4193, "Unique Local IPv6 Unicast Addresses": https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The post said the 40-bit Global ID "ensures uniqueness" and labeled the generated prefix as "unique". RFC 4193 describes the Global ID as pseudo-random and only providing a high probability of uniqueness. I updated the wording in the introduction, heading, code comment, and conclusion to match the RFC.
- The `daemon.json` example included a `//` comment, which is invalid JSON for Docker daemon configuration. I removed the comment from the snippet.
- The `fixed-cidr-v6` example used a `/80` prefix and overlapped with the IPv6 `default-address-pools` range. Docker's bridge driver docs say `fixed-cidr-v6` should normally be `/64` or shorter, and overlapping pool definitions can create conflicting allocations. I changed the default bridge range to `fd3a:1b2c:4d5e::/64` and moved the automatic IPv6 pool to a non-overlapping `fd3a:1b2c:4d5e:100::/56`.
- The daemon configuration section omitted the required Docker daemon restart after editing `/etc/docker/daemon.json`. Docker's IPv6 docs require a restart for the settings to take effect, so I added `sudo systemctl restart docker`.
- The Compose example used `myapi:latest`, which is only a placeholder and would not reliably run for readers. I replaced it with `traefik/whoami:latest`, a real image Docker uses in its IPv6 documentation examples.
- The benefits and conclusion overstated ULA security by implying there was no exposure risk. RFC 4193 says ULAs are not globally routable, but they do not provide inherent security, and Docker can still expose services through published ports or routing. I corrected that wording to keep the distinction clear.

## Review Notes
- Docker's current IPv6 docs state that IPv6 support applies to Docker daemons running on Linux hosts.
- `default-address-pools` only affects automatically allocated subnets; the explicit `--subnet` values and Compose `ipam` subnets shown later in the post are independent of that pool.
- Docker CLI and Engine are not installed in this environment, so command validation was performed against current Docker documentation and RFC 4193 rather than live CLI execution.

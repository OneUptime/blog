# Validation Summary: How to Change the Default Docker Bridge Network IPv4 Subnet

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv4 subnetting and address allocation
- Linux daemon configuration with `daemon.json`
- Linux service management with `systemctl`

## Sources Consulted
- Docker daemon configuration docs: https://docs.docker.com/engine/daemon/
- `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker bridge network driver docs: https://docs.docker.com/engine/network/drivers/bridge/
- `docker container ls` reference for the `network` filter: https://docs.docker.com/reference/cli/docker/container/ls/
- IANA IPv4 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 6598, Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598

## Issues Found
- The `ip addr show docker0` sample output was too exact. Interface index values and link-state flags vary by host, so I changed the example to show only the relevant `inet 192.168.90.1/24` line that verifies the new bridge address.
- The running-container example used `docker stop $(docker ps -q)` and `docker start $(docker ps -aq)`, which affect all containers and can also start containers that were intentionally stopped before the change. I replaced this with a filtered workflow that captures the IDs of containers currently attached to the default `bridge` network and restarts only that same set.
- The post listed `100.64.0.0/24` as a "safe" choice. That block is RFC 6598 shared address space for carrier-grade NAT, not RFC1918 private-use space. I replaced it with an RFC1918 example subnet.

## Review Notes
- The guide is Linux-specific. `/etc/docker/daemon.json`, `docker0`, and `systemctl restart docker` apply to Docker Engine on Linux, not Docker Desktop or rootless Docker setups.
- The `default-address-pools` example is valid, but because it uses a `/24` base with `size: 24`, it only provides one auto-allocated custom network from that pool.

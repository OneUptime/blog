# Validation Summary: How to Configure Docker Bridge Networks with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networks
- IPv6
- Linux bridge and iproute2 tooling

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Docker Engine v28 release notes - https://docs.docker.com/engine/release-notes/28/
- Docker Docs: Docker Engine v27 release notes - https://docs.docker.com/engine/release-notes/27/
- Local iproute2 command help: `ip link help` and `bridge fdb help`

## Issues Found
- Several example IPv6 prefixes were invalid because they used non-hexadecimal text inside the address (`fd00:bridge::/80`, `fd00:userbridge::/64`, `fd00:optbridge::/64`). These were replaced with valid ULA-style prefixes.
- The introduction and conclusion overstated when `daemon.json`, `fixed-cidr-v6`, and explicit IPv6 subnets are required. The wording was updated to match current Docker documentation: `ipv6` enables IPv6 on the default bridge, `fixed-cidr-v6` is optional for an explicit prefix, and user-defined bridge networks use `--ipv6` with an IPv6 `--subnet` being optional on current Docker releases.
- The default-bridge verification example depended on the `nginx` image having the `ip` tool, and the user-defined DNS example depended on an unspecified `myapp` image having `ping6`. These commands were replaced with reproducible examples using `busybox` and `docker inspect`.
- The veth-to-container ownership loop in the debug section was not technically valid because it attempted to infer host veth ownership from container `/proc/.../net/if_inet6` data. It was replaced with accurate commands to show bridge member interfaces and list the containers attached to the network.
- The conclusion implied `enable_ip_masquerade=true` must be explicitly set for outbound IPv6 connectivity. This was corrected to reflect Docker's documented default behavior: bridge networks enable masquerading unless it is disabled.

## Review Notes
- IPv6 bridge networking in Docker is documented for Linux daemons; the examples in this post assume a Linux host.
- Docker's IPv6 behavior has changed in recent releases. Current docs and release notes reflect automatic ULA allocation for user-defined IPv6 bridge networks and optional `fixed-cidr-v6` on the default bridge, so older Docker Engine versions may behave differently.
- The review environment did not have the `docker` CLI installed, so Docker command verification was done against current official Docker documentation rather than local `docker --help` output.

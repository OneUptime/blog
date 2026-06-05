# Validation Summary: How to Configure Docker Containers for Multicast Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker bridge networking
- Docker macvlan networking
- Docker host networking
- Docker Compose
- Linux bridge multicast snooping and IGMP querier settings
- Python UDP multicast sockets
- tcpdump, bridge, netstat, iptables, and nsenter troubleshooting commands

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Linux Kernel Documentation: Ethernet Bridging - https://docs.kernel.org/next/networking/bridge.html
- RFC 1112: Host Extensions for IP Multicasting - https://datatracker.ietf.org/doc/html/rfc1112
- Python documentation: socket module - https://docs.python.org/3.11/library/socket.html
- Linux Standard Base setsockopt reference for IP multicast socket options - https://refspecs.linuxfoundation.org/LSB_4.1.0/LSB-Core-generic/LSB-Core-generic/baselib-setsockopt-2.html

## Issues Found
- The receiver used `struct.pack('4sL', ...)` for `IP_ADD_MEMBERSHIP`. Native `L` is platform-dependent and expands to a 16-byte structure on 64-bit Linux, while the IPv4 `ip_mreq` form is two 4-byte addresses. Changed it to `struct.pack('4s4s', group, 0.0.0.0)` to match the expected portable layout.
- The test Dockerfile did not force unbuffered Python output. Since the containers are run detached without a TTY, `print()` output can be buffered and `docker logs` may not show messages promptly. Added `ENV PYTHONUNBUFFERED=1`.
- The TTL comments described fixed multicast scope meanings for TTL 32 and TTL 255. TTL is a hop limit, and RFC 1112 specifies the default TTL of 1 for multicast sent beyond a single network only by explicit choice. Reworded the comments to describe higher TTL values as allowing more router hops.

## Review Notes
The Docker network, macvlan, host networking, Compose `driver_opts`, Linux bridge multicast snooping, IGMP querier, and monitoring commands were consistent with the consulted references. Macvlan and host networking remain platform-specific: Docker documents macvlan as Linux-only and unsupported in rootless mode, and host networking as Linux Docker Engine plus opt-in Docker Desktop support.

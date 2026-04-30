# Validation Summary: How to Plan an IPv6 Address Scheme for a Data Center

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- Data center network design
- BGP route summarization
- Linux networking with `iproute2`
- Docker IPv6 networking
- Kubernetes dual-stack networking

## Sources Consulted
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 6164, "Using 127-Bit IPv6 Prefixes on Inter-Router Links" - https://www.rfc-editor.org/rfc/rfc6164
- Docker Docs, "Use IPv6 networking" - https://docs.docker.com/engine/daemon/ipv6/
- Kubernetes Docs, "IPv4/IPv6 dual-stack" - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Local `iproute2` CLI help via `ip -6 addr help` and `ip -6 route help`
- Local `ping6`/`ping` CLI help via `ping6 -h`

## Issues Found
- The post used `2001:db8:dc::/48` as a BGP announcement example without clarifying that `2001:db8::/32` is reserved for documentation by RFC 3849 and is not routable on the public Internet. I updated the wording to explicitly mark it as a documentation prefix and to tell readers to replace it with their assigned production prefix.
- The Linux verification commands used addresses that did not match the configured examples. I changed the DNS reachability check to the configured resolver `2001:db8:dc:0002::53` and corrected the default-gateway ping to `2001:db8:dc:0110::1`.
- The container section mixed explanatory comments with a `daemon.json` example and reused the host LAN `/64` for container allocation. I separated the Kubernetes addressing notes from the Docker JSON snippet and changed the container subnet example to a dedicated `/64` within the DC block so it does not overlap the host LAN example.

## Review Notes
- The use of `/64` for server-facing IPv6 LANs is consistent with RFC 4291, and the use of `/127` on inter-router point-to-point links is consistent with RFC 6164.
- Kubernetes documents `/64` as the default IPv6 node CIDR mask size, but actual pod-network sizing still depends on the CNI and cluster design.
- Appending directly to `/etc/resolv.conf` works on some Linux systems, but on distributions managed by `systemd-resolved` or NetworkManager that file may be regenerated.

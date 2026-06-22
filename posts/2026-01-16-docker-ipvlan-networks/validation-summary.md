# Validation Summary: How to Configure Docker IPvlan Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker IPvlan driver
- Docker Compose networking
- Linux IPvlan driver
- Linux routing and IP forwarding
- VLAN subinterfaces

## Sources Consulted
- Docker Docs: IPvlan network driver - https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose services network attributes - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Linux Kernel documentation: IPVLAN Driver HOWTO - https://docs.kernel.org/networking/ipvlan.html
- Local Docker CLI help: `docker network create --help`
- Local iproute2 help: `ip link help ipvlan`

## Issues Found
- The Compose examples used `version: '3.8'`. Docker's current Compose Specification marks the top-level `version` property as obsolete and only informative, so I removed it from all Compose snippets.
- The L3S section described L3S as "L3 with Source Validation" and the summary described it as security/validation. Linux kernel documentation defines L3S as L3-symmetric mode used for conntrack support, so I updated the heading and summary row to use conntrack terminology.
- The IPvlan comparison table said IPvlan L3 "Requires static IPs." Docker's IPvlan L3 examples require routed subnets and ignore a traditional gateway, but per-container static IP assignment is not the core requirement. I changed the table wording to "Requires routed subnets (L3)."
- The comparison table said macvlan "Works with DHCP." In Docker context, macvlan still uses Docker IPAM unless external DHCP is arranged outside Docker, so I changed this to "External DHCP possible."

## Review Notes
- The Docker CLI flags and IPvlan driver options used in the post match current Docker documentation and local `docker network create --help` output.
- The L3 examples correctly omit `--gateway`; Docker documents that gateways are ignored in IPvlan L3 mode.
- Host-to-container communication with macvlan/ipvlan remains environment-specific. The post's note that additional configuration is needed is accurate, but a future revision could add more caveats about default namespace isolation.

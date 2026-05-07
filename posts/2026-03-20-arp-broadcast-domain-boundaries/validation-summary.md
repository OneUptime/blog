# Validation Summary: How to Understand ARP Broadcast Domain Boundaries

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP (Address Resolution Protocol)
- IPv4 broadcast domains and subnetting concepts
- Ethernet switching, bridges, routers, and VLANs
- Linux networking tools: `arping` and `bridge`
- Python `ipaddress` standard library module
- Overlay networking concepts: VXLAN, GENEVE, and EVPN

## Sources Consulted
- RFC 826 — Ethernet Address Resolution Protocol (ARP) (https://datatracker.ietf.org/doc/rfc826/)
- RFC 1009 — Requirements for Internet Gateways, including ARP and proxy ARP behavior (https://datatracker.ietf.org/doc/html/rfc1009)
- RFC 7348 — VXLAN (https://datatracker.ietf.org/doc/html/rfc7348)
- RFC 7432 — BGP MPLS-Based Ethernet VPN, including ARP proxy behavior (https://datatracker.ietf.org/doc/html/rfc7432.html)
- RFC 8926 — Geneve: Generic Network Virtualization Encapsulation (https://datatracker.ietf.org/doc/rfc8926/)
- RFC 9161 — Operational Aspects of Proxy ARP/ND in EVPN (https://datatracker.ietf.org/doc/rfc9161/)
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)
- `arping(8)` Linux manual page (https://man7.org/linux/man-pages/man8/arping.8.html)
- `bridge(8)` iproute2 manual page (https://manpages.debian.org/experimental/iproute2/bridge.8.en.html)
- Local `bridge fdb help` output from the installed `bridge` utility

## Issues Found
- The post briefly conflated ARP scope with IP subnet boundaries. I changed the example heading and one bullet from "subnet" to "broadcast domain" because ARP is fundamentally constrained by Layer 2 broadcast reachability, not by IP prefix alone.
- The Python example computed host count as `num_addresses - 2` for every CIDR. I updated it to handle `/31` and `/32` correctly, since Python's `ipaddress` model treats those prefixes as special cases for usable hosts.
- The `arping` explanation said the router "blocks" ARP broadcasts. I corrected this to say ARP is link-local and routers do not forward ARP broadcasts, and I added the proxy ARP caveat because a router can reply on behalf of a remote target when proxy ARP is enabled.
- The VXLAN section said ARP broadcasts are sent as unicast between VTEPs. I corrected that wording because VXLAN BUM traffic is not universally unicast; depending on the design, it may be multicast or replicated to remote tunnel endpoints. I also clarified that `bridge fdb show dev vxlan0` inspects forwarding database entries, not ARP suppression state directly, and narrowed the ARP suppression statement to overlays with a control plane such as EVPN.

## Review Notes
- The post is technically relevant and valid after the fixes above.
- The `arping` and `bridge` examples are Linux-specific and assume the relevant tools are installed and, for VXLAN, that an interface such as `vxlan0` exists on the host.
- The "Effects of Broadcast Domain Size" table is intentionally high-level guidance rather than a standards-defined threshold table; its qualitative advice is reasonable, but exact operational impact still depends on endpoint count, traffic patterns, and platform implementation.

# Validation Summary: How to Attach a VXLAN Interface to a Linux Bridge

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Linux networking (iproute2: `ip link`, `ip addr`, `bridge`)
- VXLAN (Virtual eXtensible LAN, RFC 7348)
- Linux bridge driver
- Layer 2 overlay networking
- VTEP (VXLAN Tunnel Endpoint) and BUM (Broadcast/Unknown-unicast/Multicast) flooding
- FDB (Forwarding Database) management
- tcpdump for packet capture

## Sources Consulted
- RFC 7348 (Virtual eXtensible Local Area Network): https://datatracker.ietf.org/doc/html/rfc7348
- iproute2 `ip-link(8)` man page — VXLAN type parameters (`id`, `dstport`, `local`, `dev`, `group`, `remote`): https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` man page — FDB management and `fdb append`/`fdb add`: https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux kernel documentation: Documentation/networking/vxlan.rst
- IANA UDP port registry entry for VXLAN (port 4789)

## Issues Found
No technical issues found.

All commands and technical claims verified:
- The `ip link add ... type vxlan id <VNI> dstport 4789 local <IP> dev <underlay>` syntax is correct; 4789 is the IANA-assigned VXLAN port per RFC 7348.
- Not assigning an IP to a VXLAN device enslaved to a bridge is the correct approach (the bridge terminates L3).
- `ip link set br0 type bridge stp_state 0` is valid iproute2 syntax for toggling bridge-specific parameters.
- `ip link set vxlan0 master br0` is the correct way to enslave an interface to a bridge.
- Using the all-zero MAC `00:00:00:00:00:00` with `bridge fdb append ... dst <remote_VTEP> permanent` is the correct Linux convention for adding BUM flood destinations on a VXLAN device without multicast underlay. `append` (rather than `add`) is the right choice because it supports multiple flood destinations for the same MAC.
- The tcpdump filter `udp port 4789` correctly captures VXLAN traffic on the underlay.
- The description of data-plane MAC learning via VXLAN (observable with `bridge fdb show dev vxlan0`) is accurate.

## Review Notes
- The post disables STP (`stp_state 0`). This is fine for a simple two-host lab, but in production topologies with redundant bridges, STP should be enabled to prevent loops. The post does not warn about this, but the omission is not technically incorrect for the scope described.
- The unicast-with-head-end-replication approach shown (adding per-remote-VTEP flood entries) scales O(N) per host and does not require multicast on the underlay — a pragmatic choice that matches Flannel/Docker overlay behavior as the post claims.
- For larger-scale deployments, an EVPN/BGP control plane or multicast underlay would replace the manual `bridge fdb append` entries — this is out of scope for the tutorial.
- The Mermaid diagram uses `\n` for line breaks inside node labels, which works in most Mermaid renderers but not all; this is a rendering concern, not a technical correctness issue.

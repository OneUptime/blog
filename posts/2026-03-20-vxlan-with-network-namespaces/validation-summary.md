# Validation Summary: How to Use VXLAN with Network Namespaces

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- VXLAN (Virtual eXtensible LAN)
- Linux network namespaces (`ip netns`)
- Linux bridge (`br-vxlan`)
- veth pairs
- iproute2 (`ip link`, `ip addr`, `ip route`, `bridge fdb`)
- Head-end replication for unicast VXLAN

## Sources Consulted
- RFC 7348 — VXLAN specification (https://datatracker.ietf.org/doc/html/rfc7348)
- iproute2 `ip-link(8)` man page (https://man7.org/linux/man-pages/man8/ip-link.8.html)
- iproute2 `bridge(8)` man page (https://man7.org/linux/man-pages/man8/bridge.8.html)
- iproute2 `ip-netns(8)` man page (https://man7.org/linux/man-pages/man8/ip-netns.8.html)
- Linux kernel VXLAN documentation (https://www.kernel.org/doc/Documentation/networking/vxlan.txt)
- Vincent Bernat — "VXLAN & Linux" (https://vincent.bernat.ch/en/blog/2017-vxlan-linux)
- Red Hat RHEL 8 VXLAN configuration documentation

## Issues Found
- **Mermaid diagram inconsistency** — The diagram labeled the in-namespace interfaces as `veth1` / `veth2`, but the code creates the veth pair as `veth1` / `veth1-peer` and moves the `-peer` end into the namespace. Updated the diagram labels to `veth1-peer: 10.200.0.11/24` and `veth2-peer: 10.200.0.12/24` so they match the shell commands. Also changed the bridge label from `br0` to `br-vxlan`, the name used in the commands.

## Review Notes
- VXLAN default port 4789 is the correct IANA value (RFC 7348). Historically Linux used 8472 before the IANA assignment, but the post explicitly sets `dstport 4789`, which is good practice.
- The `ip link add ... type vxlan id 1000 dstport 4789 local 10.0.0.1 dev eth0` command intentionally omits a `group` (multicast) and `remote` argument because Step 4 manually configures head-end replication via `bridge fdb append 00:00:00:00:00:00`. This is a valid, common pattern for unicast VXLAN; the all-zero MAC entry steers all BUM (broadcast, unknown-unicast, multicast) frames to the listed remote VTEP(s).
- `ip link set <dev> type bridge stp_state 0` is the correct iproute2 syntax to disable STP on a bridge.
- VNI 1000 is valid (VNI is a 24-bit field; range 0–16,777,215).
- The conclusion line "Namespaces cannot communicate with each other or the VXLAN directly" is a slight simplification — the technical reason is that the veth architecture places the only path through the bridge — but it is not incorrect for readers of a tutorial, and phrasing is the author's choice, so it was left unchanged.
- For production/multi-peer setups, readers should note that `bridge fdb append ... dst <peer>` must be repeated for each remote VTEP, or multicast/group mode should be used; this is outside the scope of the post.

# Validation Summary: How to Create a VXLAN Overlay Network Between Two Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VXLAN (Virtual Extensible LAN) — RFC 7348
- Linux iproute2 (`ip link`, `ip addr`)
- Linux bridge utilities (`bridge fdb`)
- iptables
- tcpdump / traceroute

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN) — https://datatracker.ietf.org/doc/html/rfc7348
- iproute2 man pages: `ip-link(8)` — VXLAN link type options — https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` man page — FDB subcommand — https://man7.org/linux/man-pages/man8/bridge.8.html
- IANA Service Name and Transport Protocol Port Number Registry (UDP/4789 for VXLAN)
- Linux kernel VXLAN documentation — Documentation/networking/vxlan.rst

## Issues Found
No technical issues found.

All commands and configuration are accurate:
- VXLAN default UDP port 4789 matches the IANA/RFC 7348 assignment.
- `ip link add ... type vxlan id <VNI> dstport 4789 local <IP> dev <iface>` is valid iproute2 syntax.
- VNI 1000 is within the valid 24-bit VXLAN Network Identifier range.
- `ip link set <br> type bridge stp_state 0` is a supported way to disable STP on a bridge via iproute2.
- `bridge fdb append 00:00:00:00:00:00 dev vxlanN dst <remote>` is the correct idiom for adding a head-end-replication flood entry for BUM (Broadcast, Unknown-unicast, Multicast) traffic when not using IP multicast.
- iptables rule allowing UDP/4789 on INPUT is correct for permitting inbound VXLAN encapsulated traffic.
- tcpdump filters (`udp port 4789` on the underlay, and capturing on `br-overlay` for inner frames) are accurate.

## Review Notes
- The post uses `append` for the flood FDB entry, which is correct when you want to add multiple remote VTEPs (one per remote host) for head-end replication. For a single remote, `bridge fdb add` would also work; `append` is the more general-purpose choice when scaling to more hosts, which the conclusion alludes to.
- The post does not mention `nolearning` / `learning` VXLAN options; default behavior (learning enabled) is assumed, which is fine for a basic two-host tutorial.
- MTU is not adjusted; real deployments should account for the 50-byte VXLAN overhead (outer Ethernet 14 + IP 20 + UDP 8 + VXLAN 8 = 50) to avoid fragmentation. This is a potential future improvement but not a technical error in the post as written.
- The `traceroute` comment ("should show direct VXLAN path") is accurate in the sense that the two overlay IPs are on the same /24 and share an L2 domain, so traceroute will show a single hop; there is no intermediate L3 router on the overlay.

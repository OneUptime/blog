# Validation Summary: How to Configure VXLAN with Multiple VTEPs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN, RFC 7348)
- VTEP (VXLAN Tunnel Endpoint)
- Linux `iproute2` (`ip link`, `bridge fdb`)
- Linux FDB (Forwarding Database) head-end replication
- IP multicast for BUM traffic (239.0.0.0/8 administratively-scoped range)
- UDP port 4789 (IANA-assigned VXLAN port)
- `tcpdump` for packet capture

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)
- Linux kernel documentation: `Documentation/networking/vxlan.rst`
- `ip-link(8)` and `bridge(8)` / `bridge-fdb(8)` manpages from iproute2
- Red Hat "Configuring a VXLAN" networking guide
- Vincent Bernat's "VXLAN & Linux" write-up (authoritative community reference)
- NVIDIA/Cumulus documentation on VXLAN head-end replication and BUM traffic
- GNU Bash Reference Manual §3.1.2.1 (Escape Character / line continuation)
- IANA Service Name and Transport Protocol Port Number Registry (UDP 4789)

## Issues Found

1. **`bridge fdb add` used for multiple entries with the same MAC (00:00:00:00:00:00).** For head-end replication, a second `add` with the same MAC fails with `RTNETLINK answers: File exists`. The correct command for adding additional entries that share a MAC is `append`. Changed all head-end-replication commands to `bridge fdb append ...` and added a brief comment explaining why.

2. **Non-standard `via eth0` parameter in `bridge fdb` commands.** The `via DEVICE` option is not part of the standard VXLAN head-end-replication pattern documented in the kernel `vxlan.rst`, iproute2 manpage, or Red Hat/NVIDIA references. The underlay route determines egress; `via eth0` is unnecessary and can conflict with routing. Removed `via eth0` from all four FDB commands.

3. **Incorrect BUM expansion.** The post said "Broadcast/Unknown Multicast". The standard industry expansion (RFC 7348 context, Cisco/Arista/NVIDIA/Cloudflare docs) is "Broadcast, Unknown unicast, Multicast". Corrected.

4. **Inline comment breaking bash line continuation in the multicast example.** The line `group 239.1.1.10 \   # Multicast group for VNI 10` does not continue — the `\` escapes a space, not the newline, so the `#` starts a comment that terminates the command. `dev eth0` on the next line would then be parsed as a separate (failing) command. Moved the comment above the command so the `\` is the final character on its line and the command parses correctly.

## Review Notes
- The multicast example passes `dev eth0` as the underlay interface. This is required when using `group` (the kernel needs to know which interface to join the multicast group on); the example correctly includes it.
- 239.1.1.10 is within the administratively-scoped IPv4 multicast range (239.0.0.0/8) per RFC 2365 — a reasonable choice for a lab/overlay demo.
- UDP port 4789 is the IANA-assigned VXLAN port; older Linux kernels historically defaulted to 8472, so explicitly setting `dstport 4789` (as the post does) is the correct modern practice.
- `nolearning` plus static FDB is the standard approach when an external control plane (e.g., EVPN/BGP) manages MAC-to-VTEP mapping; the takeaway correctly notes this.
- The post does not cover MTU considerations (VXLAN adds 50 bytes of overhead for IPv4 underlay), which could be a useful future addition but is out of scope for this review.

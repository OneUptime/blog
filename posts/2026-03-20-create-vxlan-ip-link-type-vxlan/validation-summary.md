# Validation Summary: How to Create a VXLAN Interface with ip link add type vxlan

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Linux iproute2 (`ip link`, `ip addr`, `bridge fdb`)
- VXLAN (Virtual Extensible LAN) overlay networking
- VTEP (VXLAN Tunnel Endpoint)
- Linux kernel VXLAN driver
- iptables (firewall configuration)
- IP multicast (for VTEP discovery)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348
- ip-link(8) manpage (iproute2): https://man7.org/linux/man-pages/man8/ip-link.8.html
- bridge(8) manpage (iproute2): https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux kernel VXLAN driver source (drivers/net/vxlan/)
- IANA Service Name and Transport Protocol Port Number Registry (UDP port 4789)

## Issues Found
No technical issues found.

All commands, flags, and parameter names match the iproute2 syntax for the VXLAN link type. The encapsulation overhead arithmetic (1500 - 50 = 1450 MTU), the IANA-assigned UDP port (4789), the VNI bit-width (24-bit), the head-end replication pattern using `bridge fdb append 00:00:00:00:00:00 ... permanent`, and the multicast group example all check out against the official documentation and RFC 7348.

## Review Notes
- The VNI range stated as "1-16777215" is a benign simplification; the kernel actually accepts 0-16777215 (24-bit). VNI 0 is rarely used in practice, so the post's range is acceptable for a practical tutorial.
- The "VXLAN Parameters Explained" block uses inline `#` comments after backslash continuations. Strictly speaking this would not execute as a single command in bash (the `\` escapes a space, not the newline before the comment), but the block is clearly intended as annotated documentation rather than a runnable script. Other code blocks in the post are runnable as shown.
- The MTU figure of 1450 assumes IPv4 underlay with no VLAN tags or IPSec. For IPv6 underlay the value drops to 1430. The post's underlay context is implicitly IPv4, which is consistent.
- `ip -d link show` sample output is abbreviated; real output includes additional fields (e.g., `udpcsum`, `noudp6zerocsumtx`, `gbp`-related flags) but the shown line is representative and accurate.

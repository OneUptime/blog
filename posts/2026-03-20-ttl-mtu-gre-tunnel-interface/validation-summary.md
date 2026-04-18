# Validation Summary: How to Set the TTL and MTU on a GRE Tunnel Interface

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux networking
- GRE (Generic Routing Encapsulation) tunnels — RFC 2784 / RFC 1701
- iproute2 (`ip tunnel`, `ip link`)
- iptables (TCPMSS target)
- TCP MSS clamping / Path MTU Discovery
- ICMP (ping for MTU testing)
- IPv4 and IPv6 encapsulation overhead

## Sources Consulted
- `ip-tunnel(8)` man page — iproute2 — https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-link(8)` man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- `iptables-extensions(8)` — TCPMSS target — https://ipset.netfilter.org/iptables-extensions.man.html
- `ping(8)` man page — https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 2784 — Generic Routing Encapsulation — https://www.rfc-editor.org/rfc/rfc2784
- RFC 8200 — IPv6 Specification (40-byte fixed header) — https://www.rfc-editor.org/rfc/rfc8200
- RFC 879 / RFC 6691 — TCP MSS calculation
- Linux kernel `net/ipv4/ip_gre.c` (TTL defaults)

## Issues Found

1. **Incorrect IPv6 header size difference** — The post stated "For GRE over IPv6 (6 bytes larger outer header)". The IPv6 fixed header is 40 bytes vs. IPv4's 20 bytes, so the outer header is 20 bytes larger (matching the 44 − 24 = 20 byte overhead difference shown in the numeric example below it). Changed "6 bytes" to "20 bytes".

2. **Contradictory TTL guidance between body and conclusion** — The body correctly labelled TTL=255 as "maximum" and TTL=64 as "common for LAN tunnels", but the conclusion inverted this, saying "Set TTL to 255 for LAN tunnels or 64 for internet-facing tunnels." Internet-facing tunnels benefit from a larger TTL because encapsulated packets may traverse many hops; LAN tunnels with few hops are fine with the Linux default of 64. Rewrote the conclusion sentence to "Set TTL to 64 for LAN tunnels or 255 for internet-facing tunnels where packets may need to traverse many hops."

## Review Notes

- GRE overhead math (24 bytes IPv4, 44 bytes IPv6) and resulting MTUs (1476 / 1456) are correct.
- TCPMSS value of 1436 is correct for MTU 1476 (1476 − 20 IP − 20 TCP = 1436).
- `ping -s 1448 -M do` math is correct: 1448 payload + 8 ICMP + 20 IP = 1476 bytes.
- `ip tunnel change gre0 [no]pmtudisc` syntax verified against the ip-tunnel(8) man page.
- The iptables TCPMSS example uses legacy `iptables`; on modern systems using `nftables`, the equivalent is `nft ... tcp option maxseg size set rt mtu` or using `iptables-nft`. Not an error, but a note for future modernization.
- Consider mentioning that `ip tunnel` is partially superseded by `ip link add type gretap` / `ip link add type gre` for newer workflows, though `ip tunnel` is still fully supported.

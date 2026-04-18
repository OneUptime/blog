# Validation Summary: How to Understand Tunnel MTU Considerations for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 (RFC 8200)
- 6in4 / SIT tunneling (RFC 4213)
- GRE encapsulation (RFC 2784, RFC 7676)
- IPsec ESP (RFC 4303)
- VXLAN (RFC 7348)
- Path MTU Discovery for IPv6 (RFC 8201)
- Linux `iproute2` (`ip tunnel`, `ip link`, `ip -6 addr`, `ip -6 route`)
- `iputils` (`ping6`, `tracepath6`)
- `ip6tables` TCPMSS mangle target

## Sources Consulted
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200 (minimum link MTU of 1280 octets; source-only fragmentation)
- RFC 8201 — Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- RFC 4213 — Basic Transition Mechanisms for IPv6 Hosts and Routers: https://www.rfc-editor.org/rfc/rfc4213 (6in4/SIT, 20-byte IPv4 encapsulation)
- RFC 2784 — Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784 (minimum 4-byte GRE header)
- RFC 7676 — IPv6 Support for GRE: https://www.rfc-editor.org/rfc/rfc7676
- RFC 7348 — VXLAN: https://www.rfc-editor.org/rfc/rfc7348 (50-byte overhead on outer IPv4, 70 bytes on outer IPv6 when carrying inner Ethernet)
- `iproute2` man pages: `ip-tunnel(8)`, `ip-link(8)`, `ip-route(8)`
- `iputils` man pages: `ping(8)` (`-M do`, `-s`), `tracepath(8)`
- `ip6tables-extensions(8)` for `TCPMSS --clamp-mss-to-pmtu`

## Issues Found

1. **Table row labeled "IPv4-in-IPv4 (6in4/SIT)"** — incorrect. 6in4 and SIT encapsulate IPv6 inside IPv4, not IPv4 inside IPv4. Changed to **"IPv6-in-IPv4 (6in4/SIT)"**. The overhead value (20 bytes) and effective MTU (1480) were already correct.

2. **GRE over IPv6 overhead listed as "40 bytes (IPv6 + GRE)"** — mathematically impossible since the IPv6 header alone is 40 bytes and the minimum GRE header (RFC 2784) adds 4 more. Corrected the overhead to **44 bytes** and the effective IPv6 MTU on a 1500-byte link to **1456 bytes** (1500 − 44).

## Review Notes

- The `ping6 -M do -s 1432` math (1480 − 40 IPv6 − 8 ICMPv6 = 1432) is correct given a tunnel MTU of 1480.
- `ping6` and `tracepath6` are deprecated aliases in modern `iputils` (they now invoke `ping -6` / `tracepath -6`), but still work and remain widely documented, so no change was made.
- VXLAN-over-IPv6 overhead of 70 bytes is accurate when accounting for outer IPv6 (40) + UDP (8) + VXLAN (8) + inner Ethernet (14). This is the correct value when "effective IPv6 MTU" is interpreted as the usable inner IP MTU behind the inner Ethernet frame; this nuance could be clarified in a future revision.
- IPsec ESP overhead genuinely varies with cipher, authentication, IV/nonce, padding, and outer IP version; the 50–70 byte range is a reasonable approximation for common AES-GCM/CBC configurations with an IPv4 outer header.
- The `ip6tables ... TCPMSS --clamp-mss-to-pmtu` rule is valid; note that `nftables` is the modern replacement on recent distributions, but `ip6tables` remains supported via the `iptables-nft` shim.

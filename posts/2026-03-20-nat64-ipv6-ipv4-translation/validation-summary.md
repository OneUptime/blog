# Validation Summary: How to Understand NAT64 for IPv6-to-IPv4 Translation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NAT64 (RFC 6146)
- DNS64 (RFC 6147)
- IPv4/IPv6 Well-Known Prefix `64:ff9b::/96` (RFC 6052)
- Tayga (open-source stateless NAT64 implementation)
- BIND 9 (DNS64 configuration)
- iptables (MASQUERADE)
- 464XLAT (RFC 6877)
- Linux networking utilities (`ip`, `sysctl`, `ping6`, `traceroute6`, `dig`)

## Sources Consulted
- RFC 6146 — Stateful NAT64: https://www.rfc-editor.org/rfc/rfc6146
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 6147 — DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6877 — 464XLAT: https://www.rfc-editor.org/rfc/rfc6877
- RFC 7915 — IP/ICMP Translation Algorithm (stateless): https://www.rfc-editor.org/rfc/rfc7915
- Tayga man page (tayga.conf): https://manpages.ubuntu.com/manpages/bionic/man5/tayga.conf.5.html
- BIND 9 ARM (DNS64 options): https://bind9.readthedocs.io/en/latest/reference.html
- iputils ping6 man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- dig man page: https://linux.die.net/man/1/dig

## Issues Found
No technical issues found.

Verified items:
- RFC 6146 attribution for NAT64 is correct.
- Well-Known Prefix `64:ff9b::/96` (RFC 6052) is correct.
- IPv4→hex embedding for `203.0.113.1` → `cb00:7101` is mathematically correct (computed: `0xCB 0x00 0x71 0x01`).
- Tayga config directives (`tun-device`, `ipv4-addr`, `prefix`, `dynamic-pool`, `data-dir`) match the official `tayga.conf(5)` man page.
- `tayga --mktun` correctly creates the TUN device.
- BIND `dns64` block syntax with `clients`, `mapped`, and `exclude` ACL clauses is valid per the BIND 9 ARM.
- 464XLAT description (CLAT + NAT64) is accurate.
- `dig AAAA <name> @<server>` ordering is valid; dig accepts arguments in any order.

## Review Notes
- Tayga is described as "stateless NAT64", which matches the project's own framing and its RFC 6145/7915 lineage. Note that Tayga's `dynamic-pool` feature does maintain per-flow mappings (with a timeout), so combined with `iptables MASQUERADE` it provides effectively stateful many-to-one behavior — the post's setup is the standard idiom for this.
- `ping6` and `traceroute6` still ship in modern `iputils`, but are increasingly considered legacy aliases. Modern equivalents are `ping -6` and `tracepath -6` / `traceroute -6`. The commands shown still work and are not incorrect.
- `ip addr add 192.168.255.1 dev nat64` defaults to a /32 prefix length when omitted; this works in this configuration because the `192.168.255.0/24` route is added explicitly afterward, but writing `ip addr add 192.168.255.1/24 dev nat64` would be more conventional. Not a technical error.
- The post mentions RFC 6146 (stateful NAT64) at the top but uses Tayga (stateless RFC 7915) plus iptables MASQUERADE for the implementation. This hybrid approach is widely used and the framing is acceptable for an introductory tutorial.
- DNS64 (RFC 6147) is not explicitly cited but the section is technically accurate; a citation could be added in a future revision for completeness.

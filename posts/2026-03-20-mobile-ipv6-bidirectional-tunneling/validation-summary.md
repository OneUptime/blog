# Validation Summary: How to Understand Mobile IPv6 Bidirectional Tunneling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mobile IPv6 (MIPv6)
- Bidirectional Tunneling (BT)
- IPv6-in-IPv6 encapsulation (ip6ip6)
- Linux iproute2 (ip tunnel, ip route, ip addr)
- tcpdump
- netstat
- Mermaid sequence diagrams

## Sources Consulted
- RFC 6275 — Mobile IPv6 (https://www.rfc-editor.org/rfc/rfc6275)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32) (https://www.rfc-editor.org/rfc/rfc3849)
- RFC 2473 — Generic Packet Tunneling in IPv6 Specification (https://www.rfc-editor.org/rfc/rfc2473)
- IANA Protocol Numbers (Next Header 41 = IPv6 encapsulation, 6 = TCP) (https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml)
- Linux iproute2 `ip-tunnel(8)` man page (verified locally — ip6ip6 listed as a valid MODE)
- Linux `netstat(8)` man page

## Issues Found
- **Invalid hex IPv6 addresses in code/text examples.** The post used `2001:db8:home::1`, `2001:db8:home::100`, `2001:db8:foreign::50`, and `2001:db8:cn::200` as example addresses. These contain non-hex characters (`h`, `o`, `m`, `r`, `i`, `g`, `n`) and would cause real `ip` commands to fail with "inet6 address is expected" (verified by running the commands locally). Replaced with valid documentation-prefix addresses while preserving the role labels in parentheses:
  - `2001:db8:home::1` → `2001:db8:1::1` (HA)
  - `2001:db8:home::100` → `2001:db8:1::100` (HoA)
  - `2001:db8:foreign::50` → `2001:db8:2::50` (CoA)
  - `2001:db8:cn::200` → `2001:db8:3::200` (CN)

## Review Notes
- Bidirectional Tunneling being the default routing mode for MIPv6 is consistent with RFC 6275 §5 / §11.
- Next Header values 41 (IPv6) and 6 (TCP) verified against IANA assignments.
- Home Agent intercepting CN→HoA packets via Proxy Neighbor Discovery is consistent with RFC 6275 §10.4.1.
- Linux `ip tunnel ... mode ip6ip6` is accepted by modern iproute2 (the `ip-tunnel(8)` man page lists `ip6ip6` as a valid MODE and the parser auto-detects the address family). Using `ip -6 tunnel ...` would also be valid but is not required.
- `netstat -s6` works as a combined short flag in net-tools (verified locally), so it is left as-is. `netstat -s -6` would also be valid.
- The MN's `ip -6 route add default dev mn-home` example is intentionally simplified; in practice a more-specific host route to the HA via the foreign-network gateway is needed to avoid recursive encapsulation. This is a tutorial trade-off rather than a technical error, so it was left unchanged.
- Mermaid `\n` line breaks inside `participant ... as` labels and within message labels render inconsistently across Mermaid versions (newer versions prefer `<br/>`). Kept as-is since rendering style is outside the technical-correctness scope.

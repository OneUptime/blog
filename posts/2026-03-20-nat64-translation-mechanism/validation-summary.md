# Validation Summary: How to Understand NAT64 Translation Mechanism

## Status
validated

## Post Type
Reference / Conceptual guide

## Technologies Covered
- NAT64 (RFC 6146 — Stateful NAT64)
- DNS64 (RFC 6147)
- IPv4-Embedded IPv6 Address format (RFC 6052)
- IP/ICMP Translation Algorithm (RFC 7915)
- IPv6 transition mechanisms

## Sources Consulted
- RFC 6146 — Stateful NAT64: https://datatracker.ietf.org/doc/html/rfc6146
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators: https://datatracker.ietf.org/doc/html/rfc6052
- RFC 6147 — DNS64: https://datatracker.ietf.org/doc/html/rfc6147
- RFC 7915 — IP/ICMP Translation Algorithm: https://datatracker.ietf.org/doc/html/rfc7915
- IANA Protocol Numbers (TCP=6, UDP=17, ICMP=1, ICMPv6=58)

## Issues Found

1. **Incorrect claim about IPv4 bit positions for non-/96 NAT64 prefixes.**
   The post stated: "The IPv4 address occupies bits 96–127 in all cases." This is only true for the /96 prefix. RFC 6052 §2.2 specifies that for /32, /40, /48, /56, and /64 prefixes the IPv4 address is split across different bit positions, and bits 64–71 (the "u" octet) are reserved and MUST be zero. Updated the sentence to accurately describe both cases.

2. **Incorrect /48 embedding example.**
   The example showed `2001:db8:cafe::/48` + `192.0.2.1` → `2001:db8:cafe::c000:0201`, which is the /96-style embedding (IPv4 appended at the tail). For a /48 prefix the first 16 bits of the IPv4 go at bits 48–63, the "u" octet (00) goes at bits 64–71, and the remaining 16 bits of the IPv4 go at bits 72–87. The correct result for `192.0.2.1` (= `0xc0000201`) is `2001:db8:cafe:c000:2:100::`. Fixed to match RFC 6052 §2.2/§2.4 (verified against the RFC's own example for `192.0.2.33` with `2001:db8:122::/48` → `2001:db8:122:c000:2:2100::`).

## Review Notes

- Verified the well-known NAT64 prefix `64:ff9b::/96` (RFC 6052 §2.1) and the IPv4-to-IPv6 mappings in the address-architecture table — all three (`93.184.216.34` → `5db8:d822`, `8.8.8.8` → `808:808`, `1.1.1.1` → `101:101`) are correct.
- Verified protocol numbers in the header-translation section (TCP=6, UDP=17, ICMP=1, ICMPv6=58) and the reference to RFC 7915 for IP/ICMP translation (which obsoleted RFC 6145).
- The translation-table example uses `IPv6 Dst` notation like `64:ff9b::5db8:d822:80` where `:80` denotes the destination port. This is informal but acceptable for an illustrative table; a stricter notation would put the port outside the address (e.g. `[64:ff9b::5db8:d822]:80`). Left unchanged as a stylistic choice.
- The mention of the well-known prefix `64:ff9b::/96` is complete enough for the post's scope. RFC 8215 also defines `64:ff9b:1::/48` for local use, but that is out of scope here.

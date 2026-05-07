# Validation Summary: How to Understand the AS112 IPv6 Service Address

## Status
validated

## Post Type
Reference

## Technologies Covered
- AS112
- DNS
- Reverse DNS
- IPv6
- BIND
- BGP anycast

## Sources Consulted
- RFC 7534: AS112 Nameserver Operations - https://www.rfc-editor.org/rfc/rfc7534
- RFC 7535: AS112 Redirection Using DNAME - https://www.rfc-editor.org/rfc/rfc7535
- RFC 6303: Locally Served DNS Zones - https://www.rfc-editor.org/rfc/rfc6303
- IANA Locally-Served DNS Zones Registry - https://www.iana.org/assignments/locally-served-dns-zones/locally-served-dns-zones.xhtml
- AS112 Project - https://www.as112.net/
- Current public DNS for `blackhole.as112.arpa`, `blackhole-1.iana.org`, `blackhole-2.iana.org`, and `prisoner.iana.org` verified locally with `dig`

## Issues Found
- The post treated `2001:4:112::` and `2620:4f:8000::` as individual anycast service addresses. I corrected this to the RFC-defined `/48` service prefixes and the published nameserver addresses within them.
- The post implied AS112 directly answers IPv6 ULA PTR queries at those addresses. I corrected this to distinguish the original direct-delegation service from the DNAME redirection service hosted at `EMPTY.AS112.ARPA`.
- The IPv6 zone list was inaccurate. I removed `c.f.ip6.arpa.`, kept `d.f.ip6.arpa.` for `fd00::/8`, corrected the link-local nibble-zone mappings to `/12`, and added the remaining RFC 6303 IPv6 candidate zones for completeness.
- The BIND snippet used `type forward` while labeling it as DNAME delegation / AS112 node operation. I replaced it with valid DNAME zone-data syntax based on RFC 7535.
- The monitoring commands targeted unassigned prefix addresses and used `ping6`. I updated them to concrete published IPv6 nameserver addresses and current `ping -6` usage, and I changed the `dig` examples to query names the AS112 servers are actually authoritative for.
- The introduction and conclusion implied queries would hit root servers and that recursive resolvers should forward local reverse zones to AS112. I corrected this to describe leakage into the public DNS and to keep RFC 6303 local serving as the recommended resolver behavior.

## Review Notes
- The post is technically accurate for RFC 7534 and RFC 7535 behavior as of 2026-05-07.
- IPv6 transport reachability from the review environment was not consistently available, so live validation focused on current published AAAA records and RFC-defined service roles rather than full end-to-end IPv6 connectivity tests.

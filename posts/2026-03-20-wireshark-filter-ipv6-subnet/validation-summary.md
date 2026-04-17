# Validation Summary: How to Filter IPv6 Packets by Subnet in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filter language
- tshark (Wireshark CLI)
- IPv6 addressing (CIDR notation, RFC 3849 documentation prefix `2001:db8::/32`)
- IPv6 special prefixes: loopback (`::1/128`), link-local (`fe80::/10`), multicast (`ff00::/8`)
- Shell utilities used with tshark (awk, sort, uniq)

## Sources Consulted
- Wireshark display filter reference for IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark User's Guide, Building display filter expressions: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- tshark man page (options `-r`, `-Y`, `-T fields`, `-e`, `-w`)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — confirms `2001:db8::/32` is the reserved documentation prefix
- RFC 4291 (IP Version 6 Addressing Architecture) — IPv6 text representation uses hex digits 0-9, a-f only
- RFC 4861 (Neighbor Discovery for IPv6) — NDP uses link-local source addresses

## Issues Found
Two issues were identified and fixed:

1. **Invalid IPv6 addresses using non-hex characters.** Several examples used placeholder names (`clients`, `servers`, `site1`, `site2`, `internal`, `web`, `dns`, `dmz`) embedded in IPv6 addresses. IPv6 text representation only allows hex digits 0-9 and a-f (per RFC 4291), so addresses like `2001:db8:clients::/64` would be rejected by Wireshark's filter parser. Replaced each invalid address with a valid-hex equivalent within the `2001:db8::/32` documentation prefix (e.g., `clients` → `a`, `servers` → `b`, `web` → `c`, `dns` → `d`, `dmz` → `e`, `internal` → `ffff`, `site1` → `1`, `site2` → `2`). Kept the descriptive labels in the comments so the semantic intent remains clear.

2. **Misleading comment on the bidirectional shorthand filter.** The comment `# Shorthand: any traffic where EITHER endpoint is in the subnet` above `ipv6.addr == A && ipv6.addr == B` was incorrect. That filter actually matches packets where src/dst is in A **and** src/dst is in B — i.e., bidirectional traffic between two subnets, not "either endpoint is in the subnet". Updated the comment to: `# Shorthand: bidirectional traffic where one endpoint is in A and the other is in B`.

## Review Notes
- Wireshark's `ipv6.addr`, `ipv6.src`, and `ipv6.dst` fields all support CIDR/`/prefix-length` notation — this is a long-standing, well-supported feature.
- The filter `ipv6.src == fe80::/10` under "Practical Use Cases" captures traffic with a link-local source. NDP relies on link-local addressing but is a subset of link-local traffic; users wanting NDP specifically can combine with `icmpv6.type` filters (not required to fix, just a refinement).
- The `::1/128` syntax for loopback is equivalent to `::1` alone but explicitly emphasizes the single-host prefix — technically correct either way.
- All tshark options used (`-r`, `-Y`, `-T fields`, `-e`, `-w`) are current and correct.

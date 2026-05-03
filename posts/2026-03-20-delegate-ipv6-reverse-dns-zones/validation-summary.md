# Validation Summary: How to Delegate IPv6 Reverse DNS Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 (RFC 4291)
- DNS Reverse Zones (`ip6.arpa`, RFC 3596)
- DNS Zone Delegation (RFC 1034/1035)
- BIND 9 (named.conf zone configuration, SOA records)
- dig (DNS lookup utility, including `-x` for reverse lookups)

## Sources Consulted
- RFC 3596 (DNS Extensions to Support IP Version 6) - https://www.rfc-editor.org/rfc/rfc3596
- RFC 1034/1035 (DNS specifications) - https://www.rfc-editor.org/rfc/rfc1035
- RFC 4291 (IPv6 Addressing Architecture) - https://www.rfc-editor.org/rfc/rfc4291
- BIND 9 Administrator Reference Manual (zone statement, SOA, allow-transfer) - https://bind9.readthedocs.io/
- dig manual page (`-x` reverse lookup option) - https://man.archlinux.org/man/dig.1
- RIPE NCC IPv6 reverse DNS guidance - https://www.ripe.net/manage-ips-and-asns/db/support/configuring-reverse-dns/

## Issues Found
1. **Confusing comment in sub-delegation example.** The comment block read:
   ```
   ; The /64 relative to this zone is d.c.b.a (the /48 prefix is the zone name)
   ; 2001:db8:cafe:1::/64 → last nibbles: 1.0.0.0 relative to the /48 zone
   ```
   The placeholder `d.c.b.a` was inconsistent with the concrete `1.0.0.0` NS record on the line below, which could mislead readers about which nibbles to use for the example subnet. Replaced with a clearer explanation:
   ```
   ; A /64 adds 4 nibbles (the subnet ID, reversed) on top of the /48 zone name
   ; 2001:db8:cafe:1::/64 → subnet ID 0001 → reversed nibbles: 1.0.0.0
   ```

## Review Notes
- Verified the nibble-reversal arithmetic for all examples:
  - `/32` zone `8.b.d.0.1.0.0.2.ip6.arpa` for prefix `2001:0db8::/32` is correct.
  - `/48` zone `e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa` for prefix `2001:0db8:cafe::/48` is correct.
  - PTR record relative names are exactly 20 nibbles (32 total nibbles − 12 zone nibbles), correct for all three host examples (`::1`, `::2`, `cafe:1::1`).
- BIND `named.conf` zone block (`type master`, `file`, `allow-transfer`) is valid syntax. Modern BIND 9 also supports `type primary` as a synonym; `master` remains supported and is fine.
- SOA timer values (Refresh 3600, Retry 900, Expire 604800, Minimum 300) are reasonable defaults consistent with RFC 1912 recommendations.
- `dig -x <ipv6>` correctly performs the `ip6.arpa` reverse query.
- Minor stylistic note (not corrected): when querying the parent server for an NS record of a delegated child, dig commonly returns the records in the AUTHORITY section rather than the ANSWER section. The illustrative output in the post is plausible but simplified — readers running this against a real parent server may see the response in the authority section instead.
- The "Glue records" parenthetical is correct: glue is generally only required when the nameserver hostname falls inside the delegated zone itself, which is rare for reverse DNS where nameservers typically live in a forward zone.

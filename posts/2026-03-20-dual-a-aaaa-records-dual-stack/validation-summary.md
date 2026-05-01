# Validation Summary: How to Set Up Dual A and AAAA Records for Dual-Stack Domains

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- IPv4
- IPv6
- A records
- AAAA records
- CNAME records
- Happy Eyeballs
- `dig`
- `curl`

## Sources Consulted
- RFC 3596: DNS Extensions to Support IP Version 6 - https://www.rfc-editor.org/rfc/rfc3596
- RFC 8305: Happy Eyeballs Version 2: Better Connectivity Using Concurrency - https://www.rfc-editor.org/rfc/rfc8305
- RFC 8482: Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY - https://www.rfc-editor.org/info/rfc8482
- RFC 1034: Domain Names - Concepts and Facilities - https://www.rfc-editor.org/rfc/rfc1034
- RFC 2181: Clarifications to the DNS Specification - https://www.rfc-editor.org/rfc/rfc2181
- BIND 9 `dig` manual - https://bind9.readthedocs.io/en/v9.21.20/manpages.html
- `dig -h` (local CLI help)
- `curl --help all` (local CLI help)

## Issues Found
- The post recommended `dig ANY www.example.com` as an alternative way to verify both record types. I removed that guidance because RFC 8482 allows authoritative servers to minimize or omit `ANY` responses, so it is not a reliable audit method for checking dual-stack completeness.
- The zone-file comment labeled the child-zone `A` and `AAAA` records for `ns1` as "glue records". I changed that wording to describe them as address records for an in-zone name server host, because glue is provided by the parent zone in referral responses rather than as authoritative data in the child zone.
- The TTL section treated matching `A` and `AAAA` TTLs as strictly required and labeled mismatched values as "INCORRECT". I corrected this to best-practice language because `A` and `AAAA` are separate RRSets; matching TTLs are operationally cleaner, but differing TTLs are not inherently invalid.
- The Happy Eyeballs explanation overstated the algorithm by implying it simply prefers whichever DNS response arrives first and falls back after a fixed `~250ms` IPv6 failure window. I rewrote that section to match RFC 8305 more closely: queries are sent close together, connection attempts can begin before both answers arrive, IPv6 gets a slight preference, and the first successful connection wins.
- The `curl -v` example claimed the connection line should show IPv6 whenever IPv6 is available. I corrected that note because Happy Eyeballs may end up using either IPv6 or IPv4 depending on resolver timing and connection success.

## Review Notes
- The DNS zone snippets and shell examples are syntactically valid after the corrections.
- The examples mix documentation IPv6 addresses from `2001:db8::/32` with public IPv4 addresses. This is acceptable for illustration, but future cleanup could standardize all sample addresses on documentation-only prefixes.

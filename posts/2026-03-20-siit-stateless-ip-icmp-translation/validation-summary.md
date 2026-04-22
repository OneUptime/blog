# Validation Summary: How to Understand SIIT (Stateless IP/ICMP Translation)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SIIT / IP-ICMP translation
- IPv4 and IPv6 header translation
- ICMPv4 and ICMPv6 translation
- RFC 6052 IPv4-embedded IPv6 address mapping
- RFC 7757 Explicit Address Mapping Table (EAMT)
- Stateful NAT64
- 464XLAT CLAT
- Jool SIIT
- TAYGA

## Sources Consulted
- RFC 7915 - IP/ICMP Translation Algorithm: https://datatracker.ietf.org/doc/html/rfc7915
- RFC 6052 - IPv6 Addressing of IPv4/IPv6 Translators: https://datatracker.ietf.org/doc/html/rfc6052
- RFC 7757 - Explicit Address Mappings for Stateless IP/ICMP Translation: https://datatracker.ietf.org/doc/html/rfc7757
- RFC 6146 - Stateful NAT64: https://datatracker.ietf.org/doc/html/rfc6146
- RFC 6877 - 464XLAT: https://datatracker.ietf.org/doc/html/rfc6877
- Jool `instance` mode documentation: https://www.jool.mx/en/usr-flags-instance.html
- Jool `eamt` mode documentation: https://www.jool.mx/en/usr-flags-eamt.html
- Jool `global` mode documentation: https://www.jool.mx/en/usr-flags-global.html
- Jool IPv6 Address Pool / `pool6` documentation: https://www.jool.mx/en/pool6.html
- TAYGA README: https://github.com/openthread/tayga

## Issues Found
- The header translation tables overstated several mappings as direct one-to-one copies. Updated them to reflect RFC 7915 behavior: traffic class/TOS is copied by default, ICMP protocol numbers translate between ICMPv4 (1) and ICMPv6 (58), TTL/Hop Limit is decremented as router forwarding behavior, and addresses are mapped through RFC 6052 or EAMT rather than simply stripping or prepending a NAT64 prefix.
- The address mapping section described the mechanism as a generic NAT64-prefix operation. Updated it to describe RFC 6052 translation prefixes and clarify that the last-32-bit embedding shown applies to /96 prefixes.
- The ICMP table used non-standard shorthand for ICMPv4 "Too Big". Updated it to the RFC terminology: ICMPv4 Destination Unreachable code 4, "Fragmentation Needed", translates to ICMPv6 Packet Too Big type 2 code 0.
- The fragmentation section incorrectly said SIIT reassembles IPv4 fragments before translating. Corrected it to state that SIIT translates fragments independently and uses IPv6 Fragment Headers for IPv4 fragments, with the IPv6-to-IPv4 behavior aligned to RFC 7915.
- The Jool command snippet used obsolete/invalid `jool_siit pool6 add` and `jool_siit pool6 display` commands. Updated current Jool SIIT configuration to use `jool_siit global update pool6 ...` and `jool_siit global display`.
- The Jool EAMT example added overlapping mappings without `--force`, which Jool rejects by default. Changed the second mapping to a non-overlapping documentation prefix.
- The TAYGA bullet referred to "SIIT mode". TAYGA describes itself as a stateless NAT64 implementation, so the wording was corrected.

## Review Notes
- The post is now technically accurate for the RFC 7915 translation model and current Jool 4.x command style.
- Some advanced edge cases remain intentionally out of scope for a concise guide, including IPv4 options, IPv6 extension header handling, UDP zero-checksum handling, RFC 6791 ICMP source address mapping, and the RFC 6052 restrictions on using the Well-Known Prefix with non-global IPv4 addresses.

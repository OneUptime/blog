# Validation Summary: How to Advertise IPv6 Prefixes via BGP

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting (FRR)
- Cisco IOS / IOS XE routing configuration
- Prefix filtering with IPv6 prefix lists and route maps
- RPKI / IRR routing hygiene

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting static routing documentation: https://docs.frrouting.org/en/latest/static.html
- Cisco IOS BGP Configuration Guide, IPv6 Multiprotocol BGP: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-sy/irg-15-sy-book/ip6-mbgp-ext.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 unicast neighbors ... advertised-routes`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS XE IPv6 static routing guide, including `null0` examples: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-static-xe.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html

## Issues Found
- Several example IPv6 addresses were invalid because placeholders such as `myorg` and `peer` are not valid hexadecimal IPv6 fields. I replaced them with valid documentation-prefix examples under `2001:db8::/32` per RFC 3849.
- The FRRouting `network` section implied a generic route-table match. I corrected the wording to make clear that the advertised prefix must be an exact match in the routing table for the `network` statement example shown.
- The conditional-advertising section was technically incorrect. It showed a plain `network` statement, which is not FRR conditional advertisement. I replaced it with FRR’s documented `advertise-map` plus `exist-map` example structure.
- The best-practices bullet referred to `/64 host routes`, which is inaccurate because a host route in IPv6 is `/128`. I corrected that to `individual /64 subnets`.

## Review Notes
- FRRouting’s `network` origination behavior is version-sensitive. Current FRR documentation describes `bgp network import-check` defaults that require the route to exist in the RIB by default, while older FRR defaults differed.
- FRRouting conditional advertisement is processed by the BGP scanner, so changes are not always immediate; the documented default scanner interval is 60 seconds.

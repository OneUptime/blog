# Validation Summary: How to Configure Dual-Stack on Cisco Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv4
- IPv6
- Dual-stack routing
- Static routing
- OSPFv2
- OSPFv3
- BGP / MP-BGP
- IPv4 and IPv6 ACLs
- IPv6 Neighbor Discovery and Router Advertisements

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `ipv6 unicast-routing`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IOS IPv6 Command Reference, `ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference, OSPFv3 and IPv6 ND commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS IPv6 Command Reference, `ipv6 router ospf`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i4.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor activate`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html?bookSearch=true
- Cisco IOS IP Routing: BGP Command Reference, `network` command: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco Support, exact-match behavior for BGP `network` statements: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19345-bgp-noad.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 unicast summary`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/html/rfc4890

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:wan::1`, `2001:db8:lan::1`, and `2001:db8:peer::2`. Cisco IOS expects hexadecimal IPv6 notation, so these were replaced with valid documentation-prefix addresses under `2001:db8::/32`.
- The Router Advertisement section used older command forms: `ipv6 nd ra-interval`, `ipv6 nd ra-lifetime`, and `ipv6 nd suppress-ra`. These were updated to the current documented IOS forms `ipv6 nd ra interval`, `ipv6 nd ra lifetime`, and `ipv6 nd ra suppress all`.
- The BGP example advertised `10.0.0.0 mask 255.0.0.0` and `2001:db8:lan::/48`, but the earlier interface configuration only created connected routes for `10.0.0.0/24` and a single IPv6 `/64`. Because Cisco BGP `network` statements require matching routes in the RIB, these were corrected to `10.0.0.0/24` and `2001:db8:0:2::/64`.
- The BGP comment said both address families were on the same session, but the configuration actually defined separate IPv4 and IPv6 neighbors. The wording was corrected to match the example.
- The IPv6 ACL allowed `packet-too-big` but omitted other ICMPv6 error types commonly required for correct IPv6 operation. `destination-unreachable`, `time-exceeded`, and `parameter-problem` permits were added.

## Review Notes
- The post now aligns with classic Cisco IOS syntax. Newer Cisco platforms may also document OSPFv3 using `router ospfv3`, but the `ipv6 router ospf` and `ipv6 ospf ... area ...` syntax used here is still valid for Cisco IOS.
- Explicit `nd-na` and `nd-ns` ACL entries are not strictly required on many IOS releases because IPv6 ACLs implicitly permit those Neighbor Discovery messages, but keeping them explicit is harmless.

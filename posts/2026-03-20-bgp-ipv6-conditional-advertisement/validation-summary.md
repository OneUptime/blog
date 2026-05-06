# Validation Summary: How to Configure BGP IPv6 Conditional Advertisement

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- Conditional advertisement
- BIRD 2
- FRRouting
- Cisco IOS
- RIPEstat

## Sources Consulted
- BIRD 2.16 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting static route documentation: https://docs.frrouting.org/en/latest/static.html
- Cisco IOS BGP command reference for `neighbor advertise-map`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS XE BGP VRF-aware conditional advertisement guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-16/irg-xe-16-book/bgp-vrf-aware-conditional-advertisement.pdf
- Cisco IOS IPv6 command reference for `show bgp ipv6` and `show bgp ipv6 neighbors`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS IPv6 command reference for `match ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- RIPEstat BGP State API documentation: https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post claimed to explain IPv6 conditional advertisement, but the original body explained BGP communities and local preference instead. I replaced the explanation with actual conditional advertisement behavior based on `advertise-map`, `exist-map`, and `non-exist-map`.
- The original BIRD example was a community policy example, not conditional advertisement, and it also used an invalid placeholder IPv6 address. I replaced it with a documented BIRD pattern that makes the route itself conditional by using a BFD-controlled static IPv6 route and exporting it through BGP only while the route exists.
- The FRRouting example matched communities instead of using FRR's documented conditional advertisement feature. I rewrote it to use IPv6 prefix lists, route maps, and `neighbor ... advertise-map ... exist-map`.
- The Cisco IOS example also matched communities instead of using conditional advertisement. I rewrote it to use IPv6 prefix lists, route maps, and `neighbor ... advertise-map ... exist-map`.
- The testing section originally checked for community propagation and used a RIPEstat JSON path that does not match the current API documentation. It also used a documentation prefix for external visibility checks, which would not appear on the public Internet. I updated the commands to inspect conditional advertisements and corrected the RIPEstat query to use `.data.bgp_state` with a real-prefix placeholder.

## Review Notes
- BIRD does not document a native `advertise-map` / `exist-map` equivalent in the consulted manual, so the BIRD section uses the practical route-existence pattern that the manual does document.
- Conditional advertisement changes are not always immediate on platforms with scanner-based evaluation; operational timing depends on the implementation.

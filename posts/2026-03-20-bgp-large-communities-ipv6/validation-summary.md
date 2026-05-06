# Validation Summary: How to Use BGP Large Communities for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BGP
- IPv6
- BGP Large Communities
- RFC 8092
- BIRD 2
- FRRouting
- Cisco IOS XE
- RIPEstat
- OneUptime

## Sources Consulted
- RFC 8092 - BGP Large Communities Attribute: https://datatracker.ietf.org/doc/rfc8092/
- BIRD 2 User's Guide: https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS XE BGP Large Community documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-large-comm.html
- Cisco IOS XE Multiprotocol BGP for IPv6 documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/ipv-routing-multiprotocol-bgp-extensions-for-ipv.html
- RIPEstat Looking Glass API documentation: https://stat.ripe.net/docs/data-api/api-endpoints/looking-glass
- RIPE NCC announcement for the new RIS-based Looking Glass: https://www.ripe.net/about-us/news/new-ris-based-looking-glass-now-available-in-ripestat/
- OneUptime IP Monitor documentation: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Metrics Monitor documentation: https://oneuptime.com/docs/monitor/metrics-monitor

## Issues Found
- The post was about RFC 8092 large communities, but the explanation and examples used standard two-part communities. Updated the format section and all examples to use the correct three-part large community representation.
- The original community format example labeled `65000:100` as a well-known community, which is incorrect. Replaced the section with RFC 8092 large community examples and clarified that large communities do not have well-known values.
- The BIRD example matched `bgp_community`, used two-part values, omitted the mandatory `local ... as` configuration, and used an invalid IPv6 literal (`2001:db8:peer::1`). Updated it to use `bgp_large_community`, valid IPv6 documentation addresses, and an explicit local AS.
- The FRRouting example matched standard communities, defined a standard community list, and never applied the route-map to the neighbor. Updated it to use `match large-community`, applied the route-map inbound under the IPv6 address family, and added a fallback permit sequence so unmatched routes are not implicitly denied.
- The Cisco IOS example matched a standard community list instead of a large community list, omitted IPv6 neighbor activation, and would implicitly deny unmatched routes because the route-map had no trailing permit. Updated it to use `ip large-community-list`, added `neighbor ... activate`, and added a final permit sequence.
- The RIPE verification command used the `bgp-state` endpoint and a JSON path that does not expose large communities. Updated it to the RIPEstat Looking Glass endpoint, which documents and exposes parsed `largeCommunity` data.
- The OneUptime monitoring sentence implied direct BGP-session monitoring without context. Reworded it to refer to IPv6 reachability checks and exported BGP metrics such as session state and prefix counts.

## Review Notes
Use an actually announced prefix for external RIPEstat validation. Reserved documentation prefixes such as `2001:db8::/32` are appropriate in config examples, but they will not normally produce public looking-glass results.

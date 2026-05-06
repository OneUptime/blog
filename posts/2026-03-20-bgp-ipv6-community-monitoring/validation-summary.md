# Validation Summary: How to Monitor BGP IPv6 Community Propagation

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- BGP communities
- BIRD 2
- FRRouting
- Cisco IOS
- RIPEstat Data API
- `curl`
- `jq`
- OneUptime

## Sources Consulted
- RFC 1997, BGP Communities Attribute: https://datatracker.ietf.org/doc/rfc1997/
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- BIRD 2.17.3 User's Guide: https://bird.nic.cz/doc/bird-2.17.3.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- RIPEstat BGP State API documentation: https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state
- Cisco IOS IP Routing: BGP Command Reference (`ip bgp-community new-format`, `ip community-list`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-c1.html
- Cisco Multiprotocol BGP for IPv6 configuration guidance: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book/ip6-mbgp-ext.html
- Cisco support example for BGP community policy behavior: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/28784-bgp-community.html
- OneUptime documentation: https://oneuptime.com/docs

## Issues Found
- The standard-community example labeled `65000:100` as a well-known community. RFC 1997 reserves specific well-known values such as `NO_EXPORT` and `NO_ADVERTISE`, so the example comments were corrected to generic example communities.
- The configuration snippets used `2001:db8:peer::1`, which is not a valid IPv6 literal because `peer` is not hexadecimal. All examples were corrected to a valid documentation address, `2001:db8:1::1`.
- The BIRD example omitted `local as`, which BIRD documents as mandatory for BGP protocol configuration. `local as 64496;` was added.
- The FRRouting example defined a route-map but did not apply it to the IPv6 neighbor, used outdated `ip community-list standard` syntax instead of the current `bgp community-list standard` form, and would have implicitly denied unmatched routes. The route-map attachment, current community-list syntax, and a final permit sequence were added.
- The Cisco IOS example omitted `neighbor ... activate` for the IPv6 address family, omitted `ip bgp-community new-format` while using `AA:NN` community notation, and would have dropped unmatched routes without a trailing permit sequence. These lines were added.
- The RIPEstat example used the wrong JSON path, `.data.routes[].attrs.communities`, and described RIPEstat as a looking glass. RIPEstat's BGP State API documents the current fields as `.data.bgp_state[].community`, so the command and description were corrected.
- The OneUptime section claimed native BGP session-health and route-count monitoring. Current OneUptime docs document availability and response-time monitoring of services, so the text was narrowed to supported monitoring capabilities and now directs session/prefix telemetry to router-native BGP tooling.

## Review Notes
- No remaining technical issues after the corrections above.
- Standard communities are fixed 32-bit values. If a future revision wants to cover operators using 4-byte ASNs in more depth, adding a short note about large communities would improve precision, but the current post is accurate after the edits.

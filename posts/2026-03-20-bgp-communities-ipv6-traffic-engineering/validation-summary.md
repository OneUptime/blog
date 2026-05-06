# Validation Summary: How to Use BGP Communities for IPv6 Traffic Engineering

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- BGP standard communities
- BIRD 2
- FRRouting (FRR)
- Cisco IOS
- RIPEstat Data API

## Sources Consulted
- RFC 1997, "BGP Communities Attribute" - https://www.rfc-editor.org/rfc/rfc1997
- RFC 4291, "IPv6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291
- BIRD 2.16 User's Guide - https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation - https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Route Maps documentation - https://docs.frrouting.org/en/latest/routemap.html
- Cisco IOS IPv6 Configuration Guide: Implementing Multiprotocol BGP for IPv6 - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-1s/ipv6-15-1s-book/ip6-mptcl-bgp.html
- Cisco IOS BGP Command Reference: `ip community-list` and `ip bgp-community new-format` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-c1.html
- Cisco IOS BGP Command Reference: `match community` - https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- RIPEstat BGP State API documentation - https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state.html

## Issues Found
- The sample neighbor address `2001:db8:peer::1` was not a valid IPv6 literal because IPv6 hextets must be hexadecimal. I replaced it with the valid documentation address `2001:db8:100::1`.
- The standard community example incorrectly labeled `65000:100` as a well-known community. I changed the comment to an example standard community because RFC 1997 well-known communities are reserved values such as `NO_EXPORT` and `NO_ADVERTISE`.
- The FRR example defined a route map but did not apply it to the IPv6 neighbor, used older community-list syntax, and would have implicitly denied non-matching routes. I added `neighbor ... route-map COMMUNITY-POLICY in`, changed the community list to `bgp community-list standard ...`, and added a final empty permit entry.
- The Cisco IOS example had the same implicit route-map deny problem and used a numbered community list in the expanded range. I added `neighbor ... activate`, switched to a named standard community list, added a final empty permit entry, and enabled `ip bgp-community new-format` for the `ASN:value` representation used in the snippet.
- The RIPE verification command used a documentation-only prefix and an incorrect JSON path. I changed it to use a placeholder prefix and the correct RIPEstat field path: `.data.bgp_state[].community`.

## Review Notes
- The post is technically accurate after these fixes.
- The article is specifically about RFC 1997 standard communities. In networks that rely heavily on 4-byte ASNs, large communities are often easier to use operationally, but that is a scope note rather than a correctness issue in this post.

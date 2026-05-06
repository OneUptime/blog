# Validation Summary: How to Configure BGP IPv6 No-Export Community

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- RFC 1997 BGP communities
- BIRD 2
- FRRouting (FRR)
- Cisco IOS
- RIPE Stat API

## Sources Consulted
- RFC 1997: BGP Communities Attribute — https://www.rfc-editor.org/rfc/rfc1997
- BIRD 2 User's Guide — https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation — https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation — https://docs.frrouting.org/en/latest/routemap.html
- Cisco IOS IPv6 Command Reference (`neighbor send-community`) — https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.pdf
- Cisco IOS IPv6 Command Reference (`match ipv6 address`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IOS XE BGP Command Reference (`set community`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/iproute_bgp-xe-3se-3850-cr-book/iproute_bgp-xe-3se-3850-cr-book_chapter_011.pdf
- RIPE Stat BGP State API — https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post title and description focused on the well-known `no-export` community, but the original BIRD, FRR, and Cisco snippets implemented generic community matching and local-preference changes instead of setting `no-export`. I replaced those examples with configurations that actually attach the `no-export` community.
- The original examples used invalid IPv6 literals such as `2001:db8:peer::1`. I replaced them with valid documentation addresses.
- The standard community section incorrectly labeled `65000:100` as a well-known community. I corrected the explanation to distinguish custom standard communities from the reserved `no-export` well-known community.
- The RIPE Stat example used an outdated JSON path and a documentation prefix that would not appear on public collectors. I updated the command to the current `bgp-state` schema and changed the external verification example to check public route visibility for a real routed prefix.

## Review Notes
- FRR current documentation shows `neighbor ... send-community` is enabled by default, but keeping it explicit in the example is accurate and makes the intended behavior clear.
- The Cisco example uses `set community no-export`, which is valid. If preserving existing communities matters in a production policy, `additive` should be considered.
- The examples assume the advertised IPv6 routes already exist in the local routing table; the post remains focused on community policy rather than route origination.

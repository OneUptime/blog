# Validation Summary: How to Configure BGP IPv6 Local-Pref with Communities

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- Standard BGP communities
- BIRD 2
- FRRouting (FRR)
- Cisco IOS
- RIPEstat Data API

## Sources Consulted
- RFC 1997: BGP Communities Attribute — https://www.rfc-editor.org/rfc/rfc1997
- RFC 4271: A Border Gateway Protocol 4 (BGP-4) — https://www.rfc-editor.org/rfc/rfc4271
- RFC 4760: Multiprotocol Extensions for BGP-4 — https://www.rfc-editor.org/rfc/rfc4760.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html
- BIRD 2 User's Guide — https://bird.nic.cz/doc/bird-2.16.2.html
- FRRouting BGP documentation — https://docs.frrouting.org/en/latest/bgp.html
- FRRouting BGP community-list documentation — https://docs.frrouting.org/en/stable-6.0/bgp.html
- Cisco IOS IP Routing Protocol-Independent Command Reference (`set local-preference`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_S_through_T.html
- Cisco IOS BGP Command Reference (`match community`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/iproute_bgp-xe-3se-3850-cr-book/iproute_bgp-xe-3se-3850-cr-book_chapter_010.html
- Cisco IOS IPv6/BGP command reference (`show bgp ipv6 unicast`) — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS IPv6 MP-BGP configuration guidance (`neighbor activate`) — https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_bgp/configuration/15_0sy/ip6-mbgp-ext.html
- RIPEstat BGP State API — https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The standard community example incorrectly labeled `65000:100` as a well-known community. I changed it to a generic example because RFC 1997 well-known communities are reserved values such as `NO_EXPORT`, not arbitrary `ASN:value` pairs.
- The BIRD example used an invalid IPv6 address (`2001:db8:peer::1`) and omitted the local AS needed for the BGP session. I replaced the neighbor with a valid documentation address and added `local as 64496;`.
- The FRR example did not apply the inbound route map to the IPv6 neighbor. I added `neighbor ... route-map COMMUNITY-POLICY in` in the IPv6 unicast address-family block.
- The Cisco IOS example used an invalid IPv6 address, omitted `neighbor ... activate` for IPv6 MP-BGP, and used an incorrect community-list form for matching a standard community. I corrected the address, added `activate`, and replaced the list with a named standard community list referenced by `match community`.
- The BIRD verification command used the wrong `show route` form for checking a specific prefix. I updated it to `birdc "show route 2001:db8::/32 all"`.
- The RIPEstat verification example used the documentation prefix `2001:db8::/32` for external validation and queried an incorrect JSON path. I changed it to use a user-supplied announced prefix and the documented `.data.bgp_state[].community` field.

## Review Notes
- `LOCAL_PREF` is a local-AS attribute per RFC 4271. The post is correct to use received communities as triggers for setting local preference locally instead of expecting local preference to be propagated over standard eBGP.
- The local configuration examples can safely use `2001:db8::/32` documentation space, but any external RIPEstat or looking-glass check must use a real globally announced IPv6 prefix.

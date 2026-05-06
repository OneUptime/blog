# Validation Summary: How to Configure BGP IPv6 MED with Communities

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- BGP communities
- MED (Multi-Exit Discriminator)
- BIRD 2
- FRRouting (FRR)
- Cisco IOS
- RIPEstat Data API

## Sources Consulted
- RFC 1997: BGP Communities Attribute - https://www.rfc-editor.org/rfc/rfc1997
- RFC 4271: BGP-4 - https://www.rfc-editor.org/rfc/rfc4271
- BIRD 2.16 User's Guide - https://bird.nic.cz/doc/bird-2.16.2.html
- FRR Route Maps documentation - https://docs.frrouting.org/en/latest/routemap.html
- FRR BGP documentation - https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS IP Routing: BGP Command Reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IPv6 Command Reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html
- Cisco IOS IPv6 Multiprotocol BGP for IPv6 guide - https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_bgp/configuration/15_0sy/ip6-mbgp-ext.html
- RIPEstat BGP State API documentation - https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post title and description were about MED, but the BIRD, FRR, and Cisco examples were setting local preference instead of MED. I changed the examples to set MED (`bgp_med` in BIRD, `set metric` in FRR and Cisco) so the configuration matches the article's subject.
- The BIRD example used an invalid placeholder IPv6 neighbor address (`2001:db8:peer::1`) and omitted the mandatory local AS declaration. I replaced the neighbor with a valid documentation IPv6 address and added `local as 64496;`.
- The FRR example defined a route map but did not apply it to the IPv6 neighbor. I added the inbound `route-map` under `address-family ipv6 unicast`.
- The Cisco IOS example did not activate the IPv6 neighbor under the address family. I added `neighbor ... activate`.
- The Cisco IOS example used community list number `100` as if it were a standard community list. On Cisco IOS, standard numbered community lists are `1-99`, while `100+` is expanded. I changed the example to use standard list numbers `10` and `20`.
- The standard community examples labeled an arbitrary `ASN:value` as a "Well-known community", which is inaccurate. I changed the comments to generic example communities.
- The RIPEstat `jq` expression referenced `.data.routes[].attrs.communities`, which does not match the documented BGP State API schema. I corrected it to `.data.bgp_state[].community` and clarified that the user should replace the placeholder prefix.
- The MED explanation did not mention that MED is normally compared only among routes learned from the same neighboring AS. I added that constraint to the post text.

## Review Notes
- The examples now accurately show translating inbound community tags into local MED values for IPv6 BGP path selection.
- Community exchange itself still depends on the sending peer being configured to advertise communities. That prerequisite is implied by the examples but not expanded in the post.

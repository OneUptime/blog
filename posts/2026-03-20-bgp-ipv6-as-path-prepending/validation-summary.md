# Validation Summary: How to Configure BGP IPv6 AS-Path Prepending

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- AS-path prepending
- BIRD 2
- FRRouting
- Cisco IOS
- RIPEstat

## Sources Consulted
- RFC 4271, BGP-4: https://www.rfc-editor.org/rfc/rfc4271.html
- RFC 4760, Multiprotocol Extensions for BGP-4: https://www.rfc-editor.org/rfc/rfc4760.html
- RFC 2545, Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing: https://www.rfc-editor.org/rfc/rfc2545.html
- BIRD 2.0 User's Guide, Filters: https://bird.network.cz/?get_doc&f=bird-5.html&v=20
- BIRD 2.0 User's Guide, Remote control: https://bird.network.cz/?get_doc&f=bird-4.html&v=20
- BIRD 2.0 User's Guide, Protocols: https://bird.network.cz/?get_doc&f=bird-6.html&v=20
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- Cisco IOS IP Routing: BGP Command Reference, `set as-path prepend`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-n1.html
- Cisco IOS IPv6 Command Reference, `neighbor route-map` and `match ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 neighbors`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_12.html
- RIPEstat BGP State API: https://stat.ripe.net/docs/data-api/api-endpoints/bgp-state

## Issues Found
- The post was materially about BGP communities and local preference, not AS-path prepending. I replaced the explanation, examples, testing steps, monitoring note, and conclusion so they now match the title and describe outbound AS-path prepending for IPv6 correctly.
- The original BIRD2 example used community matching and `bgp_local_pref` instead of `bgp_path.prepend()`. I replaced it with a valid BIRD 2 filter that prepends the local ASN on export and a static IPv6 route that can actually be advertised.
- The original FRRouting example matched communities and set `local-preference`, which is an inbound attribute and not AS-path prepending. I changed it to an IPv6 prefix-list plus outbound route-map using `set as-path prepend` under `address-family ipv6 unicast`.
- The original Cisco IOS example also matched communities and set `local-preference` inbound. I corrected it to an IPv6 prefix-list plus outbound route-map using `set as-path prepend`, applied in the IPv6 address family.
- Several IPv6 neighbor examples used invalid literals such as `2001:db8:peer::1`. I replaced them with valid documentation-prefix IPv6 addresses.
- The testing section checked community propagation instead of advertised AS paths, and the RIPEstat `jq` path did not match the documented BGP State response structure. I updated the commands to use neighbor `advertised-routes` views and the RIPEstat `data.bgp_state[].path` field, while noting that the external query must use a publicly routed prefix.

## Review Notes
- The examples prepend the local ASN twice in policy, which results in three copies of the ASN on an eBGP advertisement because the local AS is already added once during eBGP advertisement per RFC 4271.
- The RIPEstat verification example now explicitly notes that a publicly routed prefix is required; the documentation prefix `2001:db8::/32` is reserved for examples and will not appear in the public Internet routing table.
- The external links in the post were checked: `https://oneuptime.com` responded successfully, and the author link redirected to the canonical GitHub profile URL.

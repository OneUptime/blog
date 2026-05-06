# Validation Summary: How to Configure BGP IPv6 Route Policies and Filters

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting
- Cisco IOS / IOS XE
- Prefix lists
- Route maps

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/stable-8.2/routemap.html
- FRRouting Filtering documentation: https://docs.frrouting.org/en/stable-9.1/filter.html
- Cisco IOS XE IPv6 Multiprotocol BGP documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-mbgp-ext-xe.html
- Cisco IOS IPv6 Command Reference for `match ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IOS XE BGP maximum-prefix documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-max-prefix.html
- Cisco IOS BGP command reference for `neighbor maximum-prefix`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The sample IPv6 prefixes and neighbor address used invalid hexadecimal groups such as `peer` and `mynet`. I replaced them with valid documentation-only addresses from `2001:db8::/32` per RFC 3849.
- The FRRouting and Cisco neighbor examples were incomplete because they did not define the BGP neighbor with `remote-as`, and the IPv6 address family examples did not activate the neighbor. I added the required neighbor definition and `activate` commands so the examples are minimally functional.
- The FRRouting route-map example used a prefix list with `deny` entries in a `match ipv6 address prefix-list` clause. Both FRRouting and Cisco document that route-map prefix-list matches apply to prefixes permitted by the prefix list, so the original logic would not reject the intended routes and the second route-map clause would never be reached. I rewrote the example so the reject list explicitly permits the default and special-use prefixes, the route map denies those matches, and the authorized peer space is permitted with `local-preference 150`.
- The FRRouting `maximum-prefix` example used Cisco-style `threshold` and `restart` arguments. FRRouting documents `neighbor PEER maximum-prefix NUMBER [force]`, so I corrected the example to valid FRR syntax and updated the explanation accordingly.
- The soft reset example used `soft in` even though FRRouting documents route refresh with `clear bgp PEER in` when the peer supports route refresh. I updated the section wording and commands to use `in` and `out` with the corrected neighbor address.
- The Cisco filtering section title referenced route maps even though the section only demonstrated prefix-list filtering. I renamed the heading to match the actual content.

## Review Notes
- The Cisco `maximum-prefix` syntax shown here follows Cisco IOS / IOS XE command reference behavior. Exact command modes can vary by Cisco platform family.
- The examples use documentation prefixes from `2001:db8::/32`, which are appropriate for instructional content and should not be used on production networks.

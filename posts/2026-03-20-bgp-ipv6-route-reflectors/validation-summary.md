# Validation Summary: How to Configure BGP IPv6 with Route Reflectors

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- Route Reflectors
- iBGP
- FRRouting
- Cisco BGP configuration

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 4456, BGP Route Reflection: An Alternative to Full Mesh Internal BGP (IBGP): https://www.rfc-editor.org/rfc/rfc4456
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Cisco BGP route reflectors documentation: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/bgp/bgp-config-cisco8000/r-wrapper-bgp-routing-optimisation-and-convergence-techniques/c-bgp-route-reflectors.html
- Cisco IOS BGP command reference for `neighbor route-reflector-client`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html

## Issues Found
- The FRRouting and Cisco examples used placeholder values such as `2001:db8::client1` and `2001:db8::rr`, which are not syntactically valid IPv6 addresses because IPv6 hextets may contain only hexadecimal digits. I replaced them with valid documentation-prefix IPv6 addresses.
- The FRRouting example placed `bgp cluster-id 1.1.1.1` inside the `address-family ipv6 unicast` block. FRRouting documents `bgp cluster-id A.B.C.D` as a BGP route-reflector configuration command at router scope, so I moved it to the main `router bgp` context.
- The verification example used `show bgp ipv6 unicast 2001:db8:client1::/48`, which is not a valid IPv6 prefix for the same reason as the peer-address examples. I replaced it with a valid documentation-prefix route.
- The post said `show bgp ipv6 unicast summary | grep -v "Established"` verifies reflected routes from all clients. FRRouting documents `show bgp ... summary` as a peer-summary command, and filtering out `Established` does the opposite of a successful verification. I changed this to `show bgp ipv6 unicast summary established` and updated the explanation so the command matches the verification goal.

## Review Notes
- The explanation that RR clients normally do not need `next-hop-self` is consistent with RFC 4456, which says a route reflector should not modify `NEXT_HOP` when reflecting routes. In practice, clients still need IGP or recursive reachability to the preserved next hop.

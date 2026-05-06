# Validation Summary: How to Use BGP Route Reflectors to Scale iBGP

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- BGP
- iBGP
- BGP route reflectors
- Cisco IOS BGP configuration

## Sources Consulted
- RFC 4456, "BGP Route Reflection: An Alternative to Full Mesh Internal BGP (IBGP)" - https://datatracker.ietf.org/doc/html/rfc4456
- Cisco IOS IP Routing: BGP Command Reference (`bgp cluster-id`) - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS IP Routing: BGP Command Reference (`neighbor next-hop-self`, `neighbor route-reflector-client`) - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco Configuring Internal BGP Features (`Configuring a Route Reflector`, route-map next-hop note) - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-int-features-0.pdf
- Cisco Support, "Use BGP Route Reflection and Multiple Cluster IDs" - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/200153-BGP-Route-Reflection-and-Multiple-Cluste.html

## Issues Found
- The verification section incorrectly said routes learned through the RR would show the RR as the `next-hop`. RFC 4456 says a route reflector should not modify `NEXT_HOP` when reflecting routes, and Cisco IOS documentation notes that `neighbor next-hop-self` on an RR does not rewrite reflected routes as intended. I updated the verification comments to state that reflected iBGP routes normally preserve the original next hop, and that the RR appears as the next hop only when it is explicitly rewritten on the RR.

## Review Notes
- The post uses classic Cisco IOS IPv4-unicast BGP syntax under `router bgp`. Newer IOS XE examples often use address-family configuration with `neighbor ... activate`, but the commands shown here remain valid for the style used in the post.
- Deploying two route reflectors per cluster is a common redundancy recommendation, not a protocol requirement.

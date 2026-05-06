# Validation Summary: How to Configure BGP Weight for Local Path Selection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BGP
- Cisco IOS
- Cisco IOS XE
- Route maps
- Prefix lists
- BGP path selection attributes

## Sources Consulted
- Cisco IOS IP Routing: BGP Command Reference, `neighbor weight` command: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IP Routing: BGP Command Reference, `set weight` command: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp4.html
- Cisco, Understand the Importance of BGP Weight Path Attribute: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/213285-understand-the-importance-of-bgp-weight.html
- Cisco IOS IP Routing: BGP Command Reference, `clear ip bgp` command: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp2.html
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/

## Issues Found
- The `show ip bgp` example displayed `LocPrf 100` for the two eBGP-learned routes even though the post did not configure local preference there. I removed the implied `LocPrf` values so the sample output aligns with Cisco’s documented examples for eBGP-learned paths.
- The MED row in the comparison table said MED is propagated to `eBGP only`. RFC 4271 states that MED received over eBGP may be propagated over iBGP within the same AS, and must not be propagated to other neighboring ASes. I corrected that table entry.

## Review Notes
The post’s Cisco IOS configuration examples for `neighbor ... weight`, inbound route maps with `set weight`, and `clear ip bgp ... soft in` are technically valid. The CLI style is the classic IPv4 Cisco IOS form; newer address-family-specific command variants also exist on some platforms, but the commands shown remain appropriate for the post’s stated Cisco IOS focus.

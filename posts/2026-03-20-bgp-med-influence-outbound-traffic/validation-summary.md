# Validation Summary: How to Use BGP MED to Influence Outbound Traffic from Neighbors

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- BGP MED (Multi-Exit Discriminator)
- Cisco IOS / IOS XE
- Route maps
- Prefix lists
- BGP traffic engineering

## Sources Consulted
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/
- RFC 4451, BGP MULTI_EXIT_DISC (MED) Considerations: https://datatracker.ietf.org/doc/html/rfc4451
- Cisco IOS IP Routing: BGP Command Reference, `bgp always-compare-med` and `bgp bestpath med missing-as-worst`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp1.html
- Cisco IP Routing: BGP Configuration Guide, "Connecting to a Service Provider Using External BGP" / "Influencing Inbound Path Selection by Setting the MED Attribute": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-16/irg-xe-16-book/connecting-to-a-service-provider-using-external-bgp.pdf
- Cisco IOS IP Routing: BGP Command Reference, `set metric-type internal`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-n1.html
- Cisco IOS IP Routing: BGP Configuration Guide, `show ip bgp neighbors ... advertised-routes` example output: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book/irg-basic-net.html

## Issues Found
- The Step 2 selective MED example was incomplete. It defined a route map on R1 but did not apply it to a neighbor, and it did not show the complementary R2 policy needed to actually split inbound traffic by prefix. I added the outbound route-map application on R1 and a matching R2 example with inverse MED values so the configuration works as described.
- The Step 3 explanation said `always-compare-med` compares MED "regardless of origin." That wording was imprecise. I changed it to "regardless of neighboring AS" to match Cisco's command behavior and the RFC treatment of MED comparison.
- The Step 4 verification example incorrectly showed `show ip bgp` on the advertising router with a local path and a modified MED, which is misleading because outbound route-map changes are best verified either in `advertised-routes` output on the sender or in the received route on the neighbor. I corrected the text to distinguish sender-side and receiver-side verification and changed the detailed `show ip bgp` example to a received external route.
- The Step 4 detailed verification command used prefix slash notation. I changed it to the documented Cisco IOS `show ip bgp <network> <mask>` form for consistency with Cisco's BGP configuration examples.

## Review Notes
- The post is technically sound after the corrections above.
- MED remains advisory and may be ignored by upstreams or peers; that caveat in the post is accurate.
- `bgp always-compare-med` changes best-path behavior globally on the router, so the caution in the post is appropriate.

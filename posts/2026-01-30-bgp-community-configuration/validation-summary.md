# Validation Summary: How to Implement BGP Community Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Border Gateway Protocol (BGP)
- Standard BGP communities
- Extended BGP communities
- Large BGP communities
- Cisco IOS/IOS-XE BGP policy configuration
- Juniper Junos routing policy configuration
- FRRouting BGP configuration
- Remote Triggered Blackhole (RTBH)

## Sources Consulted
- RFC 1997: BGP Communities Attribute: https://datatracker.ietf.org/doc/html/rfc1997
- RFC 3765: NOPEER Community for Border Gateway Protocol Route Scope Control: https://datatracker.ietf.org/doc/html/rfc3765
- RFC 4360: BGP Extended Communities Attribute: https://datatracker.ietf.org/doc/html/rfc4360
- RFC 8092: BGP Large Communities Attribute: https://www.rfc-editor.org/rfc/rfc8092.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- Juniper Junos routing policies for BGP communities: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/routing-policies-communities.html
- Juniper Junos BGP large communities example: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/example/example-configuring-bgp-large-communities.html
- Juniper Junos AS path prepending example: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/example/routing-policy-security-routing-policy-to-prepend-to-as-path-configuring.html
- Cisco IOS XE BGP large community documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-14/configuration_guide/rtng/b_1714_rtng_9400_cg/configuring_bgp_large_community.html
- Cisco IOS XE BGP named community lists documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3e/irg-iproute-bgp-xe-3e-book/irg-named-community-list.html

## Issues Found
- The well-known community descriptions were imprecise for NO_EXPORT, NO_EXPORT_SUBCONFED, and NOPEER. Updated the table to match RFC 1997 and RFC 3765 semantics, including confederation-boundary behavior and NOPEER's advisory nature.
- The FRRouting customer import route-map used `on-match next` after local preference actions, which caused later default processing to overwrite the requested preference. Reordered the blackhole check before preference handling and removed the inappropriate continuation from the preference terms.
- The FRRouting transit export route-map stripped communities in a match-all first term without continuing, so later prepend and customer-route filtering terms would not run. Added `on-match next` to the stripping and prepend terms so the final customer-route match still controls export.
- The Junos verification command `show route community *` was not the documented form for listing community-bearing routes. Replaced it with a detail output filter that surfaces community attributes on BGP routes.
- The FRRouting large-community verification commands used an undocumented short form. Updated them to the current documented `show bgp ipv4 ...` form.
- The monitoring note suggested NetFlow/IPFIX for community usage. Replaced it with BGP monitoring or routing telemetry, which is the appropriate source for BGP community attributes.

## Review Notes
Configuration snippets remain examples and still need adaptation for each platform release, address family, route scale, and local RTBH design. The post now aligns with the consulted RFCs and current vendor documentation for the claims and examples reviewed.

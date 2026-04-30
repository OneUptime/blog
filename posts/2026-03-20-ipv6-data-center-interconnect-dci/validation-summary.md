# Validation Summary: How to Configure IPv6 for Data Center Interconnect (DCI) - Dci

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Data Center Interconnect (DCI)
- MP-BGP
- Cisco IOS XE
- SRv6
- BFD
- Linux `ip` / `ip link`

## Sources Consulted
- RFC 4760, "Multiprotocol Extensions for BGP-4" - https://datatracker.ietf.org/doc/html/rfc4760
- RFC 8402, "Segment Routing Architecture" - https://datatracker.ietf.org/doc/rfc8402/
- RFC 8986, "Segment Routing over IPv6 (SRv6) Network Programming" - https://www.ietf.org/rfc/rfc8986.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: Multiprotocol BGP Extensions for IPv6" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-mbgp-ext-xe.html
- Cisco IOS XE BGP Configuration Guide, "Configuring BGP Neighbor Session Options" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/configuring-bgp-neighbor-session-options.html
- Cisco IOS XE 17 Segment Routing Configuration Guide, "Segment Routing over IPv6" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/seg_routing/configuration/xe-17/segrt-xe-17-book/m_srv6.html
- Linux `ip-link(8)` man page - https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
- The description said the post used MPLS and EVPN, but the body only configured MP-BGP and SRv6. I corrected the description so it matches the technologies actually shown.
- The introduction and conclusion implied IPv6 DCI always removes address translation. That is only true when the sites use unique IPv6 prefixes, so I narrowed the wording to make the claim conditional.
- The BGP section omitted that Cisco only originates a prefix with the `network` statement when that route already exists in the local IPv6 routing table. I added that requirement to keep the example operationally correct.
- The SRv6 example used `segment-routing ipv6`, which is not the current Cisco IOS XE SRv6 syntax. I replaced it with the documented `segment-routing srv6` and `locators` hierarchy and noted the IOS XE release line where SRv6 support is introduced.
- The route-filtering section only defined an IPv6 prefix list and did not apply it to the BGP neighbor, so it would not actually stop advertisements. I added an outbound route map and attached it to the IPv6 BGP neighbor policy.
- The BFD section only showed `neighbor ... fall-over bfd`, but Cisco documents interface-level BFD configuration as part of the IPv6 BGP BFD setup. I added the interface `bfd interval` example and kept the neighbor attachment under the IPv6 address family.
- The MTU section used less precise fragmentation wording for an IPv6 transport discussion. I updated the text to describe avoiding drops or endpoint fragmentation and normalized the `ip link` commands to documented syntax.

## Review Notes
- The Cisco examples are IOS XE scoped. Equivalent configurations on IOS XR or NX-OS use different syntax and feature workflows.
- SRv6 support on Cisco IOS XE is version-specific; the corrected syntax reflects the current documented IOS XE 17.x SRv6 configuration model.

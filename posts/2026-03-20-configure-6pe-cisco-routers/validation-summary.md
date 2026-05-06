# Validation Summary: How to Configure 6PE on Cisco Routers

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cisco IOS / IOS XE
- MPLS
- LDP
- MP-BGP for IPv6
- 6PE
- IPv6 routing

## Sources Consulted
- RFC 4798: Connecting IPv6 Islands over IPv4 MPLS Using IPv6 Provider Edge Routers (6PE) - https://www.rfc-editor.org/rfc/rfc4798.html
- Cisco IOS IPv6 Command Reference, `neighbor send-label` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-m1.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6` and `show bgp ipv6 ... labels` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html
- Cisco IOS XE IPv6 Implementation Guide, Implementing IPv6 over MPLS - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-over-mpls.html
- Cisco IOS XE MPLS Configuration Guide, Configuring IPv6 Provider Edge over MPLS (6PE) - https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-10/configuration_guide/mpls/b_1710_mpls_9600_cg/configuring_ipv6___provider_edge_over_mpls__6pe_.html
- Cisco IOS XE BGP Configuration Guide, IPv6 Routing: Multiprotocol BGP Extensions for IPv6 - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/ip6-mbgp-ext-xe.html

## Issues Found
- The original examples used invalid IPv6 addresses such as `2001:db8:pe1-ce1::/64` and `2001:db8:site1::/48`. These were replaced with valid documentation-prefix addresses.
- The PE-to-PE 6PE configuration was missing `neighbor 10.0.0.2 send-label`, which Cisco documents as required to advertise MPLS labels for IPv6 routes in the IPv6 address family. This was added.
- The PE example used `redistribute connected` under the IPv6 BGP address family even though the post's design learns customer prefixes from the CE via IPv6 eBGP. That would advertise connected link subnets rather than the intended customer routes, so it was removed.
- The IPv6 eBGP `remote-as` examples were moved out of the IPv6 address-family block and into router configuration mode to match Cisco's documented neighbor configuration model.
- The verification examples originally showed plain IPv4 next hops and per-prefix MPLS output that do not match Cisco's documented 6PE behavior. They were corrected to use IPv4-mapped IPv6 next hops such as `::FFFF:10.0.0.2`, `show bgp ipv6 unicast labels`, and `IPv6-mpls` route output.
- `ipv6 unicast-routing` and missing `no shutdown` commands were added so the snippets are runnable as written on Cisco routers.

## Review Notes
- Exact `show mpls forwarding-table` output varies by IOS/IOS XE release and platform; some releases show aggregated IPv6 label entries rather than a literal per-prefix IPv6 line.
- Optional 6PE features such as IPv6 explicit-null labels are platform- and release-dependent and are not required for the baseline configuration shown here.

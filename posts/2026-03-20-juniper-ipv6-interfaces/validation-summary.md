# Validation Summary: How to Enable IPv6 on Juniper Junos Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6 interface addressing
- IPv6 static routing
- IPv6 firewall filters
- DHCPv6 local server
- IPv6 Neighbor Discovery and router advertisement

## Sources Consulted
- Juniper Networks, Protocol Family and Interface Address Properties: https://www.juniper.net/documentation/us/en/software/junos/interfaces-fundamentals-evo/interfaces-fundamentals/topics/topic-map/protocol-family-interface-address-properties.html
- Juniper Networks, static (Routing Options): https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html
- Juniper Networks, Firewall Filter Match Conditions for IPv6 Traffic: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper Networks, DHCPv6 Server: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper Networks, DHCPv6 Address-Assignment Pools: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-address-asignment-pools-security-devices.html
- Juniper Networks, dhcp-attributes (Access IPv6 Address Pools): https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/access-edit-dhcp-attributes-ipv6.html
- Juniper Networks, show ipv6 neighbors: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, ping: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, traceoptions (Protocols IPv6 Neighbor Discovery): https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-protocols-router-advertisement.html
- Juniper Networks, pipe command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/pipe.html

## Issues Found
- The post used invalid IPv6 example addresses such as `2001:db8:remote::/48`, `2001:db8:wan::254`, and `2001:db8:lan::/64`. These were replaced with valid documentation-safe IPv6 examples because IPv6 hextets must be hexadecimal.
- The static default route was labeled as a discard/blackhole route but used `reject`. This was changed to `discard` because Junos `reject` sends ICMPv6 unreachable messages, while `discard` is the blackhole behavior.
- The DHCPv6 server example used the wrong Junos hierarchy and unsupported attributes for an IPv6 pool. It was updated to use `dhcp-local-server dhcpv6`, valid IPv6 pool ranges, `dns-server` under `dhcp-attributes`, and matching interface/router-advertisement configuration.
- The verification section included `show arp no-resolve table inet6`, which is not the Junos IPv6 neighbor command. It was replaced with `show ipv6 neighbors interface ge-0/0/0.0`, and the ping example was updated to a valid IPv6 next-hop test.
- The prerequisite version and debugging note were inaccurate for the examples shown. The minimum version was updated to Junos OS 13.3R6 or later because the IPv6 firewall filter `next-header` match is documented as supported from 13.3R6 onward, and the traceoptions comment was narrowed to router advertisement debugging instead of generic IPv6 routing.
- The description and overview claimed coverage of EUI-64 and link-local addressing, but the post did not contain working examples for those topics. The copy was corrected to match the actual content.

## Review Notes
- DHCPv6 local server behavior and required surrounding configuration can vary by platform. On SRX devices, a production deployment can also require security-zone and host-inbound DHCPv6 allowances in addition to the generic Junos configuration shown here.
- The firewall filter example uses `next-header`, which is documented for Junos OS 13.3R6 and later.

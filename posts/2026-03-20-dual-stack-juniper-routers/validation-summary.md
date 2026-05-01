# Validation Summary: How to Configure Dual-Stack on Juniper Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv4
- IPv6
- Dual-stack routing
- Static routing
- OSPFv2
- OSPFv3
- BGP / MP-BGP
- IPv6 Router Advertisement
- IPv6 Neighbor Discovery
- Junos firewall filters

## Sources Consulted
- Juniper Networks, `show interfaces terse` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-interfaces-terse.html
- Juniper Networks, `show route protocol` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-protocol.html
- Juniper Networks, `family (Protocols BGP)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Juniper Networks, `router-advertisement` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper Networks, `managed-configuration` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/managed-configuration-edit-protocols-router-advertisement.html
- Juniper Networks, IPv6 Neighbor Discovery overview: https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper Networks, `show ipv6 neighbors` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, Configure Static Routes: https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_static-routes.html
- Juniper Networks, Firewall Filter Match Conditions for IPv6 Traffic: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper Networks, `ping` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, `traceroute` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/traceroute.html
- RFC 4760, Multiprotocol Extensions for BGP-4: https://www.rfc-editor.org/rfc/rfc4760.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:wan::1`, `2001:db8:lan::1`, and `2001:db8:peer::2`. IPv6 hextets must be hexadecimal, so these were replaced with valid documentation-prefix addresses.
- The Router Advertisement section used `managed-information`, which is not the Junos statement name. It was corrected to the documented `managed-configuration` statement.
- The Router Advertisement comment implied DHCPv6-only behavior too strongly. It was clarified to describe the managed flag as signaling stateful DHCPv6 addressing.
- The BGP explanation implied the snippet was demonstrating one MP-BGP session, but the config actually showed separate IPv4 and IPv6 peer sessions. The wording was corrected to match the example.
- The WAN firewall filter example would have blocked the tutorial's own example BGP sessions and essential ICMP/ICMPv6 control traffic. Minimal control-plane and diagnostic allowances were added so the example stays internally consistent.
- `JunOS` was standardized to `Junos OS` for technical correctness.

## Review Notes
- `managed-configuration` sets the RA managed flag, but hosts can still use SLAAC if the advertised prefix remains autonomous; exact host behavior depends on the platform.
- The firewall filter examples are still intentionally minimal. Production deployments often need additional terms based on control-plane policy, management access requirements, and the services carried on the interface.

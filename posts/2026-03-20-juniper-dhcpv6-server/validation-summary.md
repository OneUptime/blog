# Validation Summary: How to Configure DHCPv6 Server on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Junos OS
- DHCPv6 local server
- IPv6 addressing and routing
- IPv6 router advertisements
- IPv6 neighbor discovery
- Junos firewall filters

## Sources Consulted
- Juniper Networks, "DHCPv6 Server": https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper Networks, "dhcpv6 (DHCP Local Server)": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcpv6-edit-system-services.html
- Juniper Networks, "DHCPv6 Address-Assignment Pools": https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-address-asignment-pools-security-devices.html
- Juniper Networks, "dhcp-attributes (Access IPv6 Address Pools)": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/access-edit-dhcp-attributes-ipv6.html
- Juniper Networks, "router-advertisement": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper Networks, "show ipv6 router-advertisement": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper Networks, "show ipv6 neighbors": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, "show dhcpv6 server binding": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-server-binding-command.html
- Juniper Networks, "show dhcpv6 server statistics": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-dhcpv6-server-statistics.html
- Juniper Networks, "Firewall Filter Match Conditions for IPv6 Traffic": https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- IETF, RFC 4861 "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/html/rfc4861

## Issues Found
- The static-route example used non-literal placeholder text (`remote`, `wan`) in IPv6 addresses, which is not valid Junos syntax. I replaced those with valid documentation-prefix IPv6 addresses.
- The DHCPv6 server example used the wrong configuration hierarchy and included `active-server-group`, which applies to DHCPv6 relay, not DHCPv6 local server. I moved the example under `system services dhcp-local-server dhcpv6` and kept only the supported local-server group/interface syntax.
- The DHCPv6 example omitted the client-facing interface IPv6 address and router-advertisement configuration. I added both, because Juniper’s DHCPv6 server workflow expects the interface to be IPv6-enabled and DHCPv6 clients still rely on router advertisements.
- The DHCPv6 pool used invalid IPv6 placeholders (`lan`) and omitted prefix lengths on the `low` and `high` range values. I replaced them with valid IPv6 addresses and added the prefix lengths required by Juniper’s address-pool examples.
- The DHCPv6 pool used `name-server` and `domain-name`, which are DHCPv4-style attributes in Junos. I replaced that with the supported DHCPv6 `dns-server` attribute and removed the unsupported `domain-name` line rather than introducing an unverified custom option.
- The verification section included `show arp no-resolve table inet6`, which is not the standard Junos operational command for IPv6 neighbor discovery. I replaced the verification commands with Junos DHCPv6 and IPv6 commands that match the official documentation, including `show dhcpv6 server binding`, `show dhcpv6 server statistics`, and `show ipv6 router-advertisement`.
- The firewall-filter example used `next-header icmpv6`; Juniper’s current documentation prefers `icmp6`. I updated the match condition to the preferred token.
- The prerequisite line claimed a universal minimum Junos version. Juniper’s current documentation emphasizes platform- and release-specific support, so I changed the wording to avoid an unsupported blanket version claim.

## Review Notes
- On SRX platforms, a working DHCPv6 deployment can also require `host-inbound-traffic` and security-zone policy allowances for DHCPv6 traffic. The post remains generic and does not attempt to add SRX-specific policy configuration.
- Juniper documents `traceoptions` as potentially high-impact and recommends using it sparingly and disabling it after troubleshooting.

# Validation Summary: How to Verify IPv6 Configuration on Juniper with show Commands

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6
- Neighbor Discovery Protocol (NDP)
- Router Advertisements
- DHCPv6
- Junos firewall filters
- Junos operational commands

## Sources Consulted
- Juniper `show ipv6 neighbors` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper `show ipv6 router-advertisement` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper `ping` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper `show log` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-log.html
- Juniper `static` routing-options statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html
- Juniper `router-advertisement` statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper `traceoptions` for IPv6 Neighbor Discovery: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-protocols-router-advertisement.html
- Juniper DHCPv6 local server statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcpv6-edit-system-services.html
- Juniper DHCPv6 server guide: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper DHCPv6 address-assignment pools guide: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-address-asignment-pools-security-devices.html
- Juniper firewall filter match conditions for IPv6 traffic: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper filtering operational command output: https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/filtering-operational-command.html
- Juniper `commit` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/commit.html
- Juniper `rollback` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/rollback.html
- IETF RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- IETF RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862

## Issues Found
1. **Prerequisites understated required privileges**: The post said `view` plus `network` for `ping`, but the trace section also uses `show log`, which Juniper documents as requiring `trace` privilege. I updated the prerequisites to include `show log` privilege requirements and to note that configuration mode access is needed for the example configuration and traceoptions statements.

2. **Firewall filter used a non-preferred ICMPv6 next-header synonym**: Juniper documents `next-header icmp6` and `next-header icmpv6` as equivalent, but marks `icmp6` as the preferred option and `icmpv6` as hidden in the CLI. I updated the filter example to use `next-header icmp6`.

3. **DHCPv6 example was incomplete as a working server example**: Juniper’s DHCPv6 server guidance includes configuring the service interface with an IPv6 address and enabling router advertisement on that interface. The post omitted those pieces, so I added matching `interfaces` and `protocols router-advertisement` stanzas to make the example self-consistent.

## Review Notes
- `show ipv6 router-advertisement` is valid for verifying SLAAC and router-advertisement behavior, but it is only meaningful when router advertisement is configured on the relevant interface.
- `traceoptions flag all` is valid, but Juniper warns that broad tracing can increase CPU load and should be used briefly.
- The post’s stated minimum version of Junos OS 12.1 is conservative. Several referenced commands predate 12.1, and the DHCPv6 local server statement itself was introduced in Junos OS 9.6.

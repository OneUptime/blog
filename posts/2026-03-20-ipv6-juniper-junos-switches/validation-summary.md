# Validation Summary: How to Configure IPv6 on Juniper Junos Switches

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Juniper Junos OS on EX Series switches
- IPv6 addressing on IRB interfaces
- VLAN routing with IRB
- IPv6 Router Advertisements and Neighbor Discovery
- OSPFv3
- IPv6 RA Guard
- DHCP and DHCPv6 snooping
- Junos firewall filters for `family inet6`

## Sources Consulted
- Juniper: `router-advertisement` statement reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper: `on-link` statement reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/on-link-edit-protocols-router-advertisement.html
- Juniper: IPv6 Neighbor Discovery — https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper: `show ipv6 router-advertisement` — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper: `router-advertisement-guard` statement reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-guard-edit-fo.html
- Juniper: Configuring Stateless IPv6 Router Advertisement Guard — https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/task/port-security-ra-guard.html
- Juniper: `show access-security router-advertisement state` — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-access-security-router-advertisement-state.html
- Juniper: `dhcp-security` statement reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcp-security-edit-vlans.html
- Juniper: Understanding DHCP Snooping (ELS) — https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/concept/port-security-dhcp-snooping-els.html
- Juniper: Understanding and Using Trusted DHCP Servers — https://www.juniper.net/documentation/us/en/software/junos/security-services/topics/topic-map/port-security-trusted-dhcp-server.html
- Juniper: Firewall Filter Match Conditions for IPv6 Traffic — https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper: Firewall Filter Match Conditions and Actions for QFX and EX Series Switches — https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/topic-map/firewall-filter-match-condtions-and-actions-qfx.html
- Juniper: Configure Static Routes — https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_static-routes.html
- Juniper: `show (ospf | ospf3) neighbor` — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ospf-ospf3-neighbor.html

## Issues Found
- The Router Advertisement prefix example used `onlink-flag`, which is not valid Junos syntax. It was corrected to `on-link`, which is the documented RA prefix option.
- The RA Guard configuration used the wrong hierarchy (`forwarding-options ipv6-ra-guard`) and invalid interface-level syntax under `family ethernet-switching`. It was replaced with valid Junos RA Guard interface commands under `forwarding-options access-security router-advertisement-guard`.
- The DHCPv6 snooping example used invalid VLAN syntax (`set vlans EMPLOYEES dhcpv6-snooping`). It was corrected to the ELS-style `set vlans EMPLOYEES forwarding-options dhcp-security`, which enables DHCP snooping and DHCPv6 snooping on supported EX platforms.
- The IPv6 firewall filter used `tcp-established` without also matching `protocol tcp`. Juniper documents that `tcp-established` does not implicitly verify TCP, so `from protocol tcp` was added to make the filter term correct.
- The verification command `show ipv6 ra-guard policy TRUSTED-RA-POLICY` is not a valid Junos operational command. It was replaced with `show access-security router-advertisement state`.
- The OSPFv3 example referenced `irb.20` even though that IRB unit was never configured in the post. The undefined example line was removed to avoid a misleading configuration snippet.

## Review Notes
- The post now aligns with Junos ELS-style configuration syntax for EX switches. On older non-ELS releases, DHCP security syntax differs.
- RA Guard support and its operational commands are release- and platform-dependent; Juniper documents the RA Guard hierarchy and related show commands as introduced in Junos OS Release 15.1X53-D55.
- For DHCP snooping on ELS switches, Juniper documents trunk ports as trusted by default. The simplified corrected example therefore only needs `dhcp-security` enabled on the VLAN.

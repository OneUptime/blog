# Validation Summary: How to Configure IPv6 Router Advertisements on Juniper - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Junos OS
- IPv6 Router Advertisements (RA)
- Stateless Address Autoconfiguration (SLAAC)
- Neighbor Discovery Protocol (NDP) / ICMPv6
- DHCPv6

## Sources Consulted
- Juniper Networks, "IPv6 Neighbor Discovery" https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper Networks, "router-advertisement | Junos OS" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-advertisement-edit-protocols.html
- Juniper Networks, "interface (Protocols IPv6 Neighbor Discovery)" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interface-edit-protocols-router-advertisement.html
- Juniper Networks, "prefix (Protocols IPv6 Neighbor Discovery)" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/prefix-edit-protocols-router-advertisement.html
- Juniper Networks, "show ipv6 router-advertisement" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-router-advertisement.html
- Juniper Networks, "show ipv6 neighbors" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, "ping" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, "Overview of the Configure Command" https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/configure-command.html
- Juniper Networks, "Using the Pipe ( | ) Symbol to Filter Command Output" https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/filtering-operational-command.html
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" https://www.rfc-editor.org/rfc/rfc4862
- OneUptime https://oneuptime.com/

## Issues Found
- The original post described Juniper router advertisements but did not include the actual `[edit protocols router-advertisement]` hierarchy. I corrected the hierarchy explanation and replaced the generic examples with Junos RA configuration that matches the topic.
- The original "IPv6 Static Route" example used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:wan::254`). I replaced that section with documented router advertisement commands.
- The original DHCPv6 example mixed incorrect or unrelated Junos DHCPv6 statements and did not match the documented RA workflow. I replaced it with accurate DHCPv6 integration examples using `managed-configuration` and `other-stateful-configuration`.
- The original verification section used the wrong IPv6 neighbor command (`show arp no-resolve table inet6`) and an incorrect ping example (`routing-instance default`). I corrected these to valid Junos operational commands.
- The conclusion implied that `family inet6` covered router advertisement behavior. I corrected it to distinguish interface IPv6 enablement from RA configuration.

## Review Notes
- The post now correctly reflects that IPv6 addressing is configured under `family inet6`, while SLAAC behavior and advertised prefixes are configured under `protocols router-advertisement`.
- The firewall filter example was kept only as a supporting example and adjusted so it does not accidentally suggest dropping all non-ICMPv6 IPv6 traffic.
- The traceoptions commands are valid, but Juniper documentation cautions that tracing should be enabled only temporarily and disabled after troubleshooting.

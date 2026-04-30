# Validation Summary: How to Configure IPv6 on Extreme Networks Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Extreme Networks ExtremeXOS / Switch Engine CLI
- VLAN interface routing
- IPv6 Router Advertisements / Neighbor Discovery
- Static IPv6 routing
- OSPFv3
- Dynamic ACLs
- DHCPv6 relay and prefix delegation snooping

## Sources Consulted
- ExtremeXOS / Switch Engine command reference for `enable ipforwarding ipv6`: https://documentation.extremenetworks.com/ExtremeXOS%20v33.2.1%20Command%20References/Switch_Operating_Systems/ExtremeXOS/Command_References/enable_ipforwarding_ipv6.shtml
- ExtremeXOS user guide for VLAN IP address configuration: https://documentation.extremenetworks.com/exos_32.2/GUID-4303EEF2-1059-44DE-94D7-C7A34309C739.shtml
- ExtremeXOS / Switch Engine command references for router discovery and router advertisement prefix settings: https://documentation.extremenetworks.com/Switch%20Engine%20v33.2.1%20Command%20References/content/documents/Switch_Operating_Systems/Switch_Engine/Command_References/enable_router_discovery.shtml
- ExtremeXOS / Switch Engine command references for router discovery timers and prefixes: https://documentation.extremenetworks.com/Switch%20Engine%20v33.2.1%20Command%20References/content/documents/Switch_Operating_Systems/Switch_Engine/Command_References/configure_vlan_router_discoverydefault_lifetime.shtml
- ExtremeXOS command reference for router discovery prefix commands: https://documentation.extremenetworks.com/ExtremeXOS%20v33.3.1%20Command%20References/Switch_Operating_Systems/ExtremeXOS/Command_References/configure_vlan_router_discoveryadd_prefix.shtml
- ExtremeXOS command reference for static IPv6 routes: https://documentation.extremenetworks.com/exos_commands_30.1/GUID-AE899E40-B1BB-4BB4-9C29-1CD973E2E0A2.shtml
- ExtremeXOS command reference for OSPFv3 router ID and interface assignment: https://documentation.extremenetworks.com/ExtremeXOS%20v33.2.1%20Command%20References/Switch_Operating_Systems/ExtremeXOS/Command_References/configure_ospfv3_routerid.shtml
- ExtremeXOS command reference for `configure ospfv3 add`: https://documentation.extremenetworks.com/exos_commands_30.2/GUID-ABD0D0AC-3B9A-4C97-AD3A-743AEB1A80A5.shtml
- ExtremeXOS command reference for dynamic ACL creation and application: https://documentation.extremenetworks.com/exos_commands_22.2/EXOS_21_1/EXOS_Commands_All/r_create-accesslist.shtml
- ExtremeXOS user guide for `configure access-list add`: https://documentation.extremenetworks.com/exos_22.3/GUID-0D514010-8FD4-4B59-810B-297BC57536A8.shtml
- ExtremeXOS / Switch Engine command references for DHCPv6 relay and prefix delegation snooping: https://documentation.extremenetworks.com/exos_commands_22.3/EXOS_21_1/EXOS_Commands_All/r_enable-bootprelay-ipv6.shtml
- ExtremeXOS / Switch Engine command references for DHCPv6 prefix delegation snooping: https://documentation.extremenetworks.com/Switch%20Engine%20v33.2.1%20Command%20References/content/documents/Switch_Operating_Systems/Switch_Engine/Command_References/configure_bootprelay_ipv6_prefix_delegation_snooping.shtml
- Switch Engine command reference for `configure bootprelay add`: https://documentation.extremenetworks.com/switchengine_commands_32.6.1/GUID-60774C89-C9BA-4D63-A4AA-C7F3BFE84490.shtml
- ExtremeXOS command references for verification commands: https://documentation.extremenetworks.com/ExtremeXOS%20v33.3.1%20Command%20References/Switch_Operating_Systems/ExtremeXOS/Command_References/show_router_discovery.shtml
- ExtremeXOS command reference for neighbor cache display: https://documentation.extremenetworks.com/exos_commands_30.7/GUID-685B2415-0402-477F-BBA2-4812D186C9DE.shtml
- ExtremeXOS command reference for `ping`: https://documentation.extremenetworks.com/exos_commands_16/EXOS_16_2/EXOS_Commands_All/r_ping.shtml

## Issues Found
- The post used non-existent IPv6 forwarding commands (`configure forwarding ipv6 enable`, `enable ipv6 vlan`, and `show forwarding ipv6`). These were replaced with the documented `enable ipforwarding ipv6`, `enable ipforwarding ipv6 vlan ...`, and `show ipconfig ipv6` forms.
- The VLAN IPv6 addressing example used `configure vlan ... ipv6 address ... add`, which is not the documented ExtremeXOS syntax. It was corrected to `configure vlan ... ipaddress <ipv6-prefix>`.
- The Router Advertisement section used an incorrect `configure ipv6 neighbor-discovery ... router-advertisement ...` command family. It was rewritten to the documented `enable router-discovery` and `configure vlan ... router-discovery ...` commands, and the prefix advertisement was correctly split into `add prefix` plus `set prefix`.
- The default-route example used `2001:db8:isp::1`, which is not a valid IPv6 literal because `isp` is not hexadecimal. It was replaced with a valid documentation-prefix example, and the unsupported trailing `ipv6` keyword was removed from the static route commands.
- The ACL examples were not valid ExtremeXOS syntax. They were rewritten to use documented dynamic ACL syntax with quoted conditions/actions and corrected `configure access-list add` usage.
- The DHCPv6 section used nonexistent `dhcpv6-snooping` and `trust-port` commands. It was corrected to documented DHCPv6 relay plus prefix delegation snooping commands (`configure bootprelay ...`, `enable bootprelay ipv6`, and `configure bootprelay ipv6 prefix-delegation snooping ...`).
- The save and verification sections used several invalid commands (`save config`, `show ipv6 interface`, `show ipv6 neighbors`, `show ipv6 neighbor-discovery ...`, and the `ping` argument order). These were replaced with the documented forms.

## Review Notes
- Extreme’s current documentation is split between older `ExtremeXOS` and newer `Switch Engine` branding. The corrected commands are consistent across those references, but readers should expect documentation naming differences by release.
- Feature availability can vary by platform and license, especially for OSPFv3, dynamic ACLs, and DHCPv6 prefix delegation features. The post is technically correct after revision, but operators should still confirm support on their exact switch model and software release.

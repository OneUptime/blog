# Validation Summary: How to Configure IPv6 on Fortinet FortiGate

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fortinet FortiGate
- FortiOS CLI
- IPv6
- DHCPv6
- Router Advertisements
- OSPFv3
- Firewall policy configuration

## Sources Consulted
- FortiGate / FortiOS 7.6.6 Administration Guide, IPv6 quick start: https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/87102/ipv6-quick-start
- FortiGate / FortiOS 7.0.17 Administration Guide, IPv6 quick start example: https://docs.fortinet.com/document/fortigate/7.0.17/administration-guide/167048/ipv6-quick-start-example
- FortiGate / FortiOS 7.6.0 Administration Guide, DHCPv6 stateful server: https://docs.fortinet.com/document/fortigate/7.6.0/administration-guide/776785/dhcpv6-stateful-server
- FortiGate / FortiOS 7.4.0 CLI Reference, config system interface: https://docs.fortinet.com/document/fortigate/7.4.0/cli-reference/8620/config-system-interface
- FortiGate / FortiOS 7.6.5 CLI Reference, config system dhcp6 server: https://docs.fortinet.com/document/fortigate/7.6.5/cli-reference/204620936/config-system-dhcp6-server
- FortiGate / FortiOS 7.4.6 CLI Reference, config firewall address6: https://docs.fortinet.com/document/fortigate/7.4.6/cli-reference/137851815/config-firewall-address6
- FortiGate / FortiOS 7.0.17 CLI Reference, config router ospf6: https://docs.fortinet.com/document/fortigate/7.0.17/cli-reference/110953645/config-router-ospf6
- FortiGate / FortiOS 7.6.3 CLI Reference, diagnose firewall: https://docs.fortinet.com/document/fortigate/7.6.3/cli-reference/253375604/diagnose-firewall
- FortiGate / FortiOS 7.4.10 CLI Reference, diagnose ipv6 neighbor-cache: https://docs.fortinet.com/document/fortigate/7.4.10/cli-reference/391030010/diagnose-ipv6-neighbor-cache
- FortiGate / FortiOS 7.6.6 Administration Guide, Dynamic routing in IPv6: https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/432710/dynamic-routing-in-ipv6
- FortiGate / FortiOS 6.4.0 New Features, Consolidated IPv4 and IPv6 policy configuration: https://docs.fortinet.com/document/fortigate/6.4.0/new-features/815846/consolidated-ipv4-and-ipv6-
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The WAN example used invalid IPv6 literals (`2001:db8:isp::/64`) and outdated interface syntax (`set ip6`, `set allowaccess6`). I changed the example to the documented `config ipv6` block with `set ip6-address` and `set ip6-allowaccess`, and replaced the invalid address examples with valid documentation-prefix addresses.
- The original interface RA settings were SLAAC-only (`M`/`O` flags off, autonomous flag on) while the post later configured a stateful DHCPv6 address pool. I corrected the RA settings to match a stateful DHCPv6 flow by enabling the managed and other flags and disabling the autonomous flag in the advertised prefix.
- The DHCPv6 server snippet used incorrect FortiOS syntax. I added the required `set subnet`, changed `set dns-service local` to the documented `set dns-service specify`, and moved the address pool into the required `config ip-range` block.
- The firewall policy section used the removed `config firewall policy6` model and `set nat6 enable`. I updated it to the current consolidated `config firewall policy` model that uses `srcaddr6` and `dstaddr6`.
- The IPv6 address object range example used `set type range`, which is not the documented FortiOS value. I corrected it to `set type iprange`.
- The OSPFv3 interface example used `set area`, but current FortiOS uses `set area-id` under `config ospf6-interface`. I corrected the field name.
- Several verification commands were outdated or from the wrong command family. I replaced them with current documented commands for IPv6 addresses, routing, DHCPv6 leases, policy statistics, and neighbor cache inspection.
- The GUI walkthrough omitted that IPv6 is hidden by default in the GUI on many FortiOS builds. I added the required Feature Visibility step.

## Review Notes
- The corrected example assumes the internal prefix is routed or delegated to the FortiGate. In a real deployment, the upstream network must route the LAN prefix toward the FortiGate or provide it through prefix delegation.
- NAT66 was intentionally not kept in the generic outbound policy example because native IPv6 deployments normally use routed global prefixes rather than address translation. If NAT66 is specifically required, it should be configured deliberately as a separate design choice.

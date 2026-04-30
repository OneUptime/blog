# Validation Summary: How to Configure IPv6 for Leaf-Spine Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Leaf-spine / Clos fabric design
- Arista EOS
- BGP underlay
- ECMP
- BFD
- Anycast gateway / VARP
- Cisco NX-OS operational verification

## Sources Consulted
- Arista EOS Border Gateway Protocol (BGP): https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Arista EOS IPv6: https://www.arista.com/en/um-eos/eos-ipv6
- Arista EOS VRRP and VARP: https://www.arista.com/en/um-eos/eos-vrrp-and-varp
- Arista EOS Bidirectional Forwarding Detection: https://www.arista.com/en/um-eos/eos-bidirectional-forwarding-detection
- Arista EOS ACLs and Route Maps: https://www.arista.com/en/um-eos/eos-acls-and-route-maps
- Arista EOS Ethernet Ports: https://www.arista.com/en/um-eos/eos-ethernet-ports
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/9-x/unicast/configuration/guide/l3_cli_nxos/l3_manage-routes.html
- Cisco Nexus 9000 Series Show Commands Reference: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus9000/sw/7-x/command_references/show_commands/b_Using_Show_Commands/b_Using_Show_Commands_chapter_010010.html

## Issues Found
- The Arista EOS BGP examples placed `neighbor remote-as`, `neighbor description`, and `neighbor bfd` under `address-family ipv6`. I moved the non-address-family neighbor commands to router BGP mode and kept only address-family-specific commands such as `neighbor ... activate` and the IPv6 route-map under the IPv6 address family.
- The spine example was missing `ipv6 unicast-routing`, `no switchport` on the routed uplinks, and a manual BGP `router-id` even though the sample is IPv6-only. I added all three to match EOS requirements.
- The inbound leaf filter used `ip prefix-list` for IPv6 routes. I changed it to `ipv6 prefix-list`.
- The route-map and prefix-list snippets were shown as if they were nested under `router bgp`. I moved them to global configuration scope to match EOS syntax.
- The anycast gateway example used invalid EOS syntax (`ip virtual-router address ipv6`) and assigned the same physical SVI IPv6 address on multiple leaves. I corrected it to `ipv6 virtual-router address`, added the required `ip virtual-router mac-address`, and used unique physical SVI addresses with a shared virtual gateway address.
- The mobility comment was too broad as written. I narrowed it so it only claims no default-gateway change within the same stretched subnet.
- The verification section included incorrect or undocumented commands. I changed `show route ipv6` to `show ipv6 route` for NX-OS, replaced `show bgp ipv6 unicast ... bestpath-compare` with a documented EOS `show ipv6 bgp ... detail` lookup, and corrected the EOS interface-rate command to `show interfaces ethernet 1-2 counters rates`.

## Review Notes
- The post is technically valid after the fixes above.
- The anycast gateway section assumes the workload remains on the same stretched Layer 2 domain / subnet. The post does not cover the overlay control plane needed to provide that stretch across racks.

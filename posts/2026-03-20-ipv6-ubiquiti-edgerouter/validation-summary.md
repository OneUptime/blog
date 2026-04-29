# Validation Summary: How to Configure IPv6 on Ubiquiti EdgeRouter

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubiquiti EdgeRouter
- EdgeOS CLI
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Router Advertisements (RA)
- SLAAC
- IPv6 firewalling

## Sources Consulted
- Ubiquiti UISP Help: EdgeRouter - Beginners Guide to EdgeRouter — https://help.uisp.com/hc/en-us/articles/22591094474135-EdgeRouter-Beginners-Guide-to-EdgeRouter
- Ubiquiti UISP Help: EdgeRouter - How to Create a WAN Firewall Rule — https://help.uisp.com/hc/en-us/articles/22591166964119-EdgeRouter-How-to-Create-a-WAN-Firewall-Rule
- Ubiquiti UISP Help: EdgeRouter - Configuring Public Static IP Addresses — https://help.uisp.com/hc/en-us/articles/22591175174423-EdgeRouter-Configuring-Public-Static-IP-Addresses
- Ubiquiti UISP Help: EdgeRouter - Configuration and Operational Mode — https://help.uisp.com/hc/en-us/articles/22591199766551-EdgeRouter-Configuration-and-Operational-Mode
- Ubiquiti UISP Help: EdgeRouter - SSH Recovery — https://help.uisp.com/hc/en-us/articles/22591244762007-EdgeRouter-SSH-Recovery
- Ubiquiti EdgeOS User Guide — https://dl.ubnt.com/guides/edgemax/EdgeOS_UG.pdf
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://www.rfc-editor.org/rfc/rfc4862.html
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration — https://www.rfc-editor.org/rfc/rfc8106.html
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc8415.html

## Issues Found
- The static IPv6 example used invalid literals such as `2001:db8:isp::2/64`, which are not valid IPv6 addresses. I replaced them with valid documentation-prefix addresses so the commands are syntactically correct.
- The DHCPv6-PD section included extra client options that are not part of Ubiquiti's documented wizard requirements for generic DHCPv6-PD setup. I simplified that example to the core delegated-prefix configuration, matching the documented need to set the delegated prefix length and assign LAN interfaces for IPv6.
- The Router Advertisement example was presented without clarifying that DHCPv6-PD with `service slaac` already covers the delegated-LAN case. I clarified that the manual RA block applies to the static-prefix scenario and changed the advertised prefix from `::/64` to the explicit `/64` used in the static example.
- The IPv6 firewall section only covered forwarded traffic and did not include a router-local IPv6 policy. I added a separate WAN-local IPv6 ruleset, invalid-state drops, and a DHCPv6 allowance to protect traffic destined to the router while still permitting DHCPv6 client operation.
- The GUI wizard section referred to a specific LAN label (`Auto`) that I could not verify from current Ubiquiti documentation. I changed it to the documented wizard behavior: set the delegated prefix length, enable the IPv6 firewall, and choose the LAN interfaces that should receive IPv6 connectivity.
- The verification block included a DHCPv6-PD inspection command that was not documented in the official sources I consulted. I removed that line and kept the operational checks that were verifiable from Ubiquiti documentation.

## Review Notes
- The examples use `eth0` as WAN and `eth1` as LAN. On EdgeRouter models with an integrated switch chip, Ubiquiti documents that the LAN side may instead be `switch0`.
- Ubiquiti's current public help center documents the wizard behavior and general CLI patterns well, but it does not expose a dedicated EdgeRouter IPv6 CLI reference comparable to the EdgeSwitch CLI reference. Some manual IPv6 command-tree details therefore need to be inferred from the documented workflow and standard EdgeOS configuration structure.

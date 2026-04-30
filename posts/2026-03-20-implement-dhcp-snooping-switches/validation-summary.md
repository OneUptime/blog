# Validation Summary: How to Implement DHCP Snooping on Switches

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- DHCP snooping
- Cisco IOS
- Cisco IOS XE
- Dynamic ARP Inspection (DAI)
- Linux bridge netfilter
- iptables

## Sources Consulted
- Cisco, "FHS and SISF Configuration Guide - DHCP Snooping [Cisco IOS XE 17]": https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dhcp-snooping.html
- Cisco, "Operate and Troubleshoot DHCP Snooping on Catalyst 9000 Switches": https://www.cisco.com/c/en/us/support/docs/ip/dynamic-host-configuration-protocol-dhcp-dhcpv6/217055-operate-and-troubleshoot-dhcp-snooping.html
- Cisco, "Security Configuration Guide, Cisco IOS XE Bengaluru 17.6.x (Catalyst 9400 Switches) - Configuring Dynamic ARP Inspection": https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/17-6/configuration_guide/sec/b_176_sec_9400_cg/configuring_dynamic_arp_inspection.html
- RFC 2131, "Dynamic Host Configuration Protocol": https://www.rfc-editor.org/rfc/rfc2131
- Linux kernel documentation, "Ethernet Bridging": https://kernel.org/doc/html/next/networking/bridge.html
- Linux kernel documentation, "IP Sysctl": https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local CLI help: `iptables -h` (`iptables v1.8.10 (nf_tables)`)

## Issues Found
- The untrusted-port explanation was too narrow. Cisco documents DHCP snooping as filtering server-originated packets received on untrusted ports, and RFC 2131 shows clients can also send `DHCPDECLINE`, `DHCPRELEASE`, and `DHCPINFORM`. I updated the text to distinguish server replies from client-originated DHCP messages.
- The Cisco configuration snippets mixed configuration-mode commands with EXEC `show` commands. I added `exit` and `end` so the snippets are valid if copied into a Cisco CLI session.
- The comment on `ip dhcp snooping database flash:dhcp_snooping.db` was incorrect. That command persists the DHCP snooping binding database to storage; it does not log violations. I corrected the description.
- The Linux `iptables` section overstated the example as full DHCP snooping and omitted the bridge-netfilter prerequisite. I changed it to an approximation and noted that `br_netfilter` must be enabled so bridged IPv4 traffic reaches `iptables`.
- The verification block was labeled as `bash` even though it contains Cisco CLI commands. I changed the fence to `text`.

## Review Notes
- `ip dhcp snooping information option` is enabled by default on many Cisco IOS XE platforms, but explicitly configuring it is still valid.
- The Linux example only reproduces the packet-filtering aspect of DHCP snooping. It does not build a snooping binding table or provide DAI/IP Source Guard integration.

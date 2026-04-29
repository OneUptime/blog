# Validation Summary: How to Understand IPv6 Source Address Validation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SAVI
- SLAAC
- NDP / ND Inspection
- DHCPv6
- IPv6 Source Guard
- uRPF
- Cisco IOS / IOS XE IPv6 First Hop Security
- Linux Netfilter / ip6tables
- Scapy

## Sources Consulted
- RFC 7039, Source Address Validation Improvement (SAVI) Framework: https://www.rfc-editor.org/rfc/rfc7039.html
- RFC 6620, FCFS SAVI for Locally Assigned IPv6 Addresses: https://datatracker.ietf.org/doc/html/rfc6620
- RFC 7513, SAVI Solution for DHCP: https://datatracker.ietf.org/doc/html/rfc7513
- RFC 8074, SAVI for Mixed Address Assignment Methods Scenario: https://datatracker.ietf.org/doc/html/rfc8074
- RFC 8704, Enhanced Feasible-Path Unicast Reverse Path Forwarding: https://www.rfc-editor.org/rfc/rfc8704.html
- Cisco Security Configuration Guide, Configuring IPv6 First Hop Security: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-13/configuration_guide/sec/b_1713_sec_9600_cg/configuring_ipv6_first_hop_security.html
- Cisco IPv6 Snooping documentation: https://www.cisco.com/en/US/docs/ios-xml/ios/15-0se/features/ip6-snooping.html
- Cisco IOS IPv6 Command Reference, `show ipv6 rpf` / `show ipv6 interface` / `show ipv6 traffic`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s5.html
- Cisco IOS IPv6 Command Reference, `show ipv6 traffic`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- iptables-extensions(8) manual, `rpfilter` match: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Scapy documentation: https://scapy.readthedocs.io/en/stable/usage.html

## Issues Found
- The overview mentioned mixed SAVI environments without citing the standards-track RFC for that scenario. I updated it to reference RFC 8074 explicitly.
- The Scapy example used an invalid IPv6 destination literal, used a link-local source in a way that did not match the explanation, and omitted the privilege requirement for raw packet sending. I replaced it with valid same-LAN example addresses and added `sudo`.
- The Cisco SAVI-SLAAC example conflated ND inspection with full source-address enforcement. I corrected it so the snippet shows binding learning/validation via IPv6 snooping plus ND inspection, and enforcement via IPv6 Source Guard.
- The Cisco DHCPv6 example used an inaccurate DHCPv6 snooping configuration pattern for the discussed behavior. I replaced it with an IPv6 snooping policy constrained to DHCP and Source Guard on the access port.
- The binding-table command `show ipv6 snooping binding` was not the right Cisco command for the documented binding table. I changed it to `show ipv6 neighbor binding`.
- The Linux "uRPF" example did not actually perform reverse-path validation; it was just adding routes/rules. I replaced it with an `ip6tables` `rpfilter` example for strict and loose reverse-path filtering.
- The perimeter `INPUT` filter would have dropped required link-local control traffic on a box that also terminates the subnet. I narrowed the example to forwarded traffic and added a note about local control-plane exceptions.
- The troubleshooting block incorrectly referred to enabling uRPF logging and used a Linux sysctl unrelated to IPv6 reverse-path filtering. I replaced those with accurate Cisco verification commands and an `ip6tables` rule check.
- The opening uRPF explanation described strict-mode behavior as if it applied to all uRPF modes. I rewrote that sentence to distinguish general reachability checks from strict-mode incoming-interface validation.

## Review Notes
- The Cisco examples are still platform-family examples, not a guarantee that identical commands exist on every Cisco product line or software train. The post now reflects documented IOS / IOS XE first-hop security behavior accurately.
- On newer Cisco platforms, IPv6 Snooping is documented as deprecated in favor of SISF, but the commands remain documented and supported in current references. The post remains technically valid, though future revisions could call out SISF explicitly.
- The Linux examples use `ip6tables`, which is still valid but is considered legacy on some distributions in favor of `nftables`. The post is accurate as written, but a future update could add an `nftables` equivalent.

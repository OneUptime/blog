# Validation Summary: How to Understand the M Flag in Router Advertisements

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ICMPv6 Neighbor Discovery Protocol (NDP)
- IPv6 Router Advertisements (RA)
- M (Managed Address Configuration) flag
- O (Other Configuration) flag
- SLAAC (Stateless Address Autoconfiguration)
- DHCPv6 (stateful and stateless)
- radvd (Router Advertisement Daemon)
- tcpdump (BPF filters for ICMPv6)
- NetworkManager (nmcli)
- systemd-networkd (networkctl)

## Sources Consulted
- RFC 4861 - Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862 - IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 8415 - Dynamic Host Configuration Protocol for IPv6 (DHCPv6) - https://www.rfc-editor.org/rfc/rfc8415
- RFC 8504 - IPv6 Node Requirements - https://www.rfc-editor.org/rfc/rfc8504
- radvd.conf(5) man page - https://linux.die.net/man/5/radvd.conf
- tcpdump pcap-filter(7) man page for BPF syntax
- NetworkManager nm-settings documentation for ipv6.method values

## Issues Found
No technical issues found.

Key claims verified:
- **M flag bit position**: The post states the M flag is bit 7 (0x80) at offset 45 of the IPv6+ICMPv6 packet. Verified correct: IPv6 header (40 bytes) + ICMPv6 Type (1) + Code (1) + Checksum (2) + Cur Hop Limit (1) = offset 45 for the flags byte. Per RFC 4861 §4.2, the M flag is the most significant bit of that byte.
- **DHCPv6 multicast address**: ff02::1:2 is correct - this is the All_DHCP_Relay_Agents_and_Servers multicast address per RFC 8415.
- **radvd configuration directives**: AdvSendAdvert, AdvManagedFlag, AdvOtherConfigFlag, AdvOnLink, AdvAutonomous, AdvValidLifetime, AdvPreferredLifetime are all valid radvd directives with correct syntax.
- **BPF filter syntax**: `icmp6 and ip6[40] == 134 and (ip6[45] & 0x80) != 0` is syntactically valid and correctly identifies RAs with M=1.
- **tcpdump RA output flags**: "managed" and "other stateful" are the correct strings tcpdump uses for the M and O flags.
- **Recommended deployment pattern**: The advice to set M=1, O=1, and disable Autonomous (A=0) on the prefix when using stateful DHCPv6 is consistent with RFC and operational best practices, preventing hosts from forming additional SLAAC addresses alongside DHCPv6-assigned ones.

## Review Notes
- The M=1, O=0 row in the flag combinations table includes the parenthetical "(usually, unless O=0 truly)" which is awkwardly worded but technically describes the reality that a DHCPv6 client started due to M=1 will typically request other configuration options anyway. Not strictly incorrect.
- The NetworkManager `ipv6.method=auto` description ("→ SLAAC (RA M=0)") is a simplification - in practice, `auto` follows the RA flags and will engage DHCPv6 if M=1 is advertised. The comment is interpretive rather than strictly definitive but does not contain a factual error.
- Per RFC 4861 §4.2, the M flag indicates addresses are "available" via DHCPv6 rather than mandating use; the post's "SHOULD use" phrasing is consistent with operational expectations.

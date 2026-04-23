# Validation Summary: How to Reduce Broadcast Domain Size with VLANs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IEEE 802.1Q VLANs
- Cisco switching and inter-VLAN routing
- Linux `iproute2` (`ip link`, `ip addr`)
- `tcpdump` / libpcap filters
- `socat`
- ARP
- DHCP

## Sources Consulted
- Cisco: Configuring VLAN Trunks
  https://www.cisco.com/en/US/docs/switches/lan/catalyst3650/software/release/3se/consolidated_guide/configuration_guide/b_consolidated_3850_3se_cg_chapter_010001001.html
- Cisco: Configure Inter-VLAN Routing with Catalyst Switches
  https://www.cisco.com/c/en/us/support/docs/lan-switching/inter-vlan-routing/41260-189.html
- Cisco IOS Interface and Hardware Component Command Reference (`switchport trunk encapsulation`)
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-cr-book/ir-s7.html
- `ip-link(8)` man page
  https://man7.org/linux/man-pages/man8/ip-link.8.html
- `pcap-filter(7)` man page
  https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` man page
  https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `socat(1)` man page
  https://man7.org/linux/man-pages/man1/socat.1.html
- RFC 826: An Ethernet Address Resolution Protocol
  https://www.rfc-editor.org/rfc/rfc826.html
- RFC 2131: Dynamic Host Configuration Protocol
  https://www.rfc-editor.org/rfc/rfc2131

## Issues Found
- The Cisco trunk example used `switchport trunk encapsulation dot1q` in a generic "Cisco switch" configuration. Cisco's command reference states that this command is only supported on platforms and interface hardware that can support both ISL and 802.1Q encapsulation, so it can fail on many modern Catalyst switches where 802.1Q is implicit. I removed that line.
- The trunk comment specifically referred to an uplink "to the router" even though the next section demonstrates SVI-based inter-VLAN routing on a multilayer switch. I changed the comment to a neutral 802.1Q trunk description so the example no longer mixes two routing designs in the same snippet.

## Review Notes
- No other technical issues were found after verification.
- The Linux broadcast-isolation example is syntactically valid, but it assumes `socat` is installed and that VLAN subinterfaces such as `eth0.10` and `eth0.20` already exist on the test host.
- The VLAN sizing table is reasonable design guidance, but those prefix sizes are recommendations rather than protocol or vendor limits.

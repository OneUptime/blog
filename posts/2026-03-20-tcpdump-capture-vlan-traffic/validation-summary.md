# Validation Summary: How to Capture Packets on a Specific VLAN with tcpdump

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter syntax
- Berkeley Packet Filter expressions
- IEEE 802.1Q VLAN tagging and QinQ
- Linux VLAN interfaces with iproute2
- NetworkManager / nmcli VLAN profiles
- Netplan VLAN configuration
- Wireshark display filters and conversation statistics
- SPAN / mirrored switch traffic

## Sources Consulted
- tcpdump.org pcap-filter(7) manual: https://www.tcpdump.org/manpages/pcap-filter.7.txt
- tcpdump.org tcpdump(1) manual: https://www.tcpdump.org/manpages/tcpdump.1.txt
- Linux man-pages pcap-filter(7), generated from upstream libpcap: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux man-pages ip-link(8): https://man7.org/linux/man-pages/man8/ip-link.8.html
- NetworkManager nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Wireshark display filter manual: https://www.wireshark.org/docs/man-pages/wireshark-filter.html
- Wireshark 802.1Q VLAN display filter reference: https://www.wireshark.org/docs/dfref/v/vlan.html
- Wireshark User's Guide, Conversations and Endpoints: https://www.wireshark.org/docs/wsug_html_chunked/ChStatConversations.html and https://www.wireshark.org/docs/wsug_html_chunked/ChStatEndpoints.html
- Cisco IEEE 802.1Q frame format reference: https://www.cisco.com/c/en/us/support/docs/lan-switching/8021q/17056-741-4.html
- Cisco SPAN configuration example: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/10570-41.html
- Local command checks: `tcpdump --help`, `tcpdump -d`, `ip link help vlan`, `nmcli con add help`, and tcpdump output checks using a synthetic 802.1Q PCAP on tcpdump 4.99.4/libpcap 1.10.4.

## Issues Found
- The VLAN overview said every frame on a trunk has a tag. 802.1Q trunks can carry an untagged/native VLAN, so the wording now says tagged VLAN frames have a tag and notes the native VLAN caveat.
- The multi-VLAN tcpdump example used `vlan 100 or vlan 200 or vlan 300`. In pcap-filter syntax, each repeated `vlan` primitive advances the decode offset by 4 bytes, so that expression does not mean "outer VLAN 100 or 200 or 300." Replaced it with an outer-tag TCI match using `vlan and ether[14:2] & 0x0fff`.
- The comment for `vlan and host 192.168.100.50` said "going to" a host, but `host` matches source or destination. Updated the comment to "to or from."
- The Wireshark VLAN range filter used separate `>=` and `<=` comparisons. For fields that can appear more than once in QinQ frames, this can be ambiguous, so it now uses `vlan.id in {100..200}`.
- The QinQ Wireshark filter used `vlan.id == 100 and vlan.id == 200` while claiming outer VLAN 100 and inner VLAN 200. That checks for both values but does not pin the layer order. Updated it to `vlan.id#1 == 100 and vlan.id#2 == 200`.
- The Wireshark statistics note implied Conversations > Ethernet directly shows conversations per VLAN. Updated it to apply a VLAN display filter first, then open Ethernet conversations for the displayed VLAN traffic.
- The SPAN section said the destination receives tagged frames from the trunk. Some switches require explicit destination trunking or encapsulation configuration to preserve/tag VLAN information, so the note now calls that out.
- The SPAN `awk` examples parsed fixed tcpdump fields that did not contain VLAN IDs in normal output. Added `-e` for link-level header output and replaced the field parsing with VLAN-token and MAC-address parsing that matches tcpdump's Ethernet output.

## Review Notes
All tcpdump capture filters in the post compile successfully with `tcpdump -d` on tcpdump 4.99.4/libpcap 1.10.4. The `ip link add link eth0 name eth0.100 type vlan id 100` and `nmcli con add type vlan ... dev eth0 id 100` examples match the consulted command help and documentation. The Netplan snippet uses the documented `network.version`, `vlans`, `id`, `link`, `dhcp4`, and `addresses` keys. Live captures still depend on the NIC, driver offload behavior, interface permissions, and whether mirrored/SPAN traffic actually preserves VLAN tags.

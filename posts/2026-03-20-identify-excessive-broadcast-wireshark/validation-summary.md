# Validation Summary: How to Identify Excessive Broadcast Traffic with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- TShark
- libpcap capture filters
- ARP
- DHCP
- NetBIOS Name Service (NBNS)
- mDNS
- SSDP

## Sources Consulted
- Wireshark User's Guide, Statistics chapter: https://www.wireshark.org/docs/wsug_html_chunked/ChStatistics.html
- Wireshark User's Guide, Protocol Hierarchy: https://www.wireshark.org/docs/wsug_html_chunked/ChStatHierarchy
- Wireshark User's Guide, Conversations: https://www.wireshark.org/docs/wsug_html_chunked/ChStatConversations
- Wireshark User's Guide, Endpoints: https://www.wireshark.org/docs/wsug_html_chunked/ChStatEndpoints.html
- Wireshark `pcap-filter(7)` man page: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Wireshark `wireshark-filter(4)` man page: https://www.wireshark.org/docs/man-pages/wireshark-filter
- Wireshark Display Filter Reference, Ethernet: https://www.wireshark.org/docs/dfref/e/eth.html
- Wireshark Display Filter Reference, ARP: https://www.wireshark.org/docs/dfref/a/arp.html
- Wireshark Display Filter Reference, DHCP: https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark Display Filter Reference, NBNS: https://www.wireshark.org/docs/dfref/n/nbns.html
- Wireshark Wiki, Ethernet: https://wiki.wireshark.org/Ethernet
- TShark man page: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 5227, IPv4 Address Conflict Detection: https://www.rfc-editor.org/rfc/rfc5227
- RFC 6762, Multicast DNS: https://www.rfc-editor.org/rfc/rfc6762
- UPnP Device Architecture 1.0: https://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.0.pdf

## Issues Found
- The capture-filter explanation overstated what each example did. I clarified that `ether broadcast` captures only Ethernet broadcasts, while `ether multicast` captures Ethernet group traffic, which includes multicast and the all-ones broadcast address.
- The post used `bootp` as the DHCP display filter. Current Wireshark documentation uses `dhcp`, so I updated the example.
- The ARP, DHCP, and NBNS examples were labeled as broadcast-only even though the original filters would also match non-broadcast traffic. I added `eth.dst == ff:ff:ff:ff:ff:ff` to keep those examples aligned with the article's broadcast-analysis goal.
- The mDNS and SSDP examples were listed under a broadcast-only section even though they are discovery traffic rather than Ethernet broadcast examples. I relabeled the section and replaced those examples with standards-based filters for mDNS and SSDP traffic.
- The Endpoints step implied that the top senders list automatically represented broadcast traffic. I added the requirement to apply the broadcast display filter first so Wireshark can limit the statistics dialog to the displayed packets.
- The I/O Graphs step used `Packets/s` as the Y-axis label. Current Wireshark labels that Y-axis option as `Packets`, with the effective rate determined by the chosen interval, so I corrected the wording.
- The storm-source example filtered on all ARP traffic, which could include replies and dilute the broadcast-focused view. I narrowed it to broadcast-destination ARP frames.
- The gratuitous-ARP example used a manual sender-IP/target-IP comparison. I replaced it with Wireshark's built-in `arp.isgratuitous` field plus `arp.opcode == 1`, which is clearer and directly supported in current Wireshark.
- The CSV export step said to copy and paste to a spreadsheet. I updated it to explicitly choose CSV from Wireshark's Copy options.

## Review Notes
- The post now reflects current Wireshark 3.x/4.x display-filter naming, where DHCP traffic is filtered as `dhcp`. Older Wireshark releases exposed BOOTP/DHCP fields differently.

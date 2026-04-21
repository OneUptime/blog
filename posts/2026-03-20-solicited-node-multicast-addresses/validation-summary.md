# Validation Summary: How to Understand Solicited-Node Multicast Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 solicited-node multicast addresses
- Neighbor Discovery Protocol (NDP)
- Duplicate Address Detection (DAD)
- Ethernet IPv6 multicast address mapping
- Linux iproute2 `ip maddr`
- `tcpdump` / libpcap filter syntax
- Python `ipaddress`

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 2464, Transmission of IPv6 Packets over Ethernet Networks: https://www.rfc-editor.org/rfc/rfc2464
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Linux `ip-maddress(8)` manual page: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- `tcpdump(8)` manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post described NDP as finding a "MAC address" generally. Changed this to "link-layer address (the MAC address on Ethernet)" and updated the diagram labels because RFC 4861 defines Neighbor Discovery in terms of link-layer addresses, not only Ethernet MAC addresses.
- The multicast filtering explanation said non-target hosts discard the packet "at the network interface level." Changed this to "at the link or IPv6 multicast layer" because hardware, switch, driver, and IPv6 multicast filtering behavior can vary.
- The Linux and summary sections said every configured IPv6 address creates a solicited-node group. Changed this to "unicast or anycast IPv6 address" to match RFC 4291 and RFC 4861.
- The DAD section only treated Neighbor Advertisements as conflict signals. Updated it to include conflicting Neighbor Solicitations, which RFC 4862 also uses to detect duplicate tentative addresses.
- The `tcpdump` example used a hard-coded `ip6[40]` ICMPv6 type offset. Replaced it with named libpcap ICMPv6 fields and values: `icmp6[icmp6type] == icmp6-neighborsolicit` and `icmp6[icmp6type] == icmp6-neighboradvert`.
- The solicited-node group collision probability wording was imprecise. Changed it to describe the pairwise probability as 1 in 2^24, about 1 in 16.7 million.
- The summary used the shorthand prefix `ff02::1:ff`. Changed it to the full `ff02::1:ff00:0/104` prefix.

## Review Notes
The Python example was executed locally with Python 3.12.3 and produced the expected solicited-node multicast addresses. The updated tcpdump filter was compiled locally with tcpdump 4.99.4 and libpcap 1.10.4. Linux examples assume the interface is named `eth0` and that the user has privileges for address assignment and packet capture.

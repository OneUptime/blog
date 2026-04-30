# Validation Summary: How to Understand Gratuitous ARP and Its Uses

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- IPv4
- Linux `arping`
- Scapy
- `tcpdump` / libpcap capture filters
- Wireshark display filters
- VRRP
- HSRP

## Sources Consulted
- RFC 5227, "IPv4 Address Conflict Detection" - https://www.rfc-editor.org/rfc/rfc5227
- RFC 5798, "Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6" - https://www.rfc-editor.org/rfc/rfc5798
- `arping(8)` iputils manual page - https://man7.org/linux/man-pages/man8/arping.8.html
- Scapy ARP API reference - https://scapy.readthedocs.io/en/latest/api/scapy.layers.l2.html
- Scapy usage guide - https://scapy.readthedocs.io/en/stable/usage.html
- Wireshark `pcap-filter` manual page - https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Wireshark ARP display filter reference - https://www.wireshark.org/docs/dfref/a/arp.html
- Cisco HSRP documentation - https://www.cisco.com/en/US/docs/ios-xml/ios/ipapp_fhrp/configuration/15-0s/fhp-hsrp.html

## Issues Found
- The post described gratuitous ARP as a mechanism for duplicate-address detection. I corrected this to distinguish gratuitous ARP announcements from standards-based ARP Probes, which use sender IP `0.0.0.0` per RFC 5227.
- The ARP packet-format example labeled `00:00:00:00:00:00` as a broadcast target MAC. I corrected the format to show the Ethernet destination as broadcast and the ARP target hardware address as zeroed/ignored.
- The Scapy gratuitous-ARP example used `hwdst='ff:ff:ff:ff:ff:ff'` inside the ARP payload. I changed it to `00:00:00:00:00:00` to match the ARP Announcement format described in RFC 5227.
- The `tcpdump` example filtered only on ARP opcode `1`, which matches all ARP requests. I corrected it to also compare sender and target protocol addresses so it specifically matches gratuitous ARP requests.
- The HA wording implied a physical MAC change. I clarified it to refer to the virtual IP-to-MAC mapping used by VRRP/HSRP and aligned the summary text and description accordingly.

## Review Notes
- RFC 5227 prefers ARP Request packets for announcements; unsolicited ARP Replies do exist and tools such as `arping -A` can generate them, but broadcast ARP Replies are not recommended for general use.
- `arping` is part of `iputils` and requires raw-packet privileges (`CAP_NET_RAW`) on Linux.

# Validation Summary: How to Understand IPv4 Multicast Addressing (224.0.0.0/4)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 multicast
- IGMP and IGMPv3
- Ethernet multicast MAC addressing
- Linux networking tools (`tcpdump`, `ip`, `netstat`)
- Python `socket` multicast programming

## Sources Consulted
- IANA IPv4 Multicast Address Space: https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112.html
- RFC 4607, Source-Specific Multicast for IP: https://www.rfc-editor.org/rfc/rfc4607
- RFC 3180, GLOP Addressing in 233/8: https://www.rfc-editor.org/rfc/rfc3180.html
- RFC 5110, Overview of the Internet Multicast Routing Architecture: https://www.rfc-editor.org/rfc/rfc5110.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `ip-maddress(8)` manual page: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- Linux `ip-mroute(8)` manual page: https://man7.org/linux/man-pages/man8/ip-mroute.8.html
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The introduction incorrectly grouped OSPF and RIP with service discovery. I changed it so mDNS is described as service discovery, while OSPF and RIP are described as routing protocols.
- The `224.0.0.0/24` note implied TTL was the key reason the block stays local. I changed it to state that routers do not forward this block regardless of TTL, which matches IANA and RFC guidance.
- The SSM description claimed there is no group-management overhead. I changed it to describe the actual SSM behavior: receivers join `(S,G)` channels directly.
- The post described all of `233.0.0.0/8` as GLOP. I narrowed that line to `233.0.0.0-233.251.255.255` and clarified the public 16-bit ASN mapping used by GLOP.
- The MAC-mapping explanation said the high bit of the third IP octet is dropped. I corrected it to the low-23-bit mapping rule used by RFC 1112.
- The MAC-aliasing explanation overstated what happens on the wire. I reworded it to explain that Layer 2 MAC-based filtering can forward extra traffic and that unwanted packets are discarded at the IP layer.
- The Linux command for checking "multicast promiscuous mode" was actually checking multicast capability. I replaced it with an `ip -details link show` check for `allmulti`, which reflects all-multicast mode.
- The conclusion incorrectly implied SSDP uses `224.0.0.0/24`. I corrected it to `239.255.255.250`.

## Review Notes
- The Python sender and receiver snippets compile under Python 3.12.3 in the local review environment.
- The `tcpdump` filters shown in the post parse correctly with `tcpdump` 4.99.4 and libpcap 1.10.4 in the local review environment.
- `netstat -g` is valid on systems that still ship `net-tools`; `ip maddr show` is the more current Linux-native command.

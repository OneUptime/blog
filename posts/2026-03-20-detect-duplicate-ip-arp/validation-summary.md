# Validation Summary: How to Detect Duplicate IP Addresses Using ARP

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- IPv4 Address Conflict Detection
- `arping` from iputils
- Scapy
- Wireshark
- Linux `ip neigh`
- Bash
- Python

## Sources Consulted
- RFC 5227: IPv4 Address Conflict Detection — https://www.rfc-editor.org/rfc/rfc5227
- Scapy layer 2 API reference (`ARP`, `arping`) — https://scapy.readthedocs.io/en/latest/api/scapy.layers.l2.html
- Scapy usage guide — https://scapy.readthedocs.io/en/stable/usage.html
- Wireshark Display Filter Reference: ARP — https://www.wireshark.org/docs/dfref/a/arp.html
- iputils `arping` source and release history — https://github.com/iputils/iputils/blob/master/arping.c
- iputils releases — https://github.com/iputils/iputils/releases
- Local `ip neigh help` output
- `ip-neighbour(8)` manual mirror — https://www.systutorials.com/docs/linux/man/8-ip-neighbour/

## Issues Found
- The Scapy single-IP example sent a gratuitous/announcement-style ARP packet and described it as a detection method. I changed it to send a standard ARP request for the target IP, which is the correct packet type for soliciting replies from any host claiming that address.
- The Scapy single-IP example stored replies in a list and reported the IP as "owned by" a MAC. I changed it to deduplicate MAC addresses and report ARP replies more precisely.
- The ARP table monitoring script reported any neighbor-table change, not actual IP-to-MAC flapping. I changed it to track per-IP MAC changes so it now aligns with the text about duplicate-IP symptoms.
- The subnet-scan Scapy example used an unused `ipaddress` import and counted replies in a list. I removed the unused code and changed the mapping to sets so the script reports multiple distinct MAC responders for the same IP.
- The resolution step used `ip neigh flush all`, which flushes the generic neighbor table. I changed it to `ip -4 neigh flush all` so the command explicitly matches the article’s IPv4/ARP scope.

## Review Notes
- The ARP-based methods in this post apply to the local Layer 2 segment; ARP does not detect duplicate IPv4 use across routed boundaries.
- The Wireshark field `arp.duplicate-address-detected` is present in the official display-filter reference for current Wireshark releases listed there.
- The Python and Bash code blocks were syntax-checked after editing. Network-packet transmission with Scapy still requires appropriate privileges at runtime.

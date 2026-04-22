# Validation Summary: How to Sniff IPv4 Network Traffic with Scapy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Scapy
- IPv4 packet sniffing
- BPF packet filters
- TCP, UDP, ICMP, and DNS packet inspection
- PCAP capture files

## Sources Consulted
- Scapy `sniff()` / `AsyncSniffer` API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy usage documentation for sniffing, filters, and PCAP import/export: https://scapy.readthedocs.io/en/latest/usage.html
- Scapy utility API documentation for `wrpcap()` and `rdpcap()`: https://scapy.readthedocs.io/en/latest/api/scapy.utils.html
- Scapy network stack documentation for interface listing and `get_if_list()`: https://scapy.readthedocs.io/en/latest/routing.html
- Scapy troubleshooting documentation for promiscuous mode configuration: https://scapy.readthedocs.io/en/latest/troubleshooting.html
- Scapy source for `AsyncSniffer` / `sniff()` arguments: https://github.com/secdev/scapy/blob/master/scapy/sendrecv.py
- Linux `pcap-filter(7)` manual for BPF filter expression syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
1. **Overstated promiscuous-mode behavior**: The overview said Scapy's `sniff()` "puts your network interface into promiscuous mode." Scapy supports promiscuous sniffing, but the behavior is configurable and platform-dependent. Updated the sentence to say `sniff()` captures on a network interface and can use promiscuous mode depending on Scapy configuration and platform support.
2. **Overly strict privilege statement**: The conclusion said root privileges are required for promiscuous mode sniffing. Live capture normally requires elevated privileges, but systems may grant equivalent packet-capture capabilities or administrator rights without using the root account directly. Updated the wording to "Root/administrator or equivalent packet-capture privileges are usually required."

## Review Notes
- All seven Python code blocks compile syntactically under Python 3.12.3.
- The code examples use current Scapy APIs documented in the latest Scapy documentation: `sniff()`, `stop_filter`, `timeout`, `store=False`, `iface`, `get_if_list()`, `wrpcap()`, and `rdpcap()`.
- The BPF filters shown (`ip`, `tcp port 80 or tcp port 443`, `udp`, `ip and tcp`, and `udp port 53`) are valid packet filter expressions.
- The live sniffing examples were not executed because they require live packet-capture privileges and would depend on host interface names and local traffic.

# Validation Summary: How to Understand ARP Request and Reply Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP (Address Resolution Protocol)
- IPv4
- Ethernet and MAC addressing
- Scapy (Python)
- tcpdump and libpcap/BPF filters

## Sources Consulted
- RFC 826, "An Ethernet Address Resolution Protocol": https://www.rfc-editor.org/rfc/rfc826.html
- RFC 5227, "IPv4 Address Conflict Detection" (updates RFC 826): https://www.rfc-editor.org/rfc/rfc5227.html
- Scapy usage guide, ARP ping example: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `scapy.layers.l2` API reference (`ARP` fields and defaults): https://scapy.readthedocs.io/en/latest/api/scapy.layers.l2.html
- Scapy `scapy.sendrecv` API reference (`srp()` and `sendp()`): https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- `pcap-filter(7)` manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `tcpdump(8)` manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Local verification with `tcpdump --help`, `man tcpdump`, and `man pcap-filter` on tcpdump 4.99.4 / libpcap 1.10.4
- Local verification with Scapy 2.7.0 via `python3` introspection of `ARP`, `srp`, and `sendp`

## Issues Found
- The Scapy examples hardcoded `eth0` as the default interface. I changed both function defaults to `iface=None` because Scapy accepts `None` and uses the appropriate interface, while `eth0` is not a portable assumption on modern Linux systems.
- The sentence "ARP packets are 28 bytes for IPv4/Ethernet" was imprecise. I changed it to "The ARP message body is 28 bytes for IPv4 over Ethernet" because the ARP payload is 28 bytes, but the full Ethernet frame is larger.
- The wording around the target MAC in requests was too absolute. I changed it to "typically" all zeros to better reflect RFC nuance while remaining accurate for common Ethernet/IPv4 ARP requests.

## Review Notes
- The `tcpdump` commands are valid. `-n` disables name resolution, `-e` prints the link-layer header, and `arp[6:2]` correctly addresses the ARP opcode field relative to the ARP header.
- The Scapy code is syntactically correct and uses current APIs. The request example matches Scapy's documented `srp(Ether()/ARP())` pattern for layer-2 ARP discovery.
- Sending or capturing ARP traffic usually requires elevated privileges or the relevant packet-capture capabilities on the host.

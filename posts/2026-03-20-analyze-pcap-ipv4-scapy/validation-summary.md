# Validation Summary: How to Analyze PCAP Files for IPv4 Traffic Using Scapy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy
- PCAP packet capture files
- IPv4 packet analysis
- TCP
- UDP
- ICMP

## Sources Consulted
- Scapy API reference for `rdpcap`, `PcapReader`, and `wrpcap`: https://scapy.readthedocs.io/en/latest/api/scapy.utils.html
- Scapy usage documentation, including packet examples with `Raw` payloads and PCAP read/write examples: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy HTTP layer documentation, including notes on TCP stream reassembly with `TCPSession`: https://scapy.readthedocs.io/en/stable/layers/http.html
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- IANA protocol numbers registry for IPv4 protocol values (`1` ICMP, `6` TCP, `17` UDP): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The “Writing Filtered Packets to a New PCAP” example said it kept packets to or from a subnet, but the code only checked `p[IP].dst`. I changed it to use Python’s `ipaddress` module and match both source and destination addresses against `192.168.1.0/24`, which makes the example behave as described.
- The “Extracting TCP Conversations” snippet described its grouping key as a TCP “5-tuple,” but the code actually groups bidirectional endpoint pairs for TCP packets. I corrected the comment so it matches the implementation.

## Review Notes
- No other technical issues found after checking the code examples against Scapy’s current documentation and running local behavioral sanity checks with synthetic packets.
- The HTTP example is valid for plaintext HTTP request lines present in a packet payload, but full HTTP stream reassembly in multi-packet captures would require Scapy’s HTTP tooling with `TCPSession`.

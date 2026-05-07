# Validation Summary: How to Analyze DNS Queries over IPv4 Using dpkt

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- dpkt
- Scapy
- DNS
- IPv4
- PCAP

## Sources Consulted
- dpkt project docs: https://kbandla.github.io/dpkt/
- dpkt packet parsing example: https://kbandla.github.io/dpkt/print_packets.html
- dpkt DNS module source/docs: https://dpkt.readthedocs.io/en/latest/_modules/dpkt/dns.html
- Scapy `sniff()` API docs: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy DNS layer docs: https://scapy.readthedocs.io/en/latest/api/scapy.layers.dns.html
- RFC 1035, DNS message header format: https://www.rfc-editor.org/rfc/rfc1035
- RFC 7766, DNS over TCP requirements: https://datatracker.ietf.org/doc/html/rfc7766

## Issues Found
- The parser snippet used `dpkt.dns.DNS_QTYPE_STR`, which is not available in current `dpkt`; I removed that field so the example runs with current releases.
- The introduction said `dpkt` handled live capture, but the live example uses Scapy; I clarified that `dpkt` is used for PCAP parsing and Scapy is paired in for live capture.
- The prerequisites only installed `dpkt` even though the live example imports Scapy; I updated the install command to include `scapy`.
- The parser comment said "DNS uses UDP port 53", which overstates DNS transport support; I changed it to say the example focuses on DNS over UDP on port 53.
- The live capture callback accessed `pkt[IP]` without first ensuring an IPv4 layer was present; I added an IPv4 layer check and narrowed the BPF filter to `ip and udp port 53`.
- The suspicious-label comment said it skipped the TLD and SLD, but the code actually skips the last two labels as a heuristic; I corrected the comment to match the implementation.

## Review Notes
- The offline parser example still assumes an Ethernet PCAP and only covers UDP-based DNS traffic, which is now stated explicitly in the function docstring.
- Local sanity checks passed after the fixes: all Python blocks parsed successfully, the offline parser extracted one synthetic DNS query and one A-record response from a generated PCAP, and the Scapy callback handled an IPv4 DNS query packet correctly.

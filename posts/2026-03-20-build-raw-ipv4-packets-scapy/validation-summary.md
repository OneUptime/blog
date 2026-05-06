# Validation Summary: How to Build Raw IPv4 Packets with Scapy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Scapy
- IPv4
- UDP
- TCP
- ICMP
- DNS message format
- PCAP capture and replay

## Sources Consulted
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy packet API documentation: https://scapy.readthedocs.io/en/stable/api/scapy.packet.html
- Scapy send/receive API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- Scapy `all.py` source export list: https://raw.githubusercontent.com/secdev/scapy/master/scapy/all.py
- Scapy IPv4/UDP layer source, including `fragment()` and UDP defaults: https://raw.githubusercontent.com/secdev/scapy/master/scapy/layers/inet.py
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.txt
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035.txt

## Issues Found
- The basic packet example imported `show_bytes` from `scapy.all`, but that symbol is not exported by current Scapy releases. I removed the import so the snippet runs as written.
- The UDP payload example built a malformed DNS header by setting all four count fields to `1` and omitting the question section entirely. I replaced it with a minimal valid raw DNS query payload, added the missing QNAME/QTYPE/QCLASS bytes, and set an explicit UDP source port.
- The fragmentation example claimed `fragsize=780` would produce 780-byte fragment payloads. Scapy rounds non-final fragment sizes down to an 8-byte boundary, per IPv4 fragmentation rules, so I changed the example to `776` bytes to match the stated MTU goal and actual behavior.

## Review Notes
- The examples are technically correct after the fixes above, but interface names such as `eth0` are environment-specific and may need to be adjusted on systems that use different naming.

# Validation Summary: How to Craft Custom IPv4 Packets Using Scapy in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy (network packet manipulation library)
- IPv4
- TCP / UDP / ICMP protocols
- Raw sockets

## Sources Consulted
- Scapy official documentation: https://scapy.readthedocs.io/en/latest/
- Scapy usage guide: https://scapy.readthedocs.io/en/latest/usage.html
- Scapy API reference for IP, TCP, UDP, ICMP, Raw layers
- Scapy sending/receiving functions reference (send, sendp, sr1)
- RFC 791 (Internet Protocol) for IPv4 header fields
- RFC 793 (Transmission Control Protocol) for TCP fields

## Issues Found
No technical issues found.

All code samples use valid Scapy APIs:
- Imports from `scapy.all` are correct
- `IP()` class fields (`src`, `dst`, `ttl`, `tos`, `id`, `flags`) are all valid
- `TCP()` class fields (`sport`, `dport`, `flags`, `seq`, `window`) are all valid
- IP `flags="DF"` (Don't Fragment) and TCP `flags="S"` (SYN) are correct flag mnemonics
- `packet.show()` and `packet.show2()` are both valid methods (show2 builds the packet to show computed checksums)
- `send()` is correctly described as Layer 3 send without response handling
- `sr1()` is correctly described as send/receive one packet
- `Raw(load=b"...")` correctly attaches a raw payload
- `RandShort()` is a valid Scapy random value class for 16-bit ints
- `send()` correctly accepts a list of packets

## Review Notes
- In the "Sending Multiple Packets" section, the imports include `sendp` and `Ether` which are not used in the example. This is harmless (extraneous imports) but could be cleaned up. Not a technical error.
- The `tos=0` value in the IP header example is the default; setting it explicitly is redundant but not incorrect.
- The post correctly emphasizes that raw socket operations require root privileges and includes appropriate warnings about source IP spoofing being illegal on networks the user doesn't own.
- Scapy is actively maintained; the APIs shown are stable and have been consistent across recent versions (2.4.x and 2.5.x).

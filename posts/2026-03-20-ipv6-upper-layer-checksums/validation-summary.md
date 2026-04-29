# Validation Summary: How to Calculate Upper-Layer Checksums with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- TCP
- UDP
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Python
- Scapy

## Sources Consulted
- RFC 8200: IPv6 Specification https://datatracker.ietf.org/doc/rfc8200/
- RFC 4443: ICMPv6 Specification https://datatracker.ietf.org/doc/html/rfc4443
- RFC 4291: IPv6 Addressing Architecture https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861: Neighbor Discovery for IPv6 https://datatracker.ietf.org/doc/rfc4861/
- RFC 6936: Applicability Statement for the Use of IPv6 UDP Datagrams with Zero Checksums https://datatracker.ietf.org/doc/html/rfc6936
- RFC 1071: Computing the Internet Checksum https://datatracker.ietf.org/doc/rfc1071/
- Python `struct` documentation https://docs.python.org/3/library/struct.html
- Python `socket` documentation https://docs.python.org/3/library/socket.html
- Scapy functions documentation https://scapy.readthedocs.io/en/latest/functions.html
- Scapy IPv6 API documentation https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html

## Issues Found
- The Neighbor Solicitation example used the wrong solicited-node multicast prefix when deriving the checksum destination address. It used `0xff020000000000000000000100ff0000`, which resolves to `ff02::1:ff:0/104` rather than the RFC 4291 solicited-node prefix `ff02::1:ff00:0/104`. I corrected the prefix to `0xff0200000000000000000001ff000000`, which fixes the computed ICMPv6 checksum.
- The prose overstated the checksum requirements in two places. I changed the introduction to scope the statement to TCP, UDP, and ICMPv6 rather than implying every IPv6 upper-layer protocol behaves this way, and I updated the UDP wording to say the checksum is mandatory by default over IPv6 while noting the RFC 6936 tunnel-mode exception.

## Review Notes
- The checksum implementations were re-run locally with `python3`, and the sample TCP and UDP checksum results matched Scapy.
- After correcting the solicited-node multicast prefix, the sample Neighbor Solicitation checksum matched Scapy (`0x1F31`) for the same IPv6 source, destination, and target values.
- The Neighbor Solicitation example focuses on ICMPv6 checksum construction for the message body. A full on-link address-resolution exchange may also require NDP options such as Source Link-Layer Address, depending on the scenario and link layer.

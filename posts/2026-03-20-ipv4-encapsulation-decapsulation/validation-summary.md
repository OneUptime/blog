# Validation Summary: How to Understand IPv4 Encapsulation and Decapsulation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- Ethernet
- TCP
- GRE
- IP-in-IP tunneling
- Python
- Linux `ip` networking tools

## Sources Consulted
- RFC 791, Internet Protocol: https://datatracker.ietf.org/doc/html/rfc791
- RFC 2003, IP Encapsulation within IP: https://datatracker.ietf.org/doc/html/rfc2003
- RFC 2784, Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Python `socket` library documentation: https://docs.python.org/3/library/socket.html
- Python `struct` library documentation: https://docs.python.org/3/library/struct.html
- Local CLI help from `ip tunnel help` on the review system

## Issues Found
- The Python decapsulation example originally sliced the IPv4 payload to the end of the Ethernet payload, which can include trailing Ethernet padding rather than only the IP payload. I changed it to use the IPv4 Total Length field so the returned payload matches the IPv4 datagram length defined in RFC 791.
- The GRE explanation originally described tunneling as wrapping IP datagrams inside other IP datagrams. I corrected this to distinguish IP-in-IP from GRE: IP-in-IP adds an outer IP header, while GRE over IPv4 adds an outer IP header plus a GRE header, consistent with RFC 2003 and RFC 2784.
- The final takeaway originally said changing one layer does not require modifying others. I corrected this because outer headers may need updates to length, checksum, or framing fields when encapsulated data changes.

## Review Notes
- The Python snippet is intentionally minimal and demonstrates parsing rather than production-grade validation; it does not verify EtherType, IPv4 version, or header checksum.
- The GRE tunnel commands are syntactically valid, but running them requires appropriate Linux privileges and kernel tunnel support.

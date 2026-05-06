# Validation Summary: How to Compare IPv4 and IPv6 Header Structures

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- Python 3
- Python `socket` module
- Path MTU Discovery (PMTUD)

## Sources Consulted
- RFC 791, "Internet Protocol" - https://datatracker.ietf.org/doc/html/rfc791
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/rfc8200/
- RFC 6437, "IPv6 Flow Label Specification" - https://datatracker.ietf.org/doc/html/rfc6437
- RFC 8201, "Path MTU Discovery for IP version 6" - https://datatracker.ietf.org/doc/html/rfc8201
- Python documentation, `socket` module - https://docs.python.org/3/library/socket.html

## Issues Found
- The description said IPv6 "replac[ed] the checksum," which is inaccurate because the IPv6 base header removes the header checksum rather than replacing it with another header field. This was corrected.
- The IPv6 Identification row implied the field was simply removed; in practice, it exists only in the Fragment extension header when source fragmentation is used. The table entry was corrected to reflect that.
- The fragmentation and Flow Label explanations were too absolute. The post now reflects that routers do not fragment IPv6 packets, hosts typically use PMTUD, the Fragment header is source-added when needed, and the Flow Label marks packets belonging to the same flow for flow-specific handling.
- The key takeaways overstated that IPv6 removed fragmentation and identification fields entirely. This was corrected to say those fields were removed from the base header.

## Review Notes
- The Python snippet is syntactically valid and the parsing logic for the fields shown is correct. It was also executed successfully with sample IPv4 and IPv6 headers under `python3`.
- The sample code does not validate packet length or the version nibble before indexing into the byte array. That is acceptable for an illustrative blog post but would need hardening in production code.

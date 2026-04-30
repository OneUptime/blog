# Validation Summary: How to Understand IPv4 Packet Identification for Reassembly

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP fragmentation and reassembly
- Scapy
- tcpdump

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1122, "Requirements for Internet Hosts -- Communication Layers": https://www.rfc-editor.org/rfc/inline-errata/rfc1122.html
- RFC 6864, "Updated Specification of the IPv4 ID Field": https://www.rfc-editor.org/rfc/rfc6864.html
- RFC 6274, "Security Assessment of the Internet Protocol Version 4": https://www.rfc-editor.org/rfc/inline-errata/rfc6274.html
- Scapy 2.7.0 usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Local `pcap-filter(7)` man page and `tcpdump 4.99.4` `-h`/`-d` output

## Issues Found
- The fragmentation explanation implied routers always split oversized packets. I changed it to note that router fragmentation occurs only when the IPv4 `DF` bit is clear, per RFC 791.
- The reassembly timeout was described as "typically 30–120 seconds". I corrected this to cite RFC 1122's recommended 60–120 second reassembly timeout range.
- The post equated "atomic datagrams" with any packet that has `DF` set. I corrected this to RFC 6864's definition: `DF=1`, `MF=0`, and fragment offset `0`.
- The statement that "modern kernels use per-destination randomized counters" was too broad and not generally true across implementations. I replaced it with a more accurate implementation-specific statement.

## Review Notes
- The Scapy example is syntactically valid with Scapy 2.7.0 and correctly sets and reads the IPv4 `id` field. Sending raw packets with Scapy generally requires sufficient privileges.
- The `tcpdump` filter is valid and compiles correctly; it matches packets with the IPv4 `MF` flag set or a non-zero fragment offset.

# Validation Summary: How to Understand the IPv4 Packet Header Structure

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- Internet Protocol header fields
- Python
- `tcpdump`
- Wireshark

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers": https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP": https://www.rfc-editor.org/rfc/rfc3168
- RFC 1812, "Requirements for IP Version 4 Routers": https://www.rfc-editor.org/rfc/rfc1812
- Python `struct` module documentation: https://docs.python.org/3.11/library/struct.html
- Python `socket` module documentation: https://docs.python.org/3.11/library/socket.html
- Wireshark IPv4 display filter reference: https://www.wireshark.org/docs/dfref/i/ip.html
- Local `tcpdump(8)` manual and `tcpdump --help` output from the installed `tcpdump` 4.99.4

## Issues Found
- The Type of Service field description was outdated and incomplete. I changed it from a DSCP-only description to `DSCP/ECN markings (historically TOS)` to match RFC 2474 and RFC 3168.
- The Flags field description omitted the reserved bit. I changed it to `Fragmentation control bits (reserved, DF, MF)` to reflect the full 3-bit field.
- The Fragment Offset field description omitted its unit. I changed it to specify that the offset is measured in 8-byte units, matching RFC 791.
- The Time to Live description treated TTL purely as a hop limit. I changed it to `Packet lifetime; decremented by at least 1 at each router` to better match RFC 791 and RFC 1812.
- The packet-capture example was too broad about raw socket behavior. I clarified that the `AF_PACKET` example is Linux-specific and that the 14-byte Ethernet II header is only skipped when present.
- The `tcpdump -v` annotation incorrectly said verbose mode shows the checksum. I changed it to describe the fields that `tcpdump(8)` actually prints in verbose mode for the shown example.
- The summary described the IPv4 header as a fixed 20-byte structure followed by extensions. I corrected this to say the header has a fixed 20-byte portion and may include optional extensions, because options are part of the IPv4 header itself.

## Review Notes
- The Python example is syntactically correct and uses current standard-library APIs. It parses the fixed IPv4 header fields and reports the full header length via IHL, but it does not decode IP options; that is acceptable for the scope of this post.
- The Wireshark display filter `ip.addr == 192.168.1.10` is valid and matches either source or destination IPv4 address.
- `tcpdump` checksum reporting can still look surprising on some systems because checksum offload may affect what packet captures show, but the corrected post no longer overstates what `-v` prints directly.

# Validation Summary: How to Calculate ICMPv6 Checksums

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ICMPv6
- IPv6 pseudo-header checksum calculation
- Python (`socket`, `struct`)
- RFC 4443
- RFC 8200

## Sources Consulted
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc4443
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 792, "Internet Control Message Protocol": https://www.rfc-editor.org/rfc/rfc792
- Python `socket` library documentation (`inet_pton`): https://docs.python.org/3/library/socket.html#socket.inet_pton

## Issues Found
- The introduction incorrectly said ICMPv4 checksums are optional for some message types. I corrected this to the RFC-backed distinction that ICMPv6 includes the IPv6 pseudo-header in its checksum, while ICMPv4 does not.
- The introduction said the pseudo-header provides protection against spoofed messages. I corrected this to the RFC 8200 rationale: it helps detect misdelivery or corruption of IPv6 header fields that ICMPv6 depends on.
- The `verify_icmpv6_checksum` example was incorrect. Re-running the checksum function over a valid packet returns `0x0000`, not `0xFFFF`, because the helper returns the one's complement of the accumulated sum. I updated the code and comments accordingly.
- The section about source address changes said forwarded ICMPv6 packets require checksum recalculation. I corrected this to address rewriting scenarios such as NAT64, because ordinary forwarding does not change the IPv6 addresses used by the checksum.

## Review Notes
- The code example is correct for the common case shown in the post. For packets involving an IPv6 Routing header, RFC 8200 requires the pseudo-header destination address to be the final destination rather than an intermediate routing destination.

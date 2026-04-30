# Validation Summary: How to Understand ICMPv6 Message Format

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6
- Neighbor Discovery (NDP)
- Multicast Listener Discovery (MLD/MLDv2)
- Python 3 (`struct`)

## Sources Consulted
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc4443
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200
- RFC 2710: Multicast Listener Discovery (MLD) for IPv6 - https://www.rfc-editor.org/rfc/rfc2710
- RFC 3810: Multicast Listener Discovery Version 2 (MLDv2) for IPv6 - https://www.rfc-editor.org/rfc/rfc3810
- IANA ICMPv6 Parameters Registry - https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Python `struct` module documentation - https://docs.python.org/3/library/struct.html

## Issues Found
- The introduction said ICMPv6 itself replaces ARP. I changed this to clarify that Neighbor Discovery messages carried in ICMPv6 replace ARP and the IPv4 ICMP Router Discovery/Redirect functions, which matches RFC 4861.
- The type-range wording implied error messages are Types 1-127. I changed this to the correct class split of 0-127 for error-class values and 128-255 for informational values, matching RFC 4443 and the IANA registry.
- The MLD labels were slightly inaccurate. I changed Type 130 to `Multicast Listener Query`, Types 131 and 132 to the Version 1 names, and Type 143 to `Version 2 Multicast Listener Report`, matching RFC 2710, RFC 3810, and IANA.
- The example comment said it parsed each error type, but the sample list also included an Echo Request. I changed the comment to describe the list accurately.
- The checksum section used `ICMPv6 payload length` and said the pseudo-header prevents spoofing. I changed this to `Upper-Layer Packet Length / ICMPv6 message length` and clarified that the checksum helps detect misdelivery or corruption of delivery-relevant IPv6 fields, which is the behavior described in RFC 4443 and RFC 8200.
- The conclusion described `Body` as part of the 4-byte header. I changed it so the post correctly states that the 4-byte header is `Type`, `Code`, and `Checksum`, followed by a type-specific body.

## Review Notes
The Python example is syntactically valid and runs under Python 3 as written. It parses only the common ICMPv6 header, so it intentionally does not validate checksums or decode each message type's full body format.

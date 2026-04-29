# Validation Summary: How to Understand the Mobility Header in IPv6 - Part 3

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 Mobility Header (Next Header 135)
- Mobile IPv6 (MIPv6) signaling
- RFC 6275 (Mobility Support in IPv6)
- Binding Update / Binding Acknowledgment messages
- tcpdump / Wireshark packet capture
- Python `struct` module for binary parsing

## Sources Consulted
- RFC 6275 — "Mobility Support in IPv6" (https://datatracker.ietf.org/doc/html/rfc6275), specifically Sections 6.1.1 (Mobility Header Format), 6.1.2 (Binding Refresh Request), 6.1.7 (Binding Update), and 9.5.5 (Sending Binding Refresh Requests)
- IANA "Assigned Internet Protocol Numbers" registry (Mobility Header = 135)
- RFC 5213 — "Proxy Mobile IPv6" (P flag in BU)
- RFC 5555 — "Mobile IPv6 Support for Dual Stack Hosts and Routers" (F flag in BU)
- Python `struct` module documentation (https://docs.python.org/3/library/struct.html) for format string verification
- Wireshark display filter reference for `mip6.*` fields

## Issues Found
1. **Binding Refresh Request direction was incorrect.** The MH Type table listed BRR (type 0) as `HA → MN`. RFC 6275 Section 9.5.5 specifies that "A correspondent node MAY send a Binding Refresh Request message to ask the mobile node to refresh its mobility binding." Changed direction to `CN → MN`.

2. **Python `struct.unpack_from` format string was wrong.** The code used `"!BBBHH"`, which decodes 1+1+1+2+2 = 7 bytes and treats the Reserved field as 16 bits. Per RFC 6275 Section 6.1.1, the Reserved field is 8 bits (1 byte) and Checksum is 16 bits (2 bytes). The correct format is `"!BBBBH"` (1+1+1+1+2 = 6 bytes), which properly aligns with Payload Proto, Header Len, MH Type, Reserved, Checksum. With the original format the unpacked Reserved and Checksum values would both be misaligned by one byte.

3. **Broken `awk` one-liner for decoding MH Type.** The example searched the `0x0010:` line of `tcpdump -X` output and read `substr($0,30,2)`. The IPv6 base header is 40 bytes, so MH Type (at packet offset 42) cannot appear on the `0x0010:` line (which covers bytes 16–31, well inside the IPv6 base header). The substr position was also incorrect for typical tcpdump hex-dump formatting. Because the correct byte position depends on whether link-layer headers are captured and on tcpdump's exact column layout, a robust replacement would require speculation; the snippet was removed rather than left misleading. The remaining `tcpdump` capture command and Wireshark display filters are accurate.

## Review Notes
- The Mobility Header structure diagram and field descriptions match RFC 6275 Section 6.1.1.
- The MH Type values 0–7 and their names match RFC 6275 Section 6.1.1's table; only the BRR direction was wrong.
- The Binding Update flag layout (A H L K M R P F) extends RFC 6275's six-flag definition (A H L K M R + 10 reserved bits) with the P flag from RFC 5213 (PMIPv6 Proxy Binding Update) and an F flag from later extensions. This is a reasonable "modern" depiction; readers should be aware that strict RFC 6275 conformance defines only the first six flags.
- The `tcpdump` filter `ip6 proto 135` matches only the IPv6 base header's Next Header field and does not traverse extension-header chains; for captures with intervening Destination Options or other extension headers, the filter may miss MH-bearing packets. Acceptable for typical MIPv6 traffic but worth noting.
- The Python parser's `message_data` slice (`data[6:]`) is correct: the fixed portion of the Mobility Header occupies the first 6 bytes, and the variable Message Data starts at offset 6.

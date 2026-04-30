# Validation Summary: How to Understand IPv4 Padding in Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv4 header options and padding
- Python
- Scapy

## Sources Consulted
- RFC 791: Internet Protocol - https://www.rfc-editor.org/rfc/rfc791.html
- RFC 7126: Recommendations on Filtering of IPv4 Packets Containing IPv4 Options - https://www.rfc-editor.org/rfc/rfc7126.html
- Scapy API documentation for `scapy.layers.inet` - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html
- IANA Internet Protocol Version 4 (IPv4) Parameters - https://www.iana.org/assignments/ip-parameters/ip-parameters.xhtml

## Issues Found
- The post treated `NOP` and `EOL` as equivalent padding bytes. I updated the wording to distinguish trailing zero padding from `NOP`, which RFC 791 defines as a 1-byte option used between options for alignment.
- The header layout example showed `NOP` and `EOL` as the two trailing bytes of padding. I corrected it to show `EOL` followed by a zero padding byte, which matches RFC 791's rule that the header is filled with zero octets and the first zero is interpreted as `EOL`.
- The Python example used `bytes([7, 3, 0])` for a Record Route option. I changed it to `bytes([7, 3, 4])` because RFC 791 states that the smallest legal Record Route pointer value is 4.
- The Scapy example used four `IPOption_NOP()` values and described them as explicit padding. I replaced it with a minimal `IPOption_RR(routers=[])` plus `IPOption_EOL()` example, which correctly demonstrates a valid 4-byte options area and the resulting IHL.
- The performance section stated too strongly that routers must punt packets with options to software slow paths. I reworded it to match RFC 7126, which explains that handling is implementation-dependent even though many platforms process such packets more slowly.

## Review Notes
- The corrected Python and Scapy snippets were executed locally on 2026-04-30 and produced the expected 24-byte IPv4 header with options.
- The post does not pin a Scapy version; the example worked with the currently installed Scapy in this environment.

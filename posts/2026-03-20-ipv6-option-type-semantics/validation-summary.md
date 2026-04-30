# Validation Summary: How to Understand Option Type Semantics in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Hop-by-Hop Options and Destination Options
- IPv6 Option Type encoding
- ICMPv6
- IPsec Authentication Header (AH)
- Python

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200
- IANA, "Internet Protocol Version 6 (IPv6) Parameters" - https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- RFC 4302, "IP Authentication Header" - https://www.rfc-editor.org/rfc/rfc4302

## Issues Found
- The action semantics for unknown options with high-order bits `10` and `11` were incorrect in both the explanatory table and the Python decoder. I corrected them to match RFC 8200: `10` sends ICMPv6 Parameter Problem Code 2 even if the destination was multicast, while `11` sends it only if the destination was not multicast.
- The post described bits `4:0` as an `Option ID` without noting that RFC 8200 treats the full 8-bit Option Type as the option identifier. I adjusted the wording to describe these as the low-order bits and explicitly stated that the full 8-bit value identifies the option.
- The sample table mislabeled option type `0x26` as `SMF_DPD`. Per the IANA IPv6 option registry, `0x26` is `Quick-Start`; `SMF_DPD` is `0x08`. I corrected the table entry.
- The custom option helper used misleading action labels and mappings for the ICMP-generating cases. I renamed them to `icmp-always` and `icmp-unless-multicast` and mapped them to the correct bit patterns.
- The helper docstring said it analyzed `all well-known IPv6 option types`, but the table is only a subset. I narrowed that wording to avoid overstating the example.

## Review Notes
- Router Alert (`0x05`) remains a valid example of an immutable option, but the IANA registry marks it as deprecated for new protocols.
- The Python examples were executed after correction and are syntactically valid.

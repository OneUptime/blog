# Validation Summary: How to Process TLV-Encoded Options in IPv6 Extension Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 extension headers
- IPv6 Hop-by-Hop Options and Destination Options
- TLV (Type-Length-Value) option encoding
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://datatracker.ietf.org/doc/rfc8200/
- IANA Internet Protocol Version 6 (IPv6) Parameters registry - https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- RFC 2711: IPv6 Router Alert Option - https://datatracker.ietf.org/doc/rfc2711/
- RFC 2675: IPv6 Jumbograms - https://datatracker.ietf.org/doc/html/rfc2675
- RFC 6275: Mobility Support in IPv6 - https://datatracker.ietf.org/doc/html/rfc6275
- RFC 6621: Simplified Multicast Forwarding - https://datatracker.ietf.org/doc/rfc6621/
- RFC 9805: Deprecation of the IPv6 Router Alert Option for New Protocols - https://datatracker.ietf.org/doc/html/rfc9805

## Issues Found
- The post had the `10` and `11` unknown-option action semantics reversed. I corrected the prose and the Python example to match RFC 8200: `10` sends ICMPv6 Parameter Problem even for multicast destinations, while `11` sends it only when the destination was not multicast.
- The post labeled the low 5 bits as the option identifier without noting that the full 8-bit value identifies the option. I clarified that the low 5 bits are only part of the full Option Type, which matches RFC 8200 and the IANA registry.
- The Python `KNOWN_OPTIONS` table used `0x26` for `SMF_DPD`. I changed it to `0x08`, because IANA assigns `0x08` to `SMF_DPD` and `0x26` to `Quick-Start`.
- The parser silently accepted truncated TLVs by slicing short data. I changed it to raise `ValueError` when the length byte or declared option payload is missing, so the example now rejects malformed input instead of misparsing it.
- The alignment section implied that all TLV options must follow a natural-boundary rule. I narrowed the wording to reflect RFC 8200 more accurately: individual options may define alignment requirements.

## Review Notes
- The example Router Alert option remains technically valid, but RFC 9805 and the IANA registry now mark Router Alert as deprecated for new protocols.
- The exact Python code block in the post was executed locally with Python 3.12.3 after the fixes and produced the expected output.

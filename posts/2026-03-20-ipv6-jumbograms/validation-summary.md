# Validation Summary: How to Understand IPv6 Jumbograms

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 jumbograms
- IPv6 Hop-by-Hop Options header
- ICMPv6 and Path MTU Discovery
- TCP and UDP jumbogram handling
- Python `struct`

## Sources Consulted
- RFC 2675: IPv6 Jumbograms: https://www.rfc-editor.org/rfc/rfc2675
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 9673: IPv6 Hop-by-Hop Options Processing Procedures: https://www.rfc-editor.org/rfc/rfc9673.html
- RFC 8201: Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html

## Issues Found
1. The post said all routers process Hop-by-Hop options and implied every router reads the jumbo length. I changed this to the RFC requirement that the Hop-by-Hop header must immediately follow the IPv6 header and removed the universal-router-processing claim, because RFC 8200 and RFC 9673 do not require every router to examine Hop-by-Hop options by default.

2. The description of option type `0xC2` was wrong. I corrected the action-bit explanation so it matches the IPv6 option-type rules in RFC 8200 instead of describing `11` as "skip+discard".

3. The MTU guidance was too loose and partly misleading. I replaced the `9000`-byte and `65535`-byte practical examples with RFC 2675's actual threshold: jumbograms are relevant only on links with MTUs greater than `65,575` octets.

4. The transport-layer requirements were oversimplified. I replaced the TCP/UDP bullets with the actual RFC 2675 rules: TCP needs special MSS and urgent-pointer handling, and UDP jumbograms require a UDP Length of `0` while still using the real UDP length for checksum calculation.

5. The post treated Jumbo Payload Length as a generic "total payload size". I corrected the prose and code comments so they reflect the RFC definition: it is the IPv6 packet length excluding the IPv6 header but including the Hop-by-Hop header and any other extension headers.

6. The Python parser worked for the happy-path example but was too trusting of malformed or truncated input. I added bounds checks and RFC-aligned validation for the Jumbo Payload option so the snippet fails predictably instead of raising incidental indexing errors.

## Review Notes
- The updated Python example was run locally and produced the expected 8-byte Hop-by-Hop header (`1100c204000186a0`) and parsed jumbo length (`100000`).
- RFC 9673, published in 2025, is relevant here because it clarifies modern Hop-by-Hop processing behavior and makes older "every router must process it" wording inaccurate.

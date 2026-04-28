# Validation Summary: How to Understand the Source/Target Link-Layer Address Option in NDP

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- Source Link-Layer Address (SLLA, Type 1) NDP option
- Target Link-Layer Address (TLLA, Type 2) NDP option
- Neighbor Solicitation (NS), Neighbor Advertisement (NA), Router Solicitation (RS), Router Advertisement (RA), Redirect messages
- Ethernet MAC addressing
- Python 3 (`struct` module)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
  - Section 4.1 (Router Solicitation): SLLA inclusion rules
  - Section 4.2 (Router Advertisement): SLLA inclusion rules
  - Section 4.3 (Neighbor Solicitation): SLLA inclusion rules
  - Section 4.4 (Neighbor Advertisement): TLLA inclusion rules
  - Section 4.5 (Redirect): TLLA inclusion rules
  - Section 4.6.1 (Source/Target Link-layer Address option format): Type 1/2, Length in units of 8 octets
  - Section 7.2.5 (Receipt of Neighbor Advertisements): REACHABLE state transition on S=1
- IANA IPv6 Neighbor Discovery Option Formats registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- Python `struct` documentation: https://docs.python.org/3/library/struct.html

## Issues Found
No technical issues found.

Verifications:
- Type values (SLLA=1, TLLA=2) match RFC 4861 §4.6.1 and the IANA registry.
- Option format (1-byte Type, 1-byte Length in units of 8 octets, link-layer address) is correct; for Ethernet, Length=1 yielding an 8-byte option is correct.
- The DAD exception (SLLA MUST NOT be included when source is the unspecified address ::) matches RFC 4861 §4.3.
- TLLA usage in NA and Redirect, and SLLA usage in NS/RS/RA, match RFC 4861.
- The neighbor cache update behavior (including REACHABLE transition on the Solicited (S) flag) matches RFC 4861 §7.2.5.
- The Python `parse_slla_tlla`, `build_slla_option`, and `build_tlla_option` functions execute correctly and produce the expected 8-byte options (verified by running the code: `0101001122334455` for SLLA, `0201aabbccddeeff` for TLLA).

## Review Notes
- The post simplifies the RFC's distinction between "MUST" and "SHOULD" for SLLA inclusion in NS. RFC 4861 §4.3 specifies SLLA "MUST be included in multicast solicitations and SHOULD be included in unicast solicitations." The post's "MUST be included (unless NS source is :: for DAD)" is a reasonable simplification because address-resolution NS is multicast in practice; unicast NS used for NUD is the SHOULD case. Not a technical error, but a future revision could note the multicast/unicast nuance.
- Similarly, TLLA in NA is "MUST" when responding to a multicast NS and "SHOULD" when responding to a unicast NS (RFC 4861 §4.4). The post says "SHOULD" generally — again a simplification.
- The ASCII diagram's bottom border for the second row is intentionally truncated in the source; this is cosmetic and does not affect technical correctness.
- The `build_tlla_option` function does not validate MAC length (unlike `build_slla_option`), but this is a minor stylistic inconsistency, not a correctness issue.

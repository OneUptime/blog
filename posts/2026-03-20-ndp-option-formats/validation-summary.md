# Validation Summary: How to Understand NDP Option Formats

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Neighbor Discovery Protocol (NDP) for IPv6
- TLV (Type-Length-Value) option format
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 8106 (RDNSS and DNSSL options)
- Python (struct, math modules) for option encoding/decoding

## Sources Consulted
- RFC 4861 - Neighbor Discovery for IP version 6 (IPv6), Section 4.6 (Option Formats), Sections 4.1-4.5 (message-specific options): https://www.rfc-editor.org/rfc/rfc4861
- RFC 8106 - IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- IANA IPv6 Neighbor Discovery Option Formats registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml#icmpv6-parameters-5
- RFC 8200 - IPv6 specification (for extension header option type comparison)
- Python 3 documentation for `struct` and `math` modules

## Issues Found
No technical issues found.

Verified items:
- TLV format: Type (1 byte), Length (1 byte in 8-byte units), data — matches RFC 4861 §4.6.
- Length=0 invalid: matches RFC 4861 §4.6 ("Nodes MUST silently discard an ND packet that contains an option with length zero").
- Option type registrations:
  - Type 1 (Source Link-Layer Address) ✓ RFC 4861 §4.6.1
  - Type 2 (Target Link-Layer Address) ✓ RFC 4861 §4.6.1
  - Type 3 (Prefix Information) ✓ RFC 4861 §4.6.2
  - Type 4 (Redirected Header) ✓ RFC 4861 §4.6.3
  - Type 5 (MTU) ✓ RFC 4861 §4.6.4
  - Type 25 (RDNSS) ✓ RFC 8106 §5.1
  - Type 31 (DNSSL) ✓ RFC 8106 §5.2
- NDP message types 133-137 ✓ RFC 4861 §4.1-4.5.
- Per-message option assignments verified against RFC 4861 §4.1-4.5 and RFC 8106.
- Unknown options silently ignored ✓ RFC 4861 §4.6 ("A node MUST silently ignore any options that it does not recognize").
- Python `option_length_units(6)` → 2+6=8, ceil(8/8)*8=8, returns 1 unit. Correct for 6-byte MAC SLLA.
- `build_ndp_option(1, 6-byte MAC)` produces 8 bytes: `01 01 00 11 22 33 44 55` — matches expected SLLA encoding.
- `parse_ndp_options` correctly uses 8-byte multiplier and breaks on length=0.
- `struct.pack("!BB", ...)` produces 2 unsigned bytes in network order — correct.

## Review Notes
- The post characterizes the NS Source Link-Layer Address as "MUST include unless source is ::". RFC 4861 §4.3 is more nuanced: SLLA "MUST NOT be included when the source IP address is the unspecified address. Otherwise, on link layers that have addresses this option MUST be included in multicast solicitations and SHOULD be included in unicast solicitations." The post's summary is reasonable for a quick reference but slightly conflates MUST/SHOULD semantics for unicast vs multicast NS. Not a technical error, but a future revision could add this nuance.
- The generic `build_ndp_option` builder uses zero-byte padding to reach the 8-byte boundary, which is a reasonable simplification. In practice, specific options (MTU, Prefix Information, etc.) have their own internal field structure rather than trailing zero padding, so this builder is suitable for trailing-pad options like SLLA/TLLA but not for structured options. The post's example correctly uses it for SLLA.
- The closing reference to extension header option type behavior (configurable error actions) is accurate — RFC 8200 §4.2 defines the high-order two bits of the Option Type to control unrecognized-option handling. The contrast with NDP's "silently ignore" rule is correct.

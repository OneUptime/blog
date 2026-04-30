# Validation Summary: How to Understand the Recommended Order of IPv6 Extension Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- RFC 8200
- IPsec AH
- IPsec ESP
- Python

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://datatracker.ietf.org/doc/rfc8200/
- RFC 4302: IP Authentication Header - https://datatracker.ietf.org/doc/rfc4302/
- RFC 4303: IP Encapsulating Security Payload (ESP) - https://datatracker.ietf.org/doc/rfc4303/
- IANA Protocol Numbers registry - https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml

## Issues Found
- The introduction and conclusion overstated RFC 8200 by saying the headers "must" follow a fixed order. I changed this to the RFC 8200 position: the order is recommended, while the main strict rule in the base specification is that Hop-by-Hop Options must immediately follow the IPv6 header if present.
- The explanation of why Routing must appear before Fragment was too informal and the Fragment/AH/ESP bullet was incorrect. I rewrote these sections to match RFC 8200's per-fragment header model and the recommended placement of Fragment before AH and ESP.
- The Python validator was technically wrong for Destination Options because it used `list.index()` on a list that intentionally contained `60` twice, which caused valid chains with a final Destination Options header to be rejected. I replaced the logic with a position-based validator that models the two RFC 8200 Destination Options slots and clarified the function's input and return semantics.
- The visual example treated `TCP` as a plain header after `ESP` without explaining transport-mode encapsulation. I clarified that the TCP header and data are carried inside the ESP-protected payload.
- The Destination Options section used imprecise wording about who processes the first Destination Options header and where the second one appears. I corrected this to align with RFC 8200's note text and with the final "before upper-layer header" position.

## Review Notes
- The code example now validates the RFC 8200 Section 4.1 recommendation used in the post. It is intentionally scoped to that recommendation rather than every IPsec-specific placement variation described in RFC 4302 and RFC 4303.

# Validation Summary: How to Understand SRv6 Header Extension (SRH)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Segment Routing over IPv6 (SRv6)
- IPv6 Segment Routing Header (SRH)
- IPv6 Routing Header Type 4
- RFC 8754 SRH processing
- Python
- Scapy
- Network Service Header (NSH) integration

## Sources Consulted
- RFC 8754: IPv6 Segment Routing Header (SRH): https://datatracker.ietf.org/doc/rfc8754/
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 9259: Operations, Administration, and Maintenance (OAM) in SRv6: https://datatracker.ietf.org/doc/html/rfc9259
- RFC 9491: Integration of NSH and Segment Routing for SFC: https://datatracker.ietf.org/doc/html/rfc9491
- RFC 9800: Compressed SRv6 Segment List Encoding: https://datatracker.ietf.org/doc/html/rfc9800
- IANA Internet Protocol Version 6 (IPv6) Parameters registry: https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml
- IANA Assigned Internet Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Scapy IPv6 layer API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Scapy IPv6 layer source: https://github.com/secdev/scapy/blob/master/scapy/layers/inet6.py

## Issues Found
- The field table described SRH Flags as reserved and required to be zero. RFC 8754 defines the field as IANA-managed flags, and the current IANA registry includes the O-flag from RFC 9259. Updated the description to say unassigned bits must be zero.
- The Segment List size entry used `128×n`, which is inaccurate for a zero-based list containing `Last Entry + 1` entries. Updated it to `128 each`.
- The wire-format labels called `Segment List[0]` the destination and implied unconditional first-SID indexing at `Segment List[N]`. Updated the wording to describe the final SID and to qualify the first-SID position as the full SRH case.
- The Segments Left description treated the value as simply a count of SIDs still to visit. Updated it to describe its role as the active segment selector that is decremented at each segment.
- The description and conclusion described SRH handling as hop-by-hop processing. RFC 8754 says transit nodes forward by IPv6 Destination Address and do not inspect the SRH, so the wording was changed to segment-by-segment endpoint processing.
- The endpoint-processing pseudocode executed a local SID function before advancing the SRH and omitted important RFC 8754 checks. Updated it to handle `Segments Left == 0`, validate `Last Entry` and `Segments Left`, process TLVs when locally configured, update the IPv6 Destination Address from `Segment List[Segments Left]`, and account for Hop Limit handling.
- The Scapy snippet imported `IPv6ExtHdrSegmentRouting` from `scapy.contrib.segment_routing`, but current Scapy documents the class in `scapy.layers.inet6`. Updated the import.
- The Scapy snippet encapsulated an inner IPv6 packet but left the SRH `Next Header` field at its default `59` (No Next Header). Added `nh=41` so the SRH correctly identifies the following IPv6 header.
- The TLV list gave PadN as type `1`; RFC 8754 and the IANA registry define SRH PadN as type `4`. Updated the type.
- The HMAC TLV bullet referenced RFC 8754 section 8, which is IANA Considerations. Updated it to section 2.1.2, where the HMAC TLV is defined.
- The NSH Carrier TLV bullet reflected an old draft concept, not the final RFC 8754 SRH TLV registry. Updated it to explain that additional TLVs may be defined outside RFC 8754 and that NSH over SRv6 is indicated by the SRH Next Header field rather than by an RFC 8754 SRH TLV.

## Review Notes
The local environment did not have Scapy installed, so the Scapy example was verified against official Scapy documentation and source rather than executed. RFC 9800 updates RFC 8754 by allowing compressed segment-list encoding; this post now explicitly frames the Segment List entry description as the base RFC 8754 format.

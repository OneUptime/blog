# Validation Summary: How to Understand IS-IS for IPv6 Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS
- IPv6
- OSPFv3
- Multi-Topology IS-IS
- Link-state routing

## Sources Consulted
- RFC 1195, *Use of OSI IS-IS for routing in TCP/IP and dual environments*: https://datatracker.ietf.org/doc/html/rfc1195
- RFC 5120, *M-ISIS: Multi Topology (MT) Routing in Intermediate System to Intermediate Systems (IS-ISs)*: https://datatracker.ietf.org/doc/html/rfc5120
- RFC 5304, *IS-IS Cryptographic Authentication*: https://datatracker.ietf.org/doc/html/rfc5304
- RFC 5308, *Routing IPv6 with IS-IS*: https://datatracker.ietf.org/doc/html/rfc5308
- RFC 5310, *IS-IS Generic Cryptographic Authentication*: https://datatracker.ietf.org/doc/html/rfc5310
- RFC 5311, *Simplified Extension of Link State PDU (LSP) Space for IS-IS*: https://datatracker.ietf.org/doc/html/rfc5311
- RFC 5340, *OSPF for IPv6*: https://datatracker.ietf.org/doc/html/rfc5340
- RFC 5838, *Support of Address Families in OSPFv3*: https://www.rfc-editor.org/rfc/rfc5838
- RFC 7166, *Supporting Authentication Trailer for OSPFv3*: https://datatracker.ietf.org/doc/html/rfc7166
- IANA IS-IS TLV Codepoints: https://www.iana.org/assignments/isis-tlv-codepoints/isis-tlv-codepoints.xhtml

## Issues Found
- The architecture diagram labeled `MT-ID 3` as IPv6 multicast. RFC 5120 reserves `MT-ID 3` for IPv4 multicast and `MT-ID 4` for IPv6 multicast, so the diagram was corrected.
- The TLV table overstated TLV 232 semantics and used an incorrect OSPF analogy for TLV 236. RFC 5308 requires TLV 232 to carry link-local addresses in Hellos and non-link-local addresses in LSPs, and TLV 236 carries IPv6 reachability information rather than an OSPF Type 1 equivalent. The descriptions were corrected.
- The multi-topology TLV entries were inaccurate for the IPv6 discussion. The table was updated to use TLV 229 for topology membership and TLV 237 for MT IPv6 reachability, which are the relevant RFC-defined entries for this context.
- The OSPFv3 transport row incorrectly said `UDP/IPv6`. RFC 5340 specifies that OSPFv3 runs directly over IPv6 using protocol number 89, so the comparison table was corrected.
- The OSPFv3 authentication row was incomplete. RFC 5340 specifies IPsec for OSPFv3, and RFC 7166 adds the Authentication Trailer, so the comparison was updated to reflect both.
- The MT-ISIS section described `MT-ID 0` as `Standard (IPv4)`, which is too narrow. RFC 5120 defines `MT-ID 0` as the standard topology, so the wording and diagram were corrected.
- The adjacency section implied IPv6 routing could be treated as present without mentioning the IPv6 signaling requirements. That sentence was replaced with an RFC 5308-consistent explanation that IPv6 capability is signaled through the IPv6 NLPID and IPv6 TLVs.

## Review Notes
This post is a protocol overview with no executable code or configuration snippets, so the review focused on RFC-defined behavior, TLV numbering, transport details, and authentication semantics. RFC 5838 is better understood as OSPFv3 address-family support rather than a direct equivalent to IS-IS multi-topology.

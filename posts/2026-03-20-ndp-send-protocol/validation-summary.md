# Validation Summary: How to Understand Secure Neighbor Discovery Protocol (SEND)

## Status
validated

## Post Type
Conceptual guide / Reference (explanation of a security protocol with no executable code)

## Technologies Covered
- SEND (Secure Neighbor Discovery, RFC 3971)
- CGA (Cryptographically Generated Addresses, RFC 3972)
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- RSA digital signatures
- SHA-1 hashing
- PKI / router authorization certificates
- RA Guard / DHCPv6 Guard / IPv6 Source Guard (mentioned as alternatives)

## Sources Consulted
- RFC 3971 — SEcure Neighbor Discovery (SEND): https://datatracker.ietf.org/doc/html/rfc3971
- RFC 3972 — Cryptographically Generated Addresses (CGA): https://datatracker.ietf.org/doc/html/rfc3972
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- IANA IPv6 Neighbor Discovery Option Formats registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml#icmpv6-parameters-5
- RFC 4941 — Privacy Extensions for Stateless Address Autoconfiguration in IPv6 (for privacy address interaction)

## Issues Found
No technical issues found.

Verified specifics:
- RFC 3971 (SEND) and RFC 3972 (CGA) citations are correct; both published March 2005.
- SEND NDP option type numbers match RFC 3971 §5 and the IANA registry: CGA=11, RSA Signature=12, Timestamp=13, Nonce=14.
- CGA generation description (SHA-1 over public key + subnet prefix + collision count + modifier; leftmost 64 bits used as interface identifier; u/g bits modified) is a reasonable simplification of RFC 3972 §4. The post explicitly presents a simplified algorithm rather than the exact CGA Parameters byte layout, so the order-of-fields shorthand is acceptable for an explanatory post.
- Verification flow (recompute hash, compare to address low bits, verify RSA signature with embedded public key) matches RFC 3972 §5.
- Threat model description (rogue RA, NA spoofing, neighbor cache poisoning, replay/reflection attacks mitigated by Timestamp and Nonce options) matches RFC 3971 §3 and §5.3.
- Deployment challenges (RSA cost, PKI/cert revocation complexity, sparse vendor support, interaction with RFC 4941 privacy extensions requiring new CGA per address) are all accurate and well-documented operational concerns.

## Review Notes
- The CGA description simplifies the actual `CGA Parameters` data structure (which has a fixed field order and a Sec parameter that also affects the interface identifier via Hash2 in addition to u/g bits). This is fine for a conceptual overview but readers implementing CGA should refer to RFC 3972 §4 directly for the exact algorithm including the Sec/Hash2 hash extension mechanism.
- The closing line "Alternative: SeND (Secure NDP) implementations exist as research projects" is somewhat confusingly phrased since SEND/SeND refer to the same protocol; the intended meaning appears to be that open-source/research SEND implementations (e.g., DoCoMo USL, Easy-SEND, ipv6-send-cga) exist but are not productized. Not a technical error, just stylistically ambiguous.
- Content is conceptual with no runnable code, commands, or configuration to test, so validation is limited to specification accuracy.

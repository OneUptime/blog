# Validation Summary: How to Understand SEND RSA Signature Option

## Status
validated

## Post Type
Reference / Technical guide explaining a wire-format protocol option.

## Technologies Covered
- SEcure Neighbor Discovery (SEND) — RFC 3971
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- Cryptographically Generated Addresses (CGA) — RFC 3972
- ICMPv6
- RSA digital signatures (RSASSA-PKCS1-v1_5 with SHA-1)
- Python `cryptography` library (`hazmat.primitives` RSA verify path)

## Sources Consulted
- RFC 3971, "SEcure Neighbor Discovery (SEND)" — https://datatracker.ietf.org/doc/html/rfc3971
  - Section 5.2 (RSA Signature Option, Type 12)
  - Section 5.2.1 (Key Hash field definition)
  - Section 5.2.2 (Exact list of bytes covered by the signature)
  - Section 5.3.1 (Timestamp Option, Type 13)
  - Section 5.3.2 (Nonce Option, Type 14)
- RFC 3972, "Cryptographically Generated Addresses (CGA)" (referenced for CGA verification step)
- IANA "IPv6 Neighbor Discovery Option Formats" registry (Type numbers 11–14)
- Python `cryptography` library docs for `RSAPublicKey.verify`, `padding.PKCS1v15`, and `hashes.SHA1`.

## Issues Found

Several material errors in the original draft were corrected:

1. **"What Is Signed" section was wrong about the byte sequence.** RFC 3971 §5.2.2 specifies the signed octets as: (1) a 128-bit CGA Message Type tag for SEND `0x086FCA5E10B200C99C8CE00164277C08`, (2) source address, (3) destination address, (4) ICMPv6 **Type + Code + Checksum** (8 + 8 + 16 bits), (5) the NDP message header up to but not including the options, (6) all NDP options preceding the RSA Signature option. The original draft omitted the CGA Message Type tag entirely, replaced "Code + Checksum" with a fictitious "24-bit Reserved", and listed CGA Parameters / Nonce / Timestamp as separate inputs rather than as members of "all NDP options preceding the RSA Signature option". Rewrote the section to match the RFC.

2. **Python verification example mirrored the wrong signed-data layout.** Updated the function signature and body to construct `signed_data` as: `SEND_CGA_MESSAGE_TYPE_TAG || src || dst || (Type, Code, Checksum) || ndp_msg_header || preceding_options`. Added the tag constant. Removed the unused `hashlib` import.

3. **Key Hash described as "SHA-1 hash of the public key".** SHA-1 produces 160 bits, but the field is 128 bits. RFC 3971 §5.2.1 specifies "the most significant (leftmost) 128 bits of a SHA-1 hash". Tightened the wording to make the truncation explicit.

4. **Timestamp Option diagram was missing the 32-bit reserved row.** RFC 3971 §5.3.1 sets Length = 2 (16 bytes total) and defines a 48-bit Reserved field that spans the last 16 bits of the first 32-bit word and a full second 32-bit word. The original diagram only showed 12 bytes. Added the missing reserved row so the diagram and Length=2 are consistent.

5. **Timestamp epoch and format were wrong.** The original said "NTP timestamp, seconds since Jan 1, 1900, 32 bits seconds + 32 bits fractional". RFC 3971 §5.3.1 explicitly uses the Unix epoch (Jan 1, 1970, 00:00 UTC) and a 48-bit-seconds + 16-bit-fractional (1/65536 sec) layout — *not* an NTP timestamp despite the superficial similarity. Corrected both.

## Review Notes
- RSA with SHA-1 (RSASSA-PKCS1-v1_5-SHA1) is what RFC 3971 mandates and is correctly described, but readers should know SHA-1 is cryptographically broken in 2026; SEND deployments are rare and there is no standardized hash-agility update for the original SEND signature option (RFC 6494 only covers the trust-anchor X.509 profile). A future post could mention this limitation.
- The verification ordering shown (timestamp → nonce → key hash → CGA → RSA) is a reasonable practical order; RFC 3971 §5.2 does not strictly mandate that exact sequence, only that all checks must pass.
- The Python example is conceptual: a real implementation must carefully reconstruct the NDP message header and the byte-exact wire image of the preceding options — mistakes here are the dominant source of interop bugs.
- Default 300-second timestamp delta matches RFC 3971 §5.3.4.2 (`TIMESTAMP_DELTA = 300 sec`), correct as written.

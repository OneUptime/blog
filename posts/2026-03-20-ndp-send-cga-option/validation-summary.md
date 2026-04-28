# Validation Summary: How to Understand SEND CGA Option Format

## Status
validated

## Post Type
Reference / Technical Guide — wire format reference for the SEND CGA option (RFC 3971 / RFC 3972)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- SEcure Neighbor Discovery (SEND, RFC 3971)
- Cryptographically Generated Addresses (CGA, RFC 3972)
- ASN.1 / DER encoding of X.509 SubjectPublicKeyInfo
- Python `cryptography` library (PEM/DER serialization, SHA-1)

## Sources Consulted
- RFC 3971 — SEcure Neighbor Discovery (SEND), §5.1.1 (CGA Option), §5.3.1 (Timestamp), §11 (IANA option types)
- RFC 3972 — Cryptographically Generated Addresses (CGA), §4 (Parameters Data Structure and generation algorithm)
- RFC 4291 — IPv6 Addressing Architecture, §2.7.1 (Solicited-Node Multicast Address)
- RFC 4861 — Neighbor Discovery for IPv6, §4.6 (option formats)
- RFC 6494 — Certificate Profile and Certificate Management for SEND

## Issues Found

1. **CGA Option header — Reserved field size (RFC 3971 §5.1.1).** The wire-format diagram contained a duplicated "Reserved" cell spanning a second row, and the field listing claimed 24 bits. RFC 3971 §5.1.1 defines a single 8-bit Reserved field after Type/Length/Pad Length. Removed the spurious second row from the diagram and corrected the field listing to "Reserved: 8 bits = 0".

2. **`derive_interface_id` Python helper — redundant and incorrectly-commented bit clear.** The original code had:
   ```python
   iid[0] &= 0x1C   # Keep only bits 2-4 pattern from hash
   iid[0] &= ~0xC0  # Clear bits 0-1 (u and g bits)
   iid[0] |= (sec << 5)  # Set Sec value in bits 5-7
   ```
   The post uses Python LSB-first numbering throughout (confirmed by Step 4 of the verification block, which calls bits 0-1 the u/g bits and bits 5-7 the Sec position). In that convention, `~0xC0` clears bits 6-7, not 0-1, so the comment is wrong; and the line is fully redundant because `iid[0] &= 0x1C` already cleared bits 0-1 and 5-7. The leading comment also said "sec bits (2-4)" when Sec lives at bits 5-7. Removed the redundant line and corrected the leading comment to "Clear universal/group bits (bits 0-1) and sec bit positions (5-7)". The functional output of the helper was unchanged.

3. **Solicited-node multicast destination in the example NS (RFC 4291 §2.7.1).** The example showed `dst: ff02::1:ff34:5678` for an NS resolving target `2001:db8::200`. The solicited-node multicast is formed from the low-order 24 bits of the *target*, so for `::200` it must be `ff02::1:ff00:200`. The original value happened to match the source's solicited-node multicast, which is not how address-resolution NS messages are addressed. Updated the destination to `ff02::1:ff00:200`.

4. **Timestamp described as "NTP time" (RFC 3971 §5.3.1).** RFC 3971 specifies a 64-bit fixed-point format with 48 bits of seconds since the Unix epoch (1970-01-01 UTC) and 16 bits of 1/64K-second fractions — not NTP timestamp format (NTP epoch is 1900, with 32/32 split). Replaced "[current NTP time]" with "[seconds since 1970-01-01 UTC, 48.16 fixed-point]".

5. **CGA Public Key algorithm — "RSA or ECDSA".** RFC 3972 §4 mandates RSA ("SEND SHOULD use an RSA public/private key pair... Other public key types are undesirable in SEND, as they may result in incompatibilities between implementations"). RFC 6494 updates the certificate profile but does not introduce ECDSA-based CGAs. Changed the field description from "DER-encoded RSA or ECDSA public key" to "DER-encoded RSA public key (RFC 3972 mandates RSA)".

## Review Notes

- The CGA Parameters Data Structure ASCII diagram has rough byte boundaries (e.g., the "Collision Count" row), but conveys the field order and sizes correctly per RFC 3972 §4. Field-by-field annotations all match the RFC.
- Hash2 input shown as `modifier + b'\x00'*9 + public_key_der` matches RFC 3972 §4 Step 2 ("modifier, 9 zero octets, the encoded public key, and any optional extension fields"). Extensions are optional and correctly omitted from the simplified verification pseudocode.
- The Python example uses `backend=default_backend()` which is deprecated (but still accepted) in modern versions of the `cryptography` library (≥3.1). Not an error, but a future cleanup if the post is ever revised.
- The `Extension Fields` description mentions "Type 0: CGA Extension (for future use)" — RFC 3972 itself defines the extension TLV format but does not assign Type 0 a specific name. Multi-Key CGA uses type 0x12 per RFC 4581. Left as-is since the language is suitably vague.
- Bit numbering is consistently Python LSB-first throughout the post (after the fix), which is a different convention from the RFC's MSB-first numbering. This is acceptable for code-oriented explanations but worth noting if a reader cross-references the RFC text.

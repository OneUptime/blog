# Validation Summary: How to Understand Mobile IPv6 Return Routability Procedure

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Mobile IPv6 (MIPv6) - RFC 6275
- Return Routability (RR) procedure
- Mobility Header messages (HoTI, CoTI, HoT, CoT, BU, BA)
- HMAC-SHA1 / SHA-1 cryptographic primitives
- Python (hashlib, hmac modules) for the example code
- IPsec / IKEv2 (referenced via RFC 4877)

## Sources Consulted
- RFC 6275 "Mobility Support in IPv6" — https://datatracker.ietf.org/doc/html/rfc6275
  - §5.2.5 Cryptographic Functions (keygen tokens, Kbm formula)
  - §6.1.3 / §6.1.4 HoTI / CoTI message formats
  - §6.1.5 / §6.1.6 HoT / CoT message formats
  - §6.2.7 Binding Authorization Data option (96-bit authenticator)
- RFC 4877 "Mobile IPv6 Operation with IKEv2 and the Revised IPsec Architecture" (referenced)

## Issues Found
1. **HoTI source address description was incorrect.** The post stated "Sent from CoA to CN (via HA tunnel)". Per RFC 6275 §5.2.5, the HoTI source address is the home address (HoA). The mobile node is physically located at the CoA and reverse-tunnels the packet through the HA, but the HoTI itself has source = HoA. Fixed to: "Sent with source address HoA to CN, reverse-tunneled through the HA, initiating the home-side test."

## Review Notes
- All MH Type numbers verified correct: HoTI=1, CoTI=2, HoT=3, CoT=4, BU=5, BA=6 (RFC 6275 §6.1).
- Init Cookie sizes (8 bytes / 64 bits) verified correct (RFC 6275 §5.2.3).
- Keygen token formulas described correctly: HMAC_SHA1 over (address | nonce | 0 or 1) with CN's secret. The post does not explicitly note the truncation to 64 bits (per RFC 6275 §5.2.5: `First (64, HMAC_SHA1(...))`), but this is a common simplification for an introductory post and not technically wrong.
- Kbm computation in Python is correct: `SHA1(home_keygen_token | care_of_keygen_token)` matches RFC 6275 §5.2.5. The comment "first 20 bytes of SHA1" is technically redundant (SHA-1 produces exactly 20 bytes), but not incorrect.
- The §5.2.5 reference for Kbm calculation is correct — verified against RFC 6275.
- Binding Authorization Data calculation truncating HMAC-SHA1 to 96 bits (12 bytes) is correct per RFC 6275 §6.2.7.
- The `sign_binding_update` function takes `bu_data` as input; in the actual MIPv6 spec, the HMAC is computed over the "Mobility Data" (care-of address | correspondent address | MH data), not just the BU payload alone. The function as written is correct given the caller passes the full Mobility Data, but this is a simplification that a beginner reader might not catch. Acceptable for an educational post.
- Mermaid diagram correctly depicts the reverse-tunnel path for HoTI/HoT and direct path for CoTI/CoT. The shorthand "Kn-home / Kn-care-of" in the diagram is non-standard notation (RFC 6275 uses "home keygen token" / "care-of keygen token"; "Kn" usually denotes the nonce), but the meaning is clear in context.
- Limitations section accurately describes RR's security properties and correctly references RFC 4877 for IKEv2/IPsec-based stronger security.

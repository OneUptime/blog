# Validation Summary: How to Understand SEND Cryptographically Generated Addresses (CGA)

## Status
validated

## Post Type
Tutorial / Reference (technical explainer with algorithm description and Python verification code)

## Technologies Covered
- IPv6 Cryptographically Generated Addresses (CGA, RFC 3972)
- SEcure Neighbor Discovery (SEND, RFC 3971)
- IPv6 modified EUI-64 interface identifier format (RFC 4291)
- SHA-1 hash function
- Python (hashlib, struct, socket) for the example verification code

## Sources Consulted
- RFC 3972: Cryptographically Generated Addresses (CGA) — https://www.rfc-editor.org/rfc/rfc3972
  - Section 2 (CGA Format): defines u/g bits at positions 6 and 7 of the leftmost octet of the interface identifier, and Sec at the three leftmost bits.
  - Section 4 (CGA Generation): defines Hash2 input (modifier + 9 zero octets + public key + ext fields), the 16×Sec leading-zero requirement on Hash2, Hash1 input (modifier + subnet prefix + collision count + public key + ext fields), and Step 4 which writes Sec into the three leftmost bits and zeroes bits 6 and 7.
  - Section 7.2 (Hash Extension): cost to attacker of brute force is approximately 2^(59 + 16·Sec) hash operations.
- RFC 4291: IP Version 6 Addressing Architecture (Appendix A: Modified EUI-64 format) — https://www.rfc-editor.org/rfc/rfc4291
- RFC 3971: SEcure Neighbor Discovery (SEND) — https://www.rfc-editor.org/rfc/rfc3971
- RFC 4982: Support for Multiple Hash Algorithms in CGAs (context only — post correctly describes original SHA-1 specification)
- Python `hashlib`, `struct`, `socket` standard library docs

## Issues Found

The post had several technical errors that contradicted RFC 3972. All have been fixed:

1. **Wrong bit positions for Sec and u/g bits in the algorithm description (Step 3).**
   - The post said: "Zero bits 0-2 (bits u and g in IPv6 notation) to 0b000" and "Set bits 5-7 (the 'sec' bits) to Sec value".
   - Per RFC 3972 Section 4 Step 4: Sec is written into the **three leftmost bits (bits 0-2)** and bits 6 and 7 (u and g) are zeroed.
   - Fixed by swapping the bit ranges to: "Set bits 0-2 (the 'sec' bits, leftmost three bits) to Sec value" and "Zero bits 6 and 7 (bits u and g in IPv6 notation)".

2. **Wrong bit positions in the CGA Structure ASCII diagram and explanation.**
   - The diagram showed `|0|0|S|S|S|0|0|0|` (Sec at bits 2-4, "u/g" at bits 0-1).
   - The text said: "Bits 0-1: 00 (u and g bits)", "Bits 2-4: Sec value", "Bits 5-63: From SHA1 hash".
   - Per RFC 3972: Sec is at bits 0-2, u/g are at bits 6-7, hash bits fill the remainder.
   - Fixed the diagram to `|S|S|S|H|H|H|0|0|` and corrected the bit-range descriptions accordingly.

3. **Incorrect Hash2 zero-bit threshold in the verification code.**
   - The code used `required_zero_bits = 2 * sec`.
   - Per RFC 3972 Section 4 Step 3: the leftmost **16×Sec** bits of Hash2 must be zero.
   - Fixed to `required_zero_bits = 16 * sec`. Also removed the now-unreachable partial-byte check (16×Sec is always a multiple of 8).

4. **Verification code did not zero the u/g bits when reconstructing the expected interface identifier.**
   - The code masked with `0x1F` (clearing only the top 3 Sec bits) before writing in the Sec value, leaving the bottom-2 u/g bits taken straight from `hash1[0]`. For valid CGAs (where u/g must be 0 in the address), the comparison would spuriously fail whenever the corresponding hash bits were non-zero.
   - Fixed by changing the mask to `0x1C` (`0b00011100`), which keeps only the middle bits 3-5 and clears both the Sec bits (0-2) and the u/g bits (6-7) before OR-ing in the Sec value. Also simplified the comparison to check directly against `interface_id` since a valid CGA already has the correct u/g and Sec layout.

5. **Misleading inline comment** ("bits 5-7 of interface ID") was clarified to "leftmost 3 bits (bits 0-2)" to match the corrected RFC notation used elsewhere in the post.

## Review Notes

- The Hash2 input layout (`modifier + 9 zero octets + public key`) and the Hash1 input layout (`modifier + subnet_prefix + collision_count_byte + public_key`) are both correct per RFC 3972 Section 4.
- The cost figures (2^59, 2^75, 2^91 for Sec=0,1,2) are correct per RFC 3972 Section 7.2 (`2^(59 + 16·Sec)`).
- The 128-bit Modifier, 64-bit subnet prefix, 8-bit collision count (range 0-2), and 3-bit Sec value (range 0-7) are all correctly described.
- The post correctly uses SHA-1 per the original RFC 3972. RFC 4982 later added support for multiple hash algorithms (signaled via the CGA Parameters Hash Algorithm extension), but introducing that nuance would expand the post beyond its scope; the current SHA-1-only treatment is acceptable as a CGA primer.
- The unused `import ipaddress` inside `verify_cga` is a minor stylistic nit (left in place — out of scope for technical-correctness fixes).
- The closing recommendation that "RA Guard is preferred over SEND/CGA" for most operational deployments is consistent with current operational guidance (e.g., RFC 6105, RFC 7113), as SEND has seen very limited real-world adoption.

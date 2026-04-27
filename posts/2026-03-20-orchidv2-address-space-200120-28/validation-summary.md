# Validation Summary: How to Understand the ORCHIDv2 Address Space (2001:20::/28) - 200120

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- IPv6 / RFC 7343 (ORCHIDv2)
- HIP (Host Identity Protocol, RFC 7401)
- Python (`hashlib`, `ipaddress`)
- Linux `ip6tables` for IPv6 firewall filtering

## Sources Consulted
- RFC 7343 — An IPv6 Prefix for Overlay Routable Cryptographic Hash Identifiers Version 2 (ORCHIDv2): https://datatracker.ietf.org/doc/html/rfc7343
- RFC 7401 — Host Identity Protocol Version 2 (HIPv2): https://datatracker.ietf.org/doc/html/rfc7401
- IANA IPv6 Special-Purpose Address Registry (2001:20::/28 allocation)
- Python 3 `hashlib` and `ipaddress` standard library docs

## Issues Found
1. **Incorrect RFC section reference.** The docstring referenced "RFC 7343 §6.1" for the construction algorithm. RFC 7343 has only a single-level §6 (IANA Considerations) with no §6.1. The construction algorithm is in **§2 (Cryptographic Hash Identifier Construction)**. Updated the reference to `RFC 7343 §2`.

2. **Wrong terminology in the structure diagram.** The post called the 4-bit field a "suffix" with values "0–F". RFC 7343 names this field **OGA ID (ORCHID Generation Algorithm Identifier)**, and its semantics are defined per Context ID, not as an arbitrary range. Updated the diagram to use "OGA ID" and clarified that the slot identifies the algorithm.

3. **Encode_96 took the wrong slice of the hash.** The code took `hash_value[:12]` (leftmost 96 bits), but RFC 7343 §2 explicitly defines `Encode_96()` as extracting the **middle** 96-bit-long bitstring of the hash output. For SHA-256 (32 bytes), the middle 96 bits are bytes `[10:22]`. Updated the slice and the accompanying comment.

4. **Misleading "Default ORCHIDv2 Context ID."** The original hex `7561767261534461796e75466f6d6f7265` decodes to ASCII "uavraSDaynuFomore" — it is not a real Context ID. RFC 7343 explicitly states: *"This document defines no specific value"* for the Context ID; values are allocated per protocol (e.g., HIPv2 in RFC 7401, which uses `F0EF F02F BFF4 3D0F E793 0C3C 6E61 74EA`). Replaced the placeholder with the HIPv2 value, labelled it as illustrative, and updated the docstring to clarify that RFC 7343 itself defines no Context ID.

5. **OGA ID was implicitly zero.** The original construction was `(prefix & mask) | hash_96`, which leaves bits 96–99 as 0. Per IANA, OGA ID 0 is unassigned/reserved, so the resulting address could never be a legitimate ORCHIDv2 in a real deployment. Added an explicit `oga_id` parameter and OR'd `(oga_id & 0xF) << 96` into the result so the construction now matches `Prefix | OGA ID | Encode_96(Hash)`.

## Review Notes
- The `2001:20::/28` allocation, the 28+4+96 bit layout, and the `Hash Input := Context ID | Input` construction are correctly described per RFC 7343.
- The bit-mask math (`prefix_int & ~((1 << 100) - 1)`) is correct and verified — it preserves exactly the upper 28 bits of the prefix and zeros bits 0–99.
- The generated example address now correctly falls within `2001:20::/28` (verified by running the code).
- The `ip6tables` filter rules are syntactically valid; in real deployments operators may also want a corresponding `nftables` rule, but that is a future enhancement, not a correction.
- The Python `bytes.fromhex(...)[:16]` slicing in the original was technically unnecessary (the literal already encoded to 17 bytes only because of the odd input); the replacement Context ID is exactly 16 bytes, so the slicing was removed.
- For production HIP implementations, choosing the right OGA ID (1, 2, or 3 per RFC 7401's HIT Suite registry) matters; the post's example is now structurally correct but still illustrative.
